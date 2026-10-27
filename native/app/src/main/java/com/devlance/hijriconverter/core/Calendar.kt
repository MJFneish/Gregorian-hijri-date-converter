package com.devlance.hijriconverter.core

import java.util.Calendar
import java.util.TimeZone

/**
 * Gregorian calendar + Julian Day Number (JDN) helpers. Every conversion in the app goes through
 * an integer JDN (the day count at noon), so both calendars share one timeline.
 *
 * The Fliegel–Van Flandern formulas below need *truncating* integer division — Kotlin's `/` on
 * integers, like v1's `Math.trunc`. Flooring instead silently shifts results by 1–2 days depending
 * on the month and the year's position in the leap cycle (the bug in prayer-times-lb's v1
 * hijri.ts). Intermediates are Longs: `4000 * (l + 1)` overflows an Int.
 */
data class GregorianDate(override val year: Int, override val month: Int, override val day: Int) : YmdDate

/** A day/month/year in either calendar — what [spanBetween] counts in. */
interface YmdDate {
  val year: Int
  /** 1-12 */
  val month: Int
  val day: Int
}

fun gregorianToJdn(date: GregorianDate): Int = gregorianToJdn(date.year, date.month, date.day)

fun gregorianToJdn(year: Int, month: Int, day: Int): Int {
  val a = (month - 14L) / 12
  return ((1461L * (year + 4800 + a)) / 4 +
    (367L * (month - 2 - 12 * a)) / 12 -
    (3L * ((year + 4900 + a) / 100)) / 4 +
    day -
    32075).toInt()
}

fun jdnToGregorian(jdn: Int): GregorianDate {
  var l = jdn + 68569L
  val n = (4 * l) / 146097
  l -= (146097 * n + 3) / 4
  val i = (4000 * (l + 1)) / 1461001
  l = l - (1461 * i) / 4 + 31
  val j = (80 * l) / 2447
  val day = l - (2447 * j) / 80
  l = j / 11
  val month = j + 2 - 12 * l
  val year = 100 * (n - 49) + i + l
  return GregorianDate(year.toInt(), month.toInt(), day.toInt())
}

fun isGregorianLeapYear(year: Int): Boolean = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0

private val MONTH_DAYS = intArrayOf(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)

fun gregorianMonthLength(year: Int, month: Int): Int =
  if (month == 2 && isGregorianLeapYear(year)) 29 else MONTH_DAYS[month - 1]

/** 0 = Sunday … 6 = Saturday. */
fun weekdayOfJdn(jdn: Int): Int = ((jdn + 1) % 7 + 7) % 7

/** The local calendar date of an instant (the device's time zone by default). */
fun localDate(epochMs: Long, zone: TimeZone = TimeZone.getDefault()): GregorianDate {
  val c = Calendar.getInstance(zone).apply { timeInMillis = epochMs }
  return GregorianDate(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH))
}

/** The device's current local calendar date as a JDN. */
fun todayJdn(nowMs: Long = System.currentTimeMillis(), zone: TimeZone = TimeZone.getDefault()): Int =
  gregorianToJdn(localDate(nowMs, zone))

/** JDN of 1970-01-01: `Date.UTC(y, m - 1, d)` = (JDN − this) days. */
const val UNIX_EPOCH_JDN = 2440588
const val DAY_MS = 86_400_000L

/** UTC midnight starting a civil day, in epoch ms (v1's `Date.UTC(year, month - 1, day)`). */
fun utcMidnightMs(date: GregorianDate): Long = (gregorianToJdn(date) - UNIX_EPOCH_JDN) * DAY_MS

data class YmdSpan(val years: Int, val months: Int, val days: Int)

/**
 * Whole years/months/days from `from` to `to` (to >= from) in any calendar — the way people count
 * ages ("3 years, 2 months and 5 days"). Counts whole months first (stepping back one when `to`'s
 * day is earlier than `from`'s), lands on that anniversary with the day clamped to the month's
 * length (31 Jan + 1 month = 28/29 Feb), then counts the remaining days through the JDN timeline.
 */
fun spanBetween(
  from: YmdDate,
  to: YmdDate,
  monthLength: (year: Int, month: Int) -> Int,
  toJdn: (year: Int, month: Int, day: Int) -> Int,
): YmdSpan {
  var totalMonths = (to.year - from.year) * 12 + (to.month - from.month)
  if (to.day < from.day) totalMonths -= 1
  val monthIndex = from.month - 1 + totalMonths
  val year = from.year + Math.floorDiv(monthIndex, 12)
  val month = Math.floorMod(monthIndex, 12) + 1
  val anchorDay = minOf(from.day, monthLength(year, month))
  return YmdSpan(
    years = Math.floorDiv(totalMonths, 12),
    // JS `%` keeps the sign; totalMonths is never negative here (to >= from).
    months = totalMonths % 12,
    days = toJdn(to.year, to.month, to.day) - toJdn(year, month, anchorDay),
  )
}
