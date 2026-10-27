package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.DateSource
import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.hijri.hijriFromJdn
import com.devlance.hijriconverter.core.hijri.hijriMonthLength
import com.devlance.hijriconverter.core.hijri.hijriSource
import com.devlance.hijriconverter.core.hijri.jdnFromHijri

/** One office's reading of a day (Tools → Compare offices). */
data class OfficeDate(
  val method: MethodId,
  val hijri: HijriDate,
  val source: DateSource,
  /**
   * How many days this office's calendar runs ahead (+) of or behind (−) the reference office's
   * on this day: +1 = it shows today the date the reference shows tomorrow.
   */
  val offset: Int,
  /** JDN of day 1 of the month this office is in, and that month's length. */
  val monthStart: Int,
  val monthLength: Int,
)

private fun nextMonth(date: HijriDate): HijriDate =
  if (date.month == 12) HijriDate(date.year + 1, 1, 1) else HijriDate(date.year, date.month + 1, 1)

/**
 * Days office `method` is ahead of `reference` on `jdn`, from the date labels: find the day the
 * reference shows the same date. When it never does (e.g. the office is on the 30th of a month the
 * reference keeps at 29 days), compare when the two start the office's next month instead.
 */
private fun offsetOf(jdn: Int, hijri: HijriDate, method: MethodId, reference: MethodId): Int {
  for (k in intArrayOf(0, 1, -1, 2, -2, 3, -3)) {
    if (hijriFromJdn(jdn + k, reference) == hijri) return k
  }
  val next = nextMonth(hijri)
  return jdnFromHijri(next, reference) - jdnFromHijri(next, method)
}

/**
 * Every office's date for one day, in [MethodId] order, measured against `reference` (the user's
 * chosen method). The manual ±day adjustment is deliberately not applied: each row is that
 * office's own calendar.
 */
fun compareOffices(jdn: Int, reference: MethodId): List<OfficeDate> = MethodId.entries.map { method ->
  val hijri = hijriFromJdn(jdn, method)
  OfficeDate(
    method = method,
    hijri = hijri,
    source = hijriSource(hijri, method),
    offset = if (method == reference) 0 else offsetOf(jdn, hijri, method, reference),
    monthStart = jdnFromHijri(hijri.copy(day = 1), method),
    monthLength = hijriMonthLength(hijri.year, hijri.month, method),
  )
}
