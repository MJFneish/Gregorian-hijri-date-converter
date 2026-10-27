package com.devlance.hijriconverter.core.hijri

import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.abs

val BUNDLED_TABLES = TableData(
  generated = TABLES_GENERATED,
  iranLastOfficial = IRAN_LAST_OFFICIAL,
  methods = METHOD_TABLES,
)

/**
 * The month-start tables in use: the bundled copy, or a validated newer download
 * ([setTableData]). Every lookup below reads them, so swapping moves every date at once.
 */
object HijriTables {
  @Volatile
  var current: TableData = BUNDLED_TABLES
    private set

  /**
   * Decoded month starts per method: `starts[i]` is the JDN of day 1 of the i-th month counted
   * from 1 Muharram [TABLE_FIRST_YEAR], plus one sentinel entry at the end (the day after the last
   * month). Decoded lazily and cached — ~1,900 ints per method.
   */
  private val cache = ConcurrentHashMap<MethodId, IntArray>()

  /** Switch to another (validated) table set. Callers re-render via the tables version. */
  @Synchronized
  fun set(data: TableData) {
    current = data
    cache.clear()
  }

  fun monthStarts(method: MethodId): IntArray = cache.getOrPut(method) { decode(current.methods.getValue(method)) }
}

fun currentTables(): TableData = HijriTables.current

fun setTableData(data: TableData) = HijriTables.set(data)

fun iranLastOfficial(): YearMonth = HijriTables.current.iranLastOfficial

private fun decode(table: MethodTable): IntArray {
  val years = table.lengths.length / 3
  val starts = IntArray(years * 12 + 1)
  var jdn = table.firstJdn
  for (y in 0 until years) {
    val bits = table.lengths.substring(y * 3, y * 3 + 3).toInt(16)
    for (m in 0 until 12) {
      starts[y * 12 + m] = jdn
      jdn += if (bits and (1 shl m) != 0) 30 else 29
    }
  }
  starts[years * 12] = jdn
  return starts
}

/** Most a downloaded month start may differ from the bundled one — anything further is garbage. */
private const val MAX_DRIFT_DAYS = 3
private const val YEARS = TABLE_LAST_YEAR - TABLE_FIRST_YEAR + 1

// Explicit [0-9]: on Android (ICU regex) `\d` also matches Arabic-Indic and other digits.
private val GENERATED_FORMAT = Regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$")
private val HEX = Regex("^[0-9a-f]+$")

/** A JSON value that is a whole number (v1's `Number.isInteger`), else null. Strings don't count. */
private fun wholeNumber(value: Any?): Int? = when (value) {
  is Int -> value
  is Long -> value.toInt().takeIf { it.toLong() == value }
  is Number -> value.toDouble().let { d -> if (d.isFinite() && d == Math.rint(d) && abs(d) < Int.MAX_VALUE) d.toInt() else null }
  else -> null
}

/**
 * Checks a downloaded table set (data/hijri-tables.json) before it may replace the bundled one:
 * format 1, the same year range, every method present with a well-formed mask, every year 353–356
 * days (sighting calendars can have 353/356 — see the integrity test), and every month start within
 * MAX_DRIFT_DAYS of the bundled table's. Returns null when anything is off.
 */
fun validateTableData(raw: Any?): TableData? {
  val r = raw as? JSONObject ?: return null
  if (wholeNumber(r.opt("format")) != 1 ||
    wholeNumber(r.opt("firstYear")) != TABLE_FIRST_YEAR ||
    wholeNumber(r.opt("lastYear")) != TABLE_LAST_YEAR
  ) {
    return null
  }
  val generated = r.opt("generated") as? String ?: return null
  if (!GENERATED_FORMAT.matches(generated)) return null
  val iran = r.opt("iranLastOfficial") as? JSONObject ?: return null
  val iranYear = wholeNumber(iran.opt("year")) ?: return null
  val iranMonth = wholeNumber(iran.opt("month")) ?: return null
  if (iranYear !in TABLE_FIRST_YEAR..TABLE_LAST_YEAR || iranMonth !in 1..12) return null
  val methodsRaw = r.opt("methods") as? JSONObject ?: return null
  val methods = LinkedHashMap<MethodId, MethodTable>()
  for (method in MethodId.entries) {
    val m = methodsRaw.opt(method.id) as? JSONObject ?: return null
    val firstJdn = wholeNumber(m.opt("firstJdn")) ?: return null
    val lengths = m.opt("lengths") as? String ?: return null
    if (lengths.length != YEARS * 3 || !HEX.matches(lengths)) return null
    for (y in 0 until YEARS) {
      val thirties = Integer.bitCount(lengths.substring(y * 3, y * 3 + 3).toInt(16))
      if (thirties < 5 || thirties > 8) return null // 348 + thirties = 353..356 days
    }
    val table = MethodTable(firstJdn, lengths)
    val starts = decode(table)
    val bundled = decode(BUNDLED_TABLES.methods.getValue(method))
    for (i in starts.indices) {
      if (abs(starts[i] - bundled[i]) > MAX_DRIFT_DAYS) return null
    }
    methods[method] = table
  }
  return TableData(generated, YearMonth(iranYear, iranMonth), methods)
}

private fun indexOf(year: Int, month: Int) = (year - TABLE_FIRST_YEAR) * 12 + (month - 1)

fun isYearInTable(year: Int): Boolean = year in TABLE_FIRST_YEAR..TABLE_LAST_YEAR

/** JDN of 1 <month> <year>, or null outside the table. */
fun tableMonthStart(method: MethodId, year: Int, month: Int): Int? =
  if (!isYearInTable(year)) null else HijriTables.monthStarts(method)[indexOf(year, month)]

fun tableMonthLength(method: MethodId, year: Int, month: Int): Int? {
  if (!isYearInTable(year)) return null
  val starts = HijriTables.monthStarts(method)
  val i = indexOf(year, month)
  return starts[i + 1] - starts[i]
}

/** First day of a method's table and the day after its last day (JDN). */
data class TableBounds(val start: Int, val end: Int)

fun tableBounds(method: MethodId): TableBounds {
  val starts = HijriTables.monthStarts(method)
  return TableBounds(starts[0], starts[starts.size - 1])
}

/** Hijri date for a JDN, or null when the JDN falls outside the table. Binary search. */
fun tableLookup(method: MethodId, jdn: Int): HijriDate? {
  val starts = HijriTables.monthStarts(method)
  if (jdn < starts[0] || jdn >= starts[starts.size - 1]) return null
  var lo = 0
  var hi = starts.size - 2
  while (lo < hi) {
    val mid = (lo + hi + 1) ushr 1
    if (starts[mid] <= jdn) lo = mid else hi = mid - 1
  }
  return HijriDate(TABLE_FIRST_YEAR + lo / 12, lo % 12 + 1, jdn - starts[lo] + 1)
}
