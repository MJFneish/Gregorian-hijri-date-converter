package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.IRAN_LAST_OFFICIAL
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.hijri.YearMonth
import com.devlance.hijriconverter.core.hijri.hijriMonthLength
import com.devlance.hijriconverter.core.hijri.jdnFromHijri
import com.devlance.hijriconverter.core.hijri.jdnOfHijri
import io.github.cosinekitty.astronomy.Body
import io.github.cosinekitty.astronomy.Time
import io.github.cosinekitty.astronomy.illumination
import io.github.cosinekitty.astronomy.moonPhase
import io.github.cosinekitty.astronomy.searchMoonPhase
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs

/** Ports of v1's crescent.test.ts and moon.test.ts (the reference is Astronomy Engine). */
class AstronomyTest {
  // ------------------------------------------------ crescent visibility reproduces the build-time tables

  @Test
  fun `Sistani - a month has 29 days exactly when the crescent is naked-eye visible from Najaf on the 29th's evening`() {
    for (year in 1440..1450) {
      for (month in 1..12) {
        val day29 = jdnFromHijri(HijriDate(year, month, 1), MethodId.Sistani) + 28
        val report = crescentAt(day29, NAJAF, conjunctionNear(noonUtc(day29)))
        assertEquals(
          "$year/$month",
          hijriMonthLength(year, month, MethodId.Sistani) == 29,
          (report.v ?: Double.NEGATIVE_INFINITY) >= V_NAKED_EYE,
        )
      }
    }
  }

  @Test
  fun `Iran (predicted months) - 29 days exactly when it is visible (V at least 2) from any of the 6 cities`() {
    for (year in IRAN_LAST_OFFICIAL.year..1450) {
      for (month in 1..12) {
        if (year == IRAN_LAST_OFFICIAL.year && month <= IRAN_LAST_OFFICIAL.month) continue
        val day29 = jdnFromHijri(HijriDate(year, month, 1), MethodId.Iran) + 28
        val report = bestOf(day29, IRAN_CITIES, conjunctionNear(noonUtc(day29))).report
        assertEquals(
          "$year/$month",
          hijriMonthLength(year, month, MethodId.Iran) == 29,
          (report.v ?: Double.NEGATIVE_INFINITY) >= V_MAYBE_EYE,
        )
      }
    }
  }

  @Test
  fun `monthStartForecast covers the 29th and 30th evenings and every office's 1st of the next month`() {
    val o = opts(MethodId.Iran)
    val f = monthStartForecast(YearMonth(1448, 5), o)
    assertEquals(YearMonth(1448, 6), f.starting)
    val first = jdnFromHijri(HijriDate(1448, 5, 1), MethodId.Iran)
    assertEquals(listOf(29 to first + 28, 30 to first + 29), f.evenings.map { it.monthDay to it.jdn })
    assertEquals(MethodId.entries.toList(), f.starts.map { it.method })
    for (s in f.starts) assertEquals(jdnFromHijri(HijriDate(1448, 6, 1), s.method), s.jdn)
    // The new moon of 9 Nov 2026 (07:02 UTC) is the one found.
    val hour = SimpleDateFormat("yyyy-MM-dd'T'HH", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("UTC") }
    assertEquals("2026-11-09T07", hour.format(Date(f.conjunction!!)))
  }

  @Test
  fun `an evening before the conjunction has no crescent yet`() {
    val jdn = gregorianToJdn(GregorianDate(2026, 11, 8))
    assertEquals(Visibility.NotBorn, crescentAt(jdn, NAJAF, conjunctionNear(noonUtc(jdn))).visibility)
  }

  // ------------------------------------------------ moon phase vs the full ephemeris

  private fun signed180(a: Double) = ((a + 180) % 360 + 360) % 360 - 180

  /** 160 instants spread over the app's years (1925–2077), at drifting times of day. */
  private val samples = (0 until 160).map { i -> (utcMidnightMs(GregorianDate(1925, 1, 1)) + i * 347.77 * DAY_MS).toLong() }

  @Test
  fun `elongation within half a degree`() {
    for (ms in samples) {
      val reference = moonPhase(Time.fromMillisecondsSince1970(ms))
      assertTrue(abs(signed180(moonPhaseAt(ms).elongation - reference)) < 0.5)
    }
  }

  @Test
  fun `illuminated fraction within 0_006`() {
    for (ms in samples) {
      val reference = illumination(Body.Moon, Time.fromMillisecondsSince1970(ms)).phaseFraction
      assertTrue(abs(moonPhaseAt(ms).illumination - reference) < 0.006)
    }
  }

  @Test
  fun `age (days since new moon) within about an hour`() {
    for (ms in samples) {
      val newMoon = searchMoonPhase(0.0, Time.fromMillisecondsSince1970(ms), -31.0)
      assertNotNull(newMoon)
      val reference = (ms - newMoon!!.toMillisecondsSince1970()) / DAY_MS.toDouble()
      assertTrue(abs(moonPhaseAt(ms).age - reference) < 0.05)
    }
  }

  @Test
  fun `total solar eclipse 2024-04-08 18-17 UTC is a new moon`() {
    val moon = moonPhaseAt(utcMidnightMs(GregorianDate(2024, 4, 8)) + (18 * 60 + 17) * 60_000L)
    assertEquals(MoonPhaseName.New, moon.name)
    assertTrue(moon.illumination < 0.002)
    assertTrue(abs(signed180(moon.elongation)) < 0.3)
  }

  @Test
  fun `total lunar eclipse 2025-03-14 06-59 UTC is a full moon`() {
    val moon = moonPhaseAt(utcMidnightMs(GregorianDate(2025, 3, 14)) + (6 * 60 + 59) * 60_000L)
    assertEquals(MoonPhaseName.Full, moon.name)
    assertTrue(moon.illumination > 0.998)
  }

  private val days = (0 until 3 * 365).map { gregorianToJdn(GregorianDate(2026, 1, 1)) + it }

  @Test
  fun `new and full each name exactly one day per lunation`() {
    for (name in listOf(MoonPhaseName.New, MoonPhaseName.Full)) {
      val hits = days.filter { moonPhaseOnDay(it).name == name }
      assertTrue(hits.size >= 36)
      for (i in 1 until hits.size) assertTrue(hits[i] - hits[i - 1] in 29..30)
    }
  }

  @Test
  fun `the percentage never contradicts the name (100 only at full, 0 only at new)`() {
    for (jdn in days) {
      val moon = moonPhaseOnDay(jdn)
      val percent = illuminationPercent(moon)
      if (moon.name != MoonPhaseName.Full) assertTrue(percent < 100)
      if (moon.name != MoonPhaseName.New) assertTrue(percent > 0)
    }
  }

  @Test
  fun `every day of a Hijri month has its own moon (Fadlallah, 1440-1450 AH)`() {
    val o = opts(MethodId.Fadlallah)
    for (year in 1440..1450) {
      for (month in 1..12) {
        val start = jdnOfHijri(HijriDate(year, month, 1), o)
        val length = hijriMonthLength(year, month, MethodId.Fadlallah)
        val moons = (0 until length).map { moonPhaseOnDay(start + it) }
        // Day 1 (evening): a young waxing crescent.
        assertTrue("$year/$month", moons[0].waxing)
        assertTrue("$year/$month", moons[0].elongation > 5 && moons[0].elongation < 45)
        // Each evening the Moon has moved on by 9–16° (a different shape every day).
        for (i in 1 until length) {
          val step = signed180(moons[i].elongation - moons[i - 1].elongation)
          assertTrue("$year/$month day ${i + 1}", step > 9 && step < 16)
        }
        // Brightest around the middle of the month.
        val brightest = moons.indices.maxBy { moons[it].illumination } + 1
        assertTrue("$year/$month", brightest in 12..16)
      }
    }
  }
}
