import Foundation

public struct NextBirthday: Hashable, Sendable {
  public let jdn: Int
  public let hijri: HijriDate
  /// 0 = today.
  public let inDays: Int
  /// Hijri age reached that day.
  public let turning: Int
  /// Born on the 30th, but that month has 29 days in the birthday's year: kept on the 29th.
  public let clamped: Bool
}

public struct HijriBirthday: Hashable, Sendable {
  /// The birth date in the Hijri calendar (under the user's method).
  public let birthHijri: HijriDate
  /// Age today, counted in Hijri years/months/days and in Gregorian ones.
  public let hijriAge: YmdSpan
  public let gregorianAge: YmdSpan
  public let next: NextBirthday
}

/// Hijri birthday maths for Tools → Hijri birthday. A Hijri year is ~11 days shorter than a
/// Gregorian one, so the Hijri birthday moves earlier every Gregorian year and the Hijri age runs
/// ahead. `birthJdn` must not be after `today`.
public func hijriBirthday(_ birthJdn: Int, _ today: Int, _ opts: ConversionOptions) -> HijriBirthday {
  let birthHijri = hijriOfJdn(birthJdn, opts)
  let todayHijri = hijriOfJdn(today, opts)

  func occurrence(_ year: Int) -> (hijri: HijriDate, jdn: Int, clamped: Bool) {
    let length = hijriMonthLength(year, birthHijri.month, opts.method)
    let hijri = HijriDate(year, birthHijri.month, min(birthHijri.day, length))
    return (hijri, jdnOfHijri(hijri, opts), birthHijri.day > length)
  }
  var next = occurrence(todayHijri.year)
  if next.jdn < today { next = occurrence(todayHijri.year + 1) }

  return HijriBirthday(
    birthHijri: birthHijri,
    hijriAge: spanBetween(
      birthHijri,
      todayHijri,
      monthLength: { y, m in hijriMonthLength(y, m, opts.method) },
      toJdn: { y, m, d in jdnOfHijri(HijriDate(y, m, d), opts) }
    ),
    gregorianAge: spanBetween(
      jdnToGregorian(birthJdn),
      jdnToGregorian(today),
      monthLength: gregorianMonthLength,
      toJdn: { y, m, d in gregorianToJdn(y, m, d) }
    ),
    next: NextBirthday(
      jdn: next.jdn,
      hijri: next.hijri,
      inDays: next.jdn - today,
      turning: next.hijri.year - birthHijri.year,
      clamped: next.clamped
    )
  )
}
