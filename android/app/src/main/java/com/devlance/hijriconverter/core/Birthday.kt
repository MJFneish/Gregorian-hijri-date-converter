package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.ConversionOptions
import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.hijriMonthLength
import com.devlance.hijriconverter.core.hijri.hijriOfJdn
import com.devlance.hijriconverter.core.hijri.jdnOfHijri

data class NextBirthday(
  val jdn: Int,
  val hijri: HijriDate,
  /** 0 = today. */
  val inDays: Int,
  /** Hijri age reached that day. */
  val turning: Int,
  /** Born on the 30th, but that month has 29 days in the birthday's year: kept on the 29th. */
  val clamped: Boolean,
)

data class HijriBirthday(
  /** The birth date in the Hijri calendar (under the user's method). */
  val birthHijri: HijriDate,
  /** Age today, counted in Hijri years/months/days and in Gregorian ones. */
  val hijriAge: YmdSpan,
  val gregorianAge: YmdSpan,
  val next: NextBirthday,
)

/**
 * Hijri birthday maths for Tools → Hijri birthday. A Hijri year is ~11 days shorter than a
 * Gregorian one, so the Hijri birthday moves earlier every Gregorian year and the Hijri age runs
 * ahead. `birthJdn` must not be after `today`.
 */
fun hijriBirthday(birthJdn: Int, today: Int, opts: ConversionOptions): HijriBirthday {
  val birthHijri = hijriOfJdn(birthJdn, opts)
  val todayHijri = hijriOfJdn(today, opts)

  data class Occurrence(val hijri: HijriDate, val jdn: Int, val clamped: Boolean)
  fun occurrence(year: Int): Occurrence {
    val length = hijriMonthLength(year, birthHijri.month, opts.method)
    val hijri = HijriDate(year, birthHijri.month, minOf(birthHijri.day, length))
    return Occurrence(hijri, jdnOfHijri(hijri, opts), birthHijri.day > length)
  }
  var next = occurrence(todayHijri.year)
  if (next.jdn < today) next = occurrence(todayHijri.year + 1)

  return HijriBirthday(
    birthHijri = birthHijri,
    hijriAge = spanBetween(
      birthHijri,
      todayHijri,
      { y, m -> hijriMonthLength(y, m, opts.method) },
      { y, m, d -> jdnOfHijri(HijriDate(y, m, d), opts) },
    ),
    gregorianAge = spanBetween(jdnToGregorian(birthJdn), jdnToGregorian(today), ::gregorianMonthLength) { y, m, d ->
      gregorianToJdn(y, m, d)
    },
    next = NextBirthday(
      jdn = next.jdn,
      hijri = next.hijri,
      inDays = next.jdn - today,
      turning = next.hijri.year - birthHijri.year,
      clamped = next.clamped,
    ),
  )
}
