import Foundation

public struct DayInfo: Hashable, Sendable {
  public let jdn: Int
  public let gregorian: GregorianDate
  public let hijri: HijriDate
  public let weekday: Int
  public let source: DateSource
  public let occasions: [Occasion]
}

public func dayInfo(_ jdn: Int, _ opts: ConversionOptions) -> DayInfo {
  let hijri = hijriOfJdn(jdn, opts)
  return DayInfo(
    jdn: jdn,
    gregorian: jdnToGregorian(jdn),
    hijri: hijri,
    weekday: weekdayOfJdn(jdn),
    source: hijriSource(hijri, opts.method),
    occasions: occasionsOn(hijri, hijriMonthLength(hijri.year, hijri.month, opts.method))
  )
}

public struct UpcomingOccasion: Hashable, Sendable {
  public let occasion: Occasion
  public let day: DayInfo
  /// 0 = today.
  public let inDays: Int
}

/// Every occasion from `fromJdn` up to (not including) the same Hijri date a year later — so each
/// occasion appears exactly once, in date order (Tools → Occasions).
public func upcomingOccasions(_ fromJdn: Int, _ opts: ConversionOptions) -> [UpcomingOccasion] {
  let start = hijriOfJdn(fromJdn, opts)
  let nextYear = start.year + 1
  let day = min(start.day, hijriMonthLength(nextYear, start.month, opts.method))
  let end = jdnOfHijri(HijriDate(nextYear, start.month, day), opts)
  var out: [UpcomingOccasion] = []
  for jdn in fromJdn ..< end {
    let info = dayInfo(jdn, opts)
    for occasion in info.occasions {
      out.append(UpcomingOccasion(occasion: occasion, day: info, inDays: jdn - fromJdn))
    }
  }
  return out
}

public struct NextOccasion: Hashable, Sendable {
  public let day: DayInfo
  public let inDays: Int
}

public struct TodaySummary: Hashable, Sendable {
  public let today: DayInfo
  /// Between Beirut's Maghrib and local midnight: the coming Hijri day whose night has begun.
  public let eve: DayInfo?
  public let maghrib: Int?
  /// First upcoming occasion after today (within ~13 months).
  public let next: NextOccasion?
}

public func todaySummary(_ nowMs: Int, _ opts: ConversionOptions, timeZone: TimeZone = .current) -> TodaySummary {
  let jdn = todayJdn(nowMs, timeZone: timeZone)
  let today = dayInfo(jdn, opts)
  let evening = isEveningAfterMaghrib(nowMs, timeZone: timeZone)
  var next: NextOccasion?
  for i in 1 ... 400 {
    let day = dayInfo(jdn + i, opts)
    if !day.occasions.isEmpty {
      next = NextOccasion(day: day, inDays: i)
      break
    }
  }
  return TodaySummary(today: today, eve: evening.isEve ? dayInfo(jdn + 1, opts) : nil, maghrib: evening.maghrib, next: next)
}
