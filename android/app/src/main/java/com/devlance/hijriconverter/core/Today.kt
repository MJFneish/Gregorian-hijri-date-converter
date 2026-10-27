package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.ConversionOptions
import com.devlance.hijriconverter.core.hijri.DateSource
import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.hijriMonthLength
import com.devlance.hijriconverter.core.hijri.hijriOfJdn
import com.devlance.hijriconverter.core.hijri.hijriSource
import com.devlance.hijriconverter.core.hijri.jdnOfHijri
import java.util.TimeZone

data class DayInfo(
  val jdn: Int,
  val gregorian: GregorianDate,
  val hijri: HijriDate,
  val weekday: Int,
  val source: DateSource,
  val occasions: List<Occasion>,
)

fun dayInfo(jdn: Int, opts: ConversionOptions): DayInfo {
  val hijri = hijriOfJdn(jdn, opts)
  return DayInfo(
    jdn = jdn,
    gregorian = jdnToGregorian(jdn),
    hijri = hijri,
    weekday = weekdayOfJdn(jdn),
    source = hijriSource(hijri, opts.method),
    occasions = occasionsOn(hijri, hijriMonthLength(hijri.year, hijri.month, opts.method)),
  )
}

data class UpcomingOccasion(
  val occasion: Occasion,
  val day: DayInfo,
  /** 0 = today. */
  val inDays: Int,
)

/**
 * Every occasion from `fromJdn` up to (not including) the same Hijri date a year later — so each
 * occasion appears exactly once, in date order (Tools → Occasions).
 */
fun upcomingOccasions(fromJdn: Int, opts: ConversionOptions): List<UpcomingOccasion> {
  val start = hijriOfJdn(fromJdn, opts)
  val nextYear = start.year + 1
  val day = minOf(start.day, hijriMonthLength(nextYear, start.month, opts.method))
  val end = jdnOfHijri(HijriDate(nextYear, start.month, day), opts)
  val out = ArrayList<UpcomingOccasion>()
  for (jdn in fromJdn until end) {
    val info = dayInfo(jdn, opts)
    for (occasion in info.occasions) out.add(UpcomingOccasion(occasion, info, jdn - fromJdn))
  }
  return out
}

data class NextOccasion(val day: DayInfo, val inDays: Int)

data class TodaySummary(
  val today: DayInfo,
  /** Between Beirut's Maghrib and local midnight: the coming Hijri day whose night has begun. */
  val eve: DayInfo?,
  val maghrib: Long?,
  /** First upcoming occasion after today (within ~13 months). */
  val next: NextOccasion?,
)

fun todaySummary(nowMs: Long, opts: ConversionOptions, zone: TimeZone = TimeZone.getDefault()): TodaySummary {
  val jdn = todayJdn(nowMs, zone)
  val today = dayInfo(jdn, opts)
  val evening = isEveningAfterMaghrib(nowMs, zone)
  var next: NextOccasion? = null
  for (i in 1..400) {
    val day = dayInfo(jdn + i, opts)
    if (day.occasions.isNotEmpty()) {
      next = NextOccasion(day, i)
      break
    }
  }
  return TodaySummary(today, if (evening.isEve) dayInfo(jdn + 1, opts) else null, evening.maghrib, next)
}
