package com.devlance.hijriconverter.core.hijri

import com.devlance.hijriconverter.core.GregorianDate
import com.devlance.hijriconverter.core.gregorianMonthLength
import com.devlance.hijriconverter.core.gregorianToJdn
import com.devlance.hijriconverter.core.jdnToGregorian

/** Picker ranges. Dates outside the precomputed tables (1343–1500 AH) still convert, via the
 * arithmetic fallback, and are labelled "approximate". */
const val HIJRI_MIN_YEAR = 1300
const val HIJRI_MAX_YEAR = 1500
const val GREGORIAN_MIN_YEAR = 1883
const val GREGORIAN_MAX_YEAR = 2077

// ---------------------------------------------------------------------------------------------
// JDN-level primitives (no adjustment)

private data class Seams(val before: Int, val after: Int)

/**
 * Outside the table the arithmetic calendar takes over — but shifted so it continues seamlessly
 * from the table's first/last month. Unshifted, the two can disagree by a day at the seam, which
 * made one Gregorian day map to "1 Muharram 1343" twice (once per side) and broke round-trips.
 */
private fun seamOffsets(method: MethodId): Seams {
  val bounds = tableBounds(method)
  return Seams(
    before = bounds.start - tabularToJdn(HijriDate(TABLE_FIRST_YEAR, 1, 1)),
    after = bounds.end - tabularToJdn(HijriDate(TABLE_LAST_YEAR + 1, 1, 1)),
  )
}

fun hijriFromJdn(jdn: Int, method: MethodId): HijriDate {
  tableLookup(method, jdn)?.let { return it }
  val seams = seamOffsets(method)
  return tabularFromJdn(if (jdn < tableBounds(method).start) jdn - seams.before else jdn - seams.after)
}

fun jdnFromHijri(date: HijriDate, method: MethodId): Int {
  tableMonthStart(method, date.year, date.month)?.let { return it + date.day - 1 }
  val seams = seamOffsets(method)
  return tabularToJdn(date) + if (date.year < TABLE_FIRST_YEAR) seams.before else seams.after
}

/** 29 or 30. */
fun hijriMonthLength(year: Int, month: Int, method: MethodId): Int =
  tableMonthLength(method, year, month) ?: tabularMonthLength(year, month)

// ---------------------------------------------------------------------------------------------
// Public conversion API (with the user's adjustment applied)

fun gregorianToHijri(date: GregorianDate, opts: ConversionOptions): HijriDate =
  hijriFromJdn(gregorianToJdn(date) + opts.adjustment, opts.method)

fun hijriToGregorian(date: HijriDate, opts: ConversionOptions): GregorianDate =
  jdnToGregorian(jdnFromHijri(date, opts.method) - opts.adjustment)

/** Hijri date of a JDN under the user's options — the form the UI mostly works with. */
fun hijriOfJdn(jdn: Int, opts: ConversionOptions): HijriDate = hijriFromJdn(jdn + opts.adjustment, opts.method)

fun jdnOfHijri(date: HijriDate, opts: ConversionOptions): Int = jdnFromHijri(date, opts.method) - opts.adjustment

fun isValidHijri(date: HijriDate, method: MethodId): Boolean =
  date.month in 1..12 && date.day >= 1 && date.day <= hijriMonthLength(date.year, date.month, method)

fun isValidGregorian(date: GregorianDate): Boolean =
  date.month in 1..12 && date.day >= 1 && date.day <= gregorianMonthLength(date.year, date.month)

/** How trustworthy a Hijri date is under a method — see [DateSource]. */
fun hijriSource(date: HijriDate, method: MethodId): DateSource {
  if (!isYearInTable(date.year)) return DateSource.Approximate
  return when (method) {
    MethodId.UmmAlQura -> DateSource.Official
    MethodId.Iran -> {
      // From the tables in use (a downloaded update can move this cutoff).
      val last = iranLastOfficial()
      val official = date.year < last.year || (date.year == last.year && date.month <= last.month)
      if (official) DateSource.Official else DateSource.Calculated
    }
    else -> DateSource.Calculated
  }
}
