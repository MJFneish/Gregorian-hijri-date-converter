package com.devlance.hijriconverter.core

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/**
 * The Moon's phase for the converter's result card: what the real Moon looks like on a given
 * day, so every day of a Hijri month gets its own shape (the disc is drawn continuously from
 * these numbers, not picked from 8 icons — see ui/moon/MoonDisc.kt).
 *
 * Unlike the month tables (precomputed at build time), this runs on the phone: it's a handful of
 * trig terms, not an ephemeris. The elongation is Meeus, *Astronomical Algorithms* (2nd ed.),
 * eq. 48.4 — 180° minus the phase angle, from the mean elongation D and the largest periodic
 * terms of the Moon's and Sun's longitudes — extended with the next Moon terms of ch. 47, which
 * keeps it within ~0.1° of a full ephemeris (the test checks it against Astronomy Engine).
 */
enum class MoonPhaseName(val key: String) {
  New("new"),
  WaxingCrescent("waxingCrescent"),
  FirstQuarter("firstQuarter"),
  WaxingGibbous("waxingGibbous"),
  Full("full"),
  WaningGibbous("waningGibbous"),
  LastQuarter("lastQuarter"),
  WaningCrescent("waningCrescent"),
}

data class MoonPhase(
  /** Elongation of the Moon east of the Sun, 0–360°: 0 new, 90 first quarter, 180 full, 270 last quarter. */
  val elongation: Double,
  /** Illuminated fraction of the disc, 0–1. */
  val illumination: Double,
  /** Lit side growing (elongation < 180°) — lit on the right, as seen from the northern hemisphere. */
  val waxing: Boolean,
  /** Days since the last new moon (conjunction). */
  val age: Double,
  val name: MoonPhaseName,
)

private const val DEG = Math.PI / 180
private const val SYNODIC_MONTH = 29.530588853
private const val MEAN_DAILY_MOTION = 360 / SYNODIC_MONTH

private fun norm360(a: Double) = a - 360 * floor(a / 360)

/** Wraps to (-180, 180]. */
private fun signed180(a: Double): Double {
  val x = norm360(a)
  return if (x > 180) x - 360 else x
}

private fun sin(deg: Double) = kotlin.math.sin(deg * DEG)

/** Julian Day (fractional, UT) of an instant. */
fun julianDayOf(epochMs: Long): Double = epochMs / 86400000.0 + 2440587.5

/** Moon–Sun elongation (degrees, 0–360) at Julian Day `jd`. UT is used for TT: ΔT is about a
 * minute over the app's years, a few hundredths of a degree here. */
private fun elongation(jd: Double): Double {
  val t = (jd - 2451545) / 36525
  val t2 = t * t
  val t3 = t2 * t
  val d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t2 + t3 / 545868
  val m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000
  val mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t2 + t3 / 69699
  val f = 93.272095 + 483202.0175233 * t - 0.0036539 * t2 - t3 / 3526000
  return norm360(
    d +
      // eq. 48.4 (the -2.100 sin M merges the Moon's -0.186 with the Sun's equation of centre;
      // +0.110 sin D is the Moon's -0.035 plus the Earth-Moon vs Earth-Sun distance correction)
      6.289 * sin(mp) -
      2.1 * sin(m) +
      1.274 * sin(2 * d - mp) +
      0.658 * sin(2 * d) +
      0.214 * sin(2 * mp) +
      0.11 * sin(d) +
      // next-largest terms of the Moon's longitude (ch. 47) and the Sun's equation of centre
      -0.114 * sin(2 * f) +
      0.059 * sin(2 * d - 2 * mp) +
      0.057 * sin(2 * d - m - mp) +
      0.053 * sin(2 * d + mp) +
      0.046 * sin(2 * d - m) -
      0.041 * sin(m - mp) -
      0.03 * sin(m + mp) -
      0.02 * sin(2 * m),
  )
}

/** Current elongation rate, degrees per day (≈ 10–15: the Moon's speed varies along its orbit). */
private fun dailyMotion(jd: Double): Double = signed180(elongation(jd + 0.05) - elongation(jd - 0.05)) / 0.1

/** The conjunction (new moon) at or before `jd`. Starts from the mean motion, then Newton steps. */
private fun previousNewMoon(jd: Double, elongationNow: Double): Double {
  var t = jd - elongationNow / MEAN_DAILY_MOTION
  repeat(4) { t -= signed180(elongation(t)) / dailyMotion(t) }
  return t
}

private val PRINCIPAL = listOf(
  0.0 to MoonPhaseName.New,
  90.0 to MoonPhaseName.FirstQuarter,
  180.0 to MoonPhaseName.Full,
  270.0 to MoonPhaseName.LastQuarter,
)

fun moonPhaseAt(epochMs: Long): MoonPhase {
  val jd = julianDayOf(epochMs)
  val e = elongation(jd)
  val waxing = e < 180
  val halfDay = dailyMotion(jd) / 2
  // A principal phase names only the day it happens on (exact instant within ±12 h of `instant`),
  // like printed calendars and weather apps; every other day gets the in-between name.
  val principal = PRINCIPAL.firstOrNull { (target, _) -> abs(signed180(e - target)) < halfDay }
  val name = principal?.second ?: when {
    e < 90 -> MoonPhaseName.WaxingCrescent
    e < 180 -> MoonPhaseName.WaxingGibbous
    e < 270 -> MoonPhaseName.WaningGibbous
    else -> MoonPhaseName.WaningCrescent
  }
  return MoonPhase(
    elongation = e,
    illumination = (1 - cos(e * DEG)) / 2,
    waxing = waxing,
    age = max(0.0, jd - previousNewMoon(jd, e)),
    name = name,
  )
}

/** JS `Math.round`: halves round up (toward +∞). */
fun jsRound(x: Double): Long = floor(x + 0.5).toLong()

/** Whole-percent illumination for display. Rounding alone would print "100%" for the evening
 * before a full moon and "0%" for a visible crescent, contradicting the phase name beside it. */
fun illuminationPercent(phase: MoonPhase): Int {
  val percent = jsRound(phase.illumination * 100).toInt()
  if (phase.name == MoonPhaseName.Full || phase.name == MoonPhaseName.New) return percent
  return min(99, max(1, percent))
}

/**
 * The Moon on the evening of a civil day: at Beirut's Maghrib, the moment the app already uses
 * for the start of the Islamic night (core/Maghrib.kt). The evening is when the Moon is watched —
 * a new month's crescent is sought then — so day 1 of a Hijri month shows a young crescent and
 * the 14th/15th a full moon. The phase is the real sky's, so it follows the Gregorian day only:
 * the method and ±day adjustment relabel the Hijri date but don't move the Moon.
 */
fun moonPhaseOnDay(jdn: Int): MoonPhase {
  val date = jdnToGregorian(jdn)
  val evening = maghribInstant(date) ?: (utcMidnightMs(date) + 16 * 3_600_000L)
  return moonPhaseAt(evening)
}
