package com.devlance.hijriconverter.core.hijri

import kotlin.math.ceil

/**
 * Arithmetic ("civil", Friday-epoch, 11-leap-years-in-30 pattern 2,5,7,10,13,16,18,21,24,26,29)
 * Islamic calendar. Only used as the fallback outside the precomputed tables (before 1343 AH /
 * after 1500 AH) — it agrees with the real calendars about 2/3 of the time and is otherwise a day
 * off, which is why every date it produces is labelled "approximate" in the UI.
 */
private const val CIVIL_EPOCH_JDN = 1948440 // 1 Muharram 1 AH = 16 July 622 (Julian)

fun tabularIsLeapYear(year: Int): Boolean = Math.floorMod(14 + 11 * year, 30) < 11

fun tabularMonthLength(year: Int, month: Int): Int = when {
  month == 12 -> if (tabularIsLeapYear(year)) 30 else 29
  month % 2 == 1 -> 30
  else -> 29
}

fun tabularToJdn(date: HijriDate): Int =
  date.day +
    ceil(29.5 * (date.month - 1)).toInt() +
    (date.year - 1) * 354 +
    Math.floorDiv(3 + 11 * date.year, 30) +
    CIVIL_EPOCH_JDN -
    1

fun tabularFromJdn(jdn: Int): HijriDate {
  val year = Math.floorDiv(30L * (jdn - CIVIL_EPOCH_JDN) + 10646, 10631L).toInt()
  val month = minOf(12, ceil((jdn - (29 + tabularToJdn(HijriDate(year, 1, 1)))) / 29.5).toInt() + 1)
  val day = jdn - tabularToJdn(HijriDate(year, month, 1)) + 1
  return HijriDate(year, month, day)
}
