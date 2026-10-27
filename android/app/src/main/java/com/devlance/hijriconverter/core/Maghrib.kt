package com.devlance.hijriconverter.core

import java.util.TimeZone
import kotlin.math.acos
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin

/**
 * Maghrib for the "eve" hint on the Today card. In Shia jurisprudence the Islamic night (and so
 * the next Hijri day) begins at Maghrib — when the eastern redness has gone, a few minutes after
 * sunset — not at midnight. The app still changes "today" at midnight (the user's choice) but,
 * between Maghrib and midnight, says "Tonight is the eve of …".
 *
 * Maghrib = sun 4.5° below the horizon — the Jafari "Tehran" angle that prayer-times-lb verified
 * against 114 real Al Sirat data points. Computed for Beirut (no location permission needed), with
 * the same low-precision solar formulas as prayer-times-lb's solar.ts (PrayTimes.js class,
 * accurate to well under a minute — plenty for a hint).
 */
const val MAGHRIB_ANGLE = 4.5

data class LatLng(val lat: Double, val lng: Double)

val BEIRUT_LATLNG = LatLng(33.8938, 35.5018)

private const val DEG = Math.PI / 180

private fun fixAngle(a: Double) = a - 360 * floor(a / 360)
private fun fixHour(h: Double) = h - 24 * floor(h / 24)

/** Julian Day (fractional, at 0h UT) for a Gregorian date. */
private fun julianDay(date: GregorianDate): Double {
  var y = date.year
  var m = date.month
  if (m <= 2) {
    y -= 1
    m += 12
  }
  val a = floor(y / 100.0)
  val b = 2 - a + floor(a / 4)
  return floor(365.25 * (y + 4716)) + floor(30.6001 * (m + 1)) + date.day + b - 1524.5
}

private class SunPosition(val equationOfTime: Double, val declination: Double)

private fun sunPosition(jd: Double): SunPosition {
  val d = jd - 2451545.0
  val g = fixAngle(357.529 + 0.98560028 * d)
  val q = fixAngle(280.459 + 0.98564736 * d)
  val l = fixAngle(q + 1.915 * sin(g * DEG) + 0.02 * sin(2 * g * DEG))
  val e = 23.439 - 0.00000036 * d
  val ra = atan2(cos(e * DEG) * sin(l * DEG), cos(l * DEG)) / DEG / 15
  return SunPosition(
    equationOfTime = q / 15 - fixHour(ra),
    declination = asin(sin(e * DEG) * sin(l * DEG)) / DEG,
  )
}

/** Maghrib instant (epoch ms) at `place` on the given civil date, or null if the sun never gets
 * that low (polar edge case — can't happen at Beirut). */
fun maghribInstant(date: GregorianDate, place: LatLng = BEIRUT_LATLNG): Long? {
  val jd = julianDay(date)
  val noon = fixHour(12 - sunPosition(jd + 0.5).equationOfTime) - place.lng / 15 // UTC hours
  val declination = sunPosition(jd + noon / 24).declination
  val cosH = (-sin(MAGHRIB_ANGLE * DEG) - sin(place.lat * DEG) * sin(declination * DEG)) /
    (cos(place.lat * DEG) * cos(declination * DEG))
  if (cosH < -1 || cosH > 1) return null
  val hours = noon + acos(cosH) / DEG / 15
  // v1's `new Date(ms)` truncates a fractional millisecond; so does toLong().
  return (utcMidnightMs(date) + hours * 3600e3).toLong()
}

data class EveningState(val isEve: Boolean, val maghrib: Long?)

/** True between Beirut's Maghrib and the device's local midnight. */
fun isEveningAfterMaghrib(nowMs: Long, zone: TimeZone = TimeZone.getDefault()): EveningState {
  val maghrib = maghribInstant(localDate(nowMs, zone))
  return EveningState(maghrib != null && nowMs >= maghrib, maghrib)
}
