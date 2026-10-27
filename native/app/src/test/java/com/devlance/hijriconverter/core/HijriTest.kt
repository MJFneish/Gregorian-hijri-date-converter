package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.DateSource
import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.hijri.TABLE_FIRST_YEAR
import com.devlance.hijriconverter.core.hijri.TABLE_LAST_YEAR
import com.devlance.hijriconverter.core.hijri.gregorianToHijri
import com.devlance.hijriconverter.core.hijri.hijriFromJdn
import com.devlance.hijriconverter.core.hijri.hijriMonthLength
import com.devlance.hijriconverter.core.hijri.hijriSource
import com.devlance.hijriconverter.core.hijri.hijriToGregorian
import com.devlance.hijriconverter.core.hijri.jdnFromHijri
import com.devlance.hijriconverter.core.hijri.tabularFromJdn
import com.ibm.icu.util.IslamicCalendar
import com.ibm.icu.util.TimeZone
import com.ibm.icu.util.ULocale
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

/** Port of v1's hijri.test.ts. */
class HijriTest {
  // ------------------------------------------------ the user's ground truth: 2002-03-22 = Friday 8 Muharram 1423

  @Test
  fun `the example day is a Friday`() {
    assertEquals(5, weekdayOfJdn(jdnOf("2002-03-22")))
  }

  @Test
  fun `the example is 8 Muharram 1423 under Fadlallah (calculation, shared night)`() {
    assertEquals(HijriDate(1423, 1, 8), gregorianToHijri(iso("2002-03-22"), opts(MethodId.Fadlallah)))
  }

  @Test
  fun `the example is 7 Muharram 1423 in Iran's official calendar (1 Muharram was Sat 16 Mar there)`() {
    assertEquals(HijriDate(1423, 1, 7), gregorianToHijri(iso("2002-03-22"), opts(MethodId.Iran)))
    assertEquals(iso("2002-03-16"), hijriToGregorian(HijriDate(1423, 1, 1), opts(MethodId.Iran)))
  }

  @Test
  fun `the example converts back the other way`() {
    assertEquals(iso("2002-03-22"), hijriToGregorian(HijriDate(1423, 1, 8), opts(MethodId.Fadlallah)))
  }

  // ------------------------------------------------ Fadlallah office announcements

  @Test
  fun `Fadlallah office announcements`() {
    // [Hijri month, first day as announced by Sayyed Fadlallah's office]
    val known = listOf(
      Triple(1423, 1, "2002-03-15"),
      Triple(1432, 9, "2011-08-01"),
      Triple(1435, 10, "2014-07-28"),
      Triple(1446, 10, "2025-03-30"),
      Triple(1447, 10, "2026-03-20"),
    )
    for ((year, month, first) in known) {
      assertEquals("$year/$month", iso(first), hijriToGregorian(HijriDate(year, month, 1), opts(MethodId.Fadlallah)))
    }
  }

  // ------------------------------------------------ Iran official table vs every published month start

  private val qamariRows by lazy {
    val line = Regex("^\\*?([0-9]{4})/([0-9]{1,2}) ([0-9]{4}-[0-9]{2}-[0-9]{2})")
    repoFile("scripts/data/qamari-consolidated.txt").readLines()
      .filter { it.isNotBlank() }
      .mapNotNull { line.find(it) }
      .map { Triple(it.groupValues[1].toInt(), it.groupValues[2].toInt(), it.groupValues[3]) }
      .filter { it.first >= TABLE_FIRST_YEAR }
  }

  @Test
  fun `qamari covers the whole published range`() {
    assertTrue(qamariRows.size > 1250)
  }

  @Test
  fun `Iran official table reproduces every published month start (qamari, CC0)`() {
    val mismatches = qamariRows.filter { (year, month, first) ->
      jdnFromHijri(HijriDate(year, month, 1), MethodId.Iran) != jdnOf(first)
    }
    assertEquals(emptyList<Any>(), mismatches)
  }

  @Test
  fun `labels published months official and later ones calculated`() {
    assertEquals(DateSource.Official, hijriSource(HijriDate(1447, 10, 1), MethodId.Iran))
    assertEquals(DateSource.Calculated, hijriSource(HijriDate(1448, 1, 1), MethodId.Iran))
    assertEquals(DateSource.Calculated, hijriSource(HijriDate(1423, 1, 1), MethodId.Fadlallah))
    assertEquals(DateSource.Approximate, hijriSource(HijriDate(1320, 1, 1), MethodId.Iran))
  }

  // ------------------------------------------------ ICU references (v1 read them through Intl)

  private fun icu(type: IslamicCalendar.CalculationType, jdn: Int): HijriDate {
    val cal = IslamicCalendar(TimeZone.getTimeZone("UTC"), ULocale.ENGLISH)
    cal.calculationType = type
    cal.timeInMillis = noonUtc(jdn)
    return HijriDate(cal.get(IslamicCalendar.YEAR), cal.get(IslamicCalendar.MONTH) + 1, cal.get(IslamicCalendar.DAY_OF_MONTH))
  }

  @Test
  fun `Umm al-Qura table matches ICU (islamic-umalqura) for every day 1990-2050`() {
    val bad = ArrayList<String>()
    for (jdn in jdnOf("1990-01-01")..jdnOf("2050-12-31")) {
      if (hijriFromJdn(jdn, MethodId.UmmAlQura) != icu(IslamicCalendar.CalculationType.ISLAMIC_UMALQURA, jdn)) {
        bad.add(isoDate(jdnToGregorian(jdn)))
      }
    }
    assertEquals(emptyList<String>(), bad)
  }

  @Test
  fun `arithmetic fallback matches ICU islamic-civil (1880-1923 and 2078-2100)`() {
    for ((from, to) in listOf("1880-01-01" to "1923-12-31", "2078-01-01" to "2100-12-31")) {
      for (jdn in jdnOf(from)..jdnOf(to) step 7) {
        assertEquals(isoDate(jdnToGregorian(jdn)), icu(IslamicCalendar.CalculationType.ISLAMIC_CIVIL, jdn), tabularFromJdn(jdn))
      }
    }
  }

  @Test
  fun `the fallback is used for years outside the table and still round-trips`() {
    val date = HijriDate(1320, 5, 10)
    assertEquals(date, gregorianToHijri(hijriToGregorian(date, opts(MethodId.Iran)), opts(MethodId.Iran)))
  }

  // ------------------------------------------------ table integrity, every method

  @Test
  fun `every month is 29 or 30 days and every year 353-356, every method`() {
    // Sighting-based years can be 353 or 356 days (arithmetic calendars only ever give 354/355);
    // Iran's real published calendar contains such years, so that range is the correct invariant.
    for (method in MethodId.entries) {
      for (y in TABLE_FIRST_YEAR..TABLE_LAST_YEAR) {
        var yearLength = 0
        for (m in 1..12) {
          val len = hijriMonthLength(y, m, method)
          assertTrue("$method $y/$m", len == 29 || len == 30)
          yearLength += len
        }
        assertTrue("$method $y: $yearLength", yearLength in 353..356)
      }
    }
  }

  @Test
  fun `Gregorian to Hijri to Gregorian round-trips for every day in range, every method`() {
    for (method in MethodId.entries) {
      val first = jdnFromHijri(HijriDate(TABLE_FIRST_YEAR, 1, 1), method)
      val last = jdnFromHijri(HijriDate(TABLE_LAST_YEAR, 12, hijriMonthLength(TABLE_LAST_YEAR, 12, method)), method)
      for (jdn in first - 400..last + 400) {
        assertEquals("$method $jdn", jdn, jdnFromHijri(hijriFromJdn(jdn, method), method))
      }
    }
  }

  @Test
  fun `methods never disagree by more than 2 days`() {
    for (jdn in jdnOf("1950-01-01")..jdnOf("2070-12-31") step 3) {
      val reference = jdnFromHijri(hijriFromJdn(jdn, MethodId.Iran), MethodId.Fadlallah)
      assertTrue(abs(reference - jdn) <= 2)
    }
  }

  // ------------------------------------------------ manual adjustment

  @Test
  fun `manual adjustment shifts the Hijri date, and the reverse conversion undoes it`() {
    val g = iso("2002-03-22")
    assertEquals(HijriDate(1423, 1, 9), gregorianToHijri(g, opts(MethodId.Fadlallah, 1)))
    assertEquals(HijriDate(1423, 1, 6), gregorianToHijri(g, opts(MethodId.Fadlallah, -2)))
    for (adjustment in -2..2) {
      assertEquals(g, hijriToGregorian(gregorianToHijri(g, opts(MethodId.Iran, adjustment)), opts(MethodId.Iran, adjustment)))
    }
  }
}
