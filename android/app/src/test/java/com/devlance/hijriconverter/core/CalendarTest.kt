package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.hijri.hijriMonthLength
import com.devlance.hijriconverter.core.hijri.jdnFromHijri
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone
import kotlin.math.abs

/** Port of v1's calendar.test.ts. */
class CalendarTest {
  @Test
  fun `known JDN anchors`() {
    assertEquals(2451545, gregorianToJdn(GregorianDate(2000, 1, 1)))
    assertEquals(2452356, gregorianToJdn(GregorianDate(2002, 3, 22)))
    assertEquals(GregorianDate(2002, 3, 22), jdnToGregorian(2452356))
  }

  @Test
  fun `round-trips every day 1800-2200 and agrees with java Calendar on weekdays`() {
    val utc = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
    for (jdn in gregorianToJdn(GregorianDate(1800, 1, 1))..gregorianToJdn(GregorianDate(2200, 12, 31))) {
      val g = jdnToGregorian(jdn)
      assertEquals(jdn, gregorianToJdn(g))
      if (jdn % 97 == 0) {
        utc.clear()
        utc.set(g.year, g.month - 1, g.day)
        assertEquals(utc.get(Calendar.DAY_OF_WEEK) - 1, weekdayOfJdn(jdn))
      }
    }
  }

  @Test
  fun `month lengths incl leap years`() {
    assertEquals(29, gregorianMonthLength(2024, 2))
    assertEquals(28, gregorianMonthLength(1900, 2))
    assertEquals(29, gregorianMonthLength(2000, 2))
    assertEquals(30, gregorianMonthLength(2026, 4))
  }

  private fun g(from: String, to: String) =
    spanBetween(iso(from), iso(to), ::gregorianMonthLength) { y, m, d -> gregorianToJdn(y, m, d) }

  @Test
  fun `spanBetween counts whole years, months and remaining days`() {
    assertEquals(YmdSpan(26, 9, 5), g("2000-01-15", "2026-10-20"))
    assertEquals(YmdSpan(0, 0, 0), g("2026-10-20", "2026-10-20"))
    assertEquals(YmdSpan(0, 1, 1), g("2026-01-31", "2026-03-01"))
    assertEquals(YmdSpan(0, 11, 30), g("2024-02-29", "2025-02-28"))
  }

  @Test
  fun `spanBetween works in the Hijri calendar too`() {
    val span = spanBetween(
      HijriDate(1423, 1, 8),
      HijriDate(1448, 5, 9),
      { y, m -> hijriMonthLength(y, m, MethodId.Iran) },
      { y, m, d -> jdnFromHijri(HijriDate(y, m, d), MethodId.Iran) },
    )
    assertEquals(YmdSpan(25, 4, 1), span)
  }

  @Test
  fun `occasions - finds Ashura and Eid al-Ghadir`() {
    assertEquals(listOf("Ashura — Martyrdom of Imam Husayn (AS)"), occasionsOn(HijriDate(1448, 1, 10), 30).map { it.nameEn })
    assertEquals(1, occasionsOn(HijriDate(1448, 12, 18), 29).size)
    assertEquals(0, occasionsOn(HijriDate(1448, 1, 11), 30).size)
  }

  @Test
  fun `occasions - Imam al-Rida's martyrdom is on the last day of Safar, 29 or 30`() {
    val rida = "Martyrdom of Imam Ali al-Rida (AS)"
    assertTrue(occasionsOn(HijriDate(1448, 2, 29), 29).map { it.nameEn }.contains(rida))
    assertFalse(occasionsOn(HijriDate(1448, 2, 29), 30).map { it.nameEn }.contains(rida))
    assertTrue(occasionsOn(HijriDate(1448, 2, 30), 30).map { it.nameEn }.contains(rida))
  }

  @Test
  fun `Maghrib matches Al Sirat's published Beirut Maghrib (2026-07-12 20-11 UTC+3) within a minute`() {
    val m = maghribInstant(GregorianDate(2026, 7, 12))
    assertNotNull(m)
    val minutesUtc = (m!! - utcMidnightMs(GregorianDate(2026, 7, 12))) / 60_000.0
    assertTrue(abs(minutesUtc - (17 * 60 + 11)) <= 1)
  }

  @Test
  fun `formatting uses Arabic-Indic digits in Arabic`() {
    assertEquals("١٤٢٣", localizeDigits("1423", Lang.AR))
    // \u00A0 keeps the year and its era marker on one line when a long date wraps.
    assertEquals("٨ محرّم ١٤٢٣\u00A0هـ", formatHijri(HijriDate(1423, 1, 8), Lang.AR))
    assertEquals("8 Muharram 1423\u00A0AH", formatHijri(HijriDate(1423, 1, 8), Lang.EN))
    assertEquals("22 March 2002", formatGregorian(GregorianDate(2002, 3, 22), Lang.EN))
    assertEquals("٢٢ آذار ٢٠٠٢\u00A0م", formatGregorian(GregorianDate(2002, 3, 22), Lang.AR))
  }

  @Test
  fun `decimals and percents round like JS`() {
    assertEquals("7.3", formatDecimal(7.35, Lang.EN)) // 7.35 is 7.3499999… in binary: JS says "7.3" too
    assertEquals("٧٫٥", formatDecimal(7.46, Lang.AR))
    assertEquals("0.3", toFixed(0.25, 1))
    assertEquals("62%", formatPercent(62, Lang.EN))
    assertEquals("٦٢٪", formatPercent(62, Lang.AR))
    assertEquals("2026-10-05", isoDate(GregorianDate(2026, 10, 5)))
  }
}
