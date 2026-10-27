package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.hijri.hijriFromJdn
import com.devlance.hijriconverter.core.hijri.hijriMonthLength
import com.devlance.hijriconverter.core.hijri.hijriOfJdn
import com.devlance.hijriconverter.core.hijri.jdnFromHijri
import com.devlance.hijriconverter.core.hijri.jdnOfHijri
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone
import kotlin.math.abs

/** Ports of v1's birthday, compare, fasting and today tests. */
class ToolsTest {
  // ------------------------------------------------ hijriBirthday

  @Test
  fun `birthday - born on the user's example day (8 Muharram 1423 under Fadlallah)`() {
    val o = opts(MethodId.Fadlallah)
    val today = jdnOf("2026-10-26")
    val b = hijriBirthday(jdnOf("2002-03-22"), today, o)
    assertEquals(HijriDate(1423, 1, 8), b.birthHijri)
    // Today is 15 Jumada al-Awwal 1448 under Fadlallah: the next one is 8 Muharram 1449, turning 26.
    assertEquals(HijriDate(1449, 1, 8), b.next.hijri)
    assertEquals(26, b.next.turning)
    assertEquals(jdnOfHijri(HijriDate(1449, 1, 8), o), b.next.jdn)
    assertEquals(25, b.hijriAge.years)
    assertEquals(YmdSpan(24, 7, 4), b.gregorianAge)
  }

  @Test
  fun `birthday - the next one is the first matching date on or after today (many birthdays, all methods)`() {
    val today = jdnOf("2026-10-26")
    for (method in MethodId.entries) {
      val o = opts(method)
      var birth = jdnOf("1950-01-01")
      while (birth < today) {
        val b = hijriBirthday(birth, today, o)
        assertTrue(b.next.jdn >= today)
        assertEquals(b.next.jdn - today, b.next.inDays)
        assertTrue(b.next.inDays < 356)
        assertEquals(b.next.hijri, hijriOfJdn(b.next.jdn, o))
        assertEquals(b.birthHijri.month, b.next.hijri.month)
        assertEquals(if (b.next.clamped) 29 else b.birthHijri.day, b.next.hijri.day)
        assertEquals(b.next.hijri.year - b.birthHijri.year, b.next.turning)
        // The year before is already past.
        val prevYear = b.next.hijri.year - 1
        val prevDay = minOf(b.birthHijri.day, hijriMonthLength(prevYear, b.birthHijri.month, method))
        assertTrue(jdnOfHijri(HijriDate(prevYear, b.birthHijri.month, prevDay), o) < today)
        birth += 97
      }
    }
  }

  @Test
  fun `birthday - today is the birthday gives 0 days`() {
    val o = opts(MethodId.Iran)
    val today = jdnOf("2026-10-26")
    val birth = jdnOfHijri(hijriOfJdn(today, o).copy(year = 1420), o)
    val b = hijriBirthday(birth, today, o)
    assertEquals(0, b.next.inDays)
    assertEquals(28, b.next.turning)
  }

  // ------------------------------------------------ compareOffices

  @Test
  fun `compare - the user's example day - Iran 7 Muharram, Fadlallah and Umm al-Qura 8 (a day ahead)`() {
    val rows = compareOffices(jdnOf("2002-03-22"), MethodId.Iran)
    val byMethod = rows.associateBy { it.method }
    assertEquals(MethodId.entries.toList(), rows.map { it.method })
    assertEquals(HijriDate(1423, 1, 7), byMethod.getValue(MethodId.Iran).hijri)
    assertEquals(0, byMethod.getValue(MethodId.Iran).offset)
    assertEquals(HijriDate(1423, 1, 8), byMethod.getValue(MethodId.Fadlallah).hijri)
    assertEquals(1, byMethod.getValue(MethodId.Fadlallah).offset)
    assertEquals(1, byMethod.getValue(MethodId.UmmAlQura).offset)
    // Iran started 1423 on Sat 16 Mar 2002.
    assertEquals(jdnOf("2002-03-16"), byMethod.getValue(MethodId.Iran).monthStart)
  }

  @Test
  fun `compare - offsets flip sign when the reference changes`() {
    val rows = compareOffices(jdnOf("2002-03-22"), MethodId.Fadlallah)
    assertEquals(-1, rows.first { it.method == MethodId.Iran }.offset)
    assertEquals(0, rows.first { it.method == MethodId.Fadlallah }.offset)
  }

  @Test
  fun `compare - every offset says when the reference reaches the same date (3 years of days, all pairs)`() {
    val first = jdnOf("2024-01-01")
    for (jdn in first until first + 3 * 365) {
      for (reference in MethodId.entries) {
        for (row in compareOffices(jdn, reference)) {
          assertTrue(abs(row.offset) <= 3)
          if (row.hijri.day <= 29) {
            // The reference shows this office's date `offset` days later.
            assertEquals(row.hijri, hijriFromJdn(jdn + row.offset, reference))
          }
          assertEquals(row.monthStart, jdnFromHijri(row.hijri.copy(day = 1), row.method))
          assertEquals(row.hijri.day - 1, jdn - row.monthStart)
        }
      }
    }
  }

  // ------------------------------------------------ fasting days

  @Test
  fun `fasting - the three days each month happen once a month, never on Ramadan or an Eid`() {
    val from = jdnOf("2024-01-01")
    val to = jdnOf("2029-01-01")
    for (method in MethodId.entries) {
      val o = opts(method)
      val perMonth = LinkedHashMap<Pair<Int, Int>, MutableMap<FastReason, Int>>()
      for (f in fastingDays(from, to, o)) {
        val counts = perMonth.getOrPut(f.day.hijri.year to f.day.hijri.month) { HashMap() }
        for (r in f.reasons) counts[r] = (counts[r] ?: 0) + 1
        val month = f.day.hijri.month
        val d = f.day.hijri.day
        assertTrue(month != 9)
        assertFalse(month == 10 && d == 1)
        assertFalse(month == 12 && d == 10)
        if (month == 1 && d == 10) assertEquals(listOf(FastReason.AshuraAbstain), f.reasons)
        if (FastReason.FirstThursday in f.reasons) assertTrue(d <= 7)
        if (FastReason.MiddleWednesday in f.reasons) assertTrue(d in 11..17)
        if (FastReason.LastThursday in f.reasons) assertTrue(d + 7 > hijriMonthLength(f.day.hijri.year, month, method))
      }
      for ((key, counts) in perMonth) {
        val (year, month) = key
        // Skip the partial months at the window's edges.
        val start = jdnOfHijri(HijriDate(year, month, 1), o)
        if (start < from || start + hijriMonthLength(year, month, method) > to) continue
        // An Eid can swallow one of them (a first Thursday on 1 Shawwal).
        val eidMonth = month == 10 || month == 12
        if (!eidMonth) assertEquals("$method $key", 1, counts[FastReason.FirstThursday] ?: 0)
        assertEquals("$method $key", 1, counts[FastReason.MiddleWednesday])
        assertEquals("$method $key", 1, counts[FastReason.LastThursday])
        assertEquals("$method $key", 3, counts[FastReason.WhiteDays])
      }
    }
  }

  @Test
  fun `fasting - the dated days land where the sources put them`() {
    fun at(month: Int, day: Int) = fastReasons(HijriDate(1448, month, day), 0, 30)
    assertTrue(FastReason.Mabath in at(7, 27))
    assertTrue(FastReason.Mawlid in at(3, 17))
    assertTrue(FastReason.DahwAlArd in at(11, 25))
    assertTrue(FastReason.Ghadir in at(12, 18))
    assertTrue(FastReason.Mubahala in at(12, 24))
    assertTrue(FastReason.Arafah in at(12, 9))
    assertEquals(emptyList<FastReason>(), at(12, 10))
    assertEquals(emptyList<FastReason>(), at(10, 1))
    assertEquals(emptyList<FastReason>(), at(9, 14))
    assertEquals(listOf(FastReason.AshuraAbstain), at(1, 10))
    assertEquals(listOf(FastReason.DhulHijjahDays), at(12, 3))
    assertEquals(listOf(FastReason.ShawwalDays), at(10, 6))
    assertEquals(setOf(FastReason.DhulHijjahDays, FastReason.MuharramDays, FastReason.ShawwalDays), SISTANI_ONLY)
  }

  @Test
  fun `fasting - monthsAhead gives the 1st of a later month`() {
    val o = opts(MethodId.Iran)
    val today = jdnOf("2026-10-26") // 14 Jumada al-Awwal 1448
    assertEquals(jdnOfHijri(HijriDate(1448, 5, 1), o), monthsAhead(today, 0, o))
    assertEquals(jdnOfHijri(HijriDate(1448, 8, 1), o), monthsAhead(today, 3, o))
    assertEquals(jdnOfHijri(HijriDate(1449, 1, 1), o), monthsAhead(today, 8, o))
  }

  // ------------------------------------------------ upcoming occasions / today

  @Test
  fun `occasions - every occasion exactly once over the coming Hijri year, in date order`() {
    val starts = listOf("2026-10-26", "2026-03-20", "2025-07-06", "2030-01-01").map(::jdnOf)
    for (method in MethodId.entries) {
      for (from in starts) {
        val list = upcomingOccasions(from, opts(method))
        assertEquals(OCCASIONS.size, list.size)
        assertEquals(OCCASIONS.size, list.map { it.occasion }.toSet().size)
        for (i in 1 until list.size) assertTrue(list[i].day.jdn >= list[i - 1].day.jdn)
        for (u in list) {
          assertEquals(u.day.jdn - from, u.inDays)
          assertTrue(u.occasion in u.day.occasions)
        }
      }
    }
  }

  @Test
  fun `occasions - the list starts with the Today card's next occasion`() {
    val zone = TimeZone.getTimeZone("Asia/Beirut")
    val now = Calendar.getInstance(zone).apply { clear(); set(2026, 9, 26, 10, 0) }.timeInMillis
    val o = opts(MethodId.Iran)
    val next = todaySummary(now, o, zone).next
    val first = upcomingOccasions(gregorianToJdn(GregorianDate(2026, 10, 26)), o).firstOrNull { it.inDays > 0 }
    assertEquals(next?.day?.jdn, first?.day?.jdn)
  }

  @Test
  fun `today - the eve appears after Beirut's Maghrib only`() {
    val zone = TimeZone.getTimeZone("Asia/Beirut")
    val o = opts(MethodId.Iran)
    val maghrib = maghribInstant(GregorianDate(2026, 10, 26))!!
    assertEquals(null, todaySummary(maghrib - 60_000, o, zone).eve)
    val eve = todaySummary(maghrib + 60_000, o, zone)
    assertEquals(eve.today.jdn + 1, eve.eve?.jdn)
    assertEquals(maghrib, eve.maghrib)
  }
}
