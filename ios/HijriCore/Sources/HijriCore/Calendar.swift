import Foundation

/// A day/month/year in either calendar — what `spanBetween` counts in.
public protocol YmdDate {
  var year: Int { get }
  /// 1-12
  var month: Int { get }
  var day: Int { get }
}

public struct GregorianDate: YmdDate, Hashable, Sendable {
  public let year: Int
  public let month: Int
  public let day: Int

  public init(_ year: Int, _ month: Int, _ day: Int) {
    self.year = year
    self.month = month
    self.day = day
  }
}

/*
 Gregorian calendar + Julian Day Number (JDN) helpers. Every conversion in the app goes through an
 integer JDN (the day count at noon), so both calendars share one timeline.

 The Fliegel–Van Flandern formulas need *truncating* integer division — Swift's `/` on Ints, like
 v1's `Math.trunc`. Flooring instead silently shifts results by 1–2 days depending on the month
 and the year's position in the leap cycle (the bug in prayer-times-lb's v1 hijri.ts).
 */

public func gregorianToJdn(_ date: GregorianDate) -> Int {
  gregorianToJdn(date.year, date.month, date.day)
}

public func gregorianToJdn(_ year: Int, _ month: Int, _ day: Int) -> Int {
  let a = (month - 14) / 12
  return (1461 * (year + 4800 + a)) / 4 +
    (367 * (month - 2 - 12 * a)) / 12 -
    (3 * ((year + 4900 + a) / 100)) / 4 +
    day -
    32075
}

public func jdnToGregorian(_ jdn: Int) -> GregorianDate {
  var l = jdn + 68569
  let n = (4 * l) / 146097
  l -= (146097 * n + 3) / 4
  let i = (4000 * (l + 1)) / 1461001
  l = l - (1461 * i) / 4 + 31
  let j = (80 * l) / 2447
  let day = l - (2447 * j) / 80
  l = j / 11
  let month = j + 2 - 12 * l
  let year = 100 * (n - 49) + i + l
  return GregorianDate(year, month, day)
}

public func isGregorianLeapYear(_ year: Int) -> Bool {
  (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

private let monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

public func gregorianMonthLength(_ year: Int, _ month: Int) -> Int {
  month == 2 && isGregorianLeapYear(year) ? 29 : monthDays[month - 1]
}

/// 0 = Sunday … 6 = Saturday.
public func weekdayOfJdn(_ jdn: Int) -> Int {
  ((jdn + 1) % 7 + 7) % 7
}

/// JDN of 1970-01-01: `Date.UTC(y, m - 1, d)` = (JDN − this) days.
public let unixEpochJdn = 2_440_588
public let dayMs = 86_400_000

/// The local calendar date of an instant (epoch ms; the phone's time zone by default).
public func localDate(_ epochMs: Int, timeZone: TimeZone = .current) -> GregorianDate {
  var calendar = Calendar(identifier: .gregorian)
  calendar.timeZone = timeZone
  let c = calendar.dateComponents([.year, .month, .day], from: Date(timeIntervalSince1970: Double(epochMs) / 1000))
  return GregorianDate(c.year!, c.month!, c.day!)
}

/// The phone's current local calendar date as a JDN.
public func todayJdn(_ nowMs: Int = nowMillis(), timeZone: TimeZone = .current) -> Int {
  gregorianToJdn(localDate(nowMs, timeZone: timeZone))
}

/// Now, in epoch milliseconds.
public func nowMillis() -> Int {
  Int((Date().timeIntervalSince1970 * 1000).rounded(.down))
}

/// UTC midnight starting a civil day, in epoch ms (v1's `Date.UTC(year, month - 1, day)`).
public func utcMidnightMs(_ date: GregorianDate) -> Int {
  (gregorianToJdn(date) - unixEpochJdn) * dayMs
}

public struct YmdSpan: Hashable, Sendable {
  public let years: Int
  public let months: Int
  public let days: Int

  public init(_ years: Int, _ months: Int, _ days: Int) {
    self.years = years
    self.months = months
    self.days = days
  }
}

/// Whole years/months/days from `from` to `to` (to >= from) in any calendar — the way people count
/// ages ("3 years, 2 months and 5 days"). Counts whole months first (stepping back one when `to`'s
/// day is earlier than `from`'s), lands on that anniversary with the day clamped to the month's
/// length (31 Jan + 1 month = 28/29 Feb), then counts the remaining days through the JDN timeline.
public func spanBetween(
  _ from: YmdDate,
  _ to: YmdDate,
  monthLength: (_ year: Int, _ month: Int) -> Int,
  toJdn: (_ year: Int, _ month: Int, _ day: Int) -> Int
) -> YmdSpan {
  var totalMonths = (to.year - from.year) * 12 + (to.month - from.month)
  if to.day < from.day { totalMonths -= 1 }
  let monthIndex = from.month - 1 + totalMonths
  let year = from.year + floorDiv(monthIndex, 12)
  let month = floorMod(monthIndex, 12) + 1
  let anchorDay = min(from.day, monthLength(year, month))
  return YmdSpan(
    floorDiv(totalMonths, 12),
    // JS `%` keeps the sign; totalMonths is never negative here (to >= from).
    totalMonths % 12,
    toJdn(to.year, to.month, to.day) - toJdn(year, month, anchorDay)
  )
}
