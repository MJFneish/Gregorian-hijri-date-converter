import Foundation

/// Recommended (mustahab) fasting days in Twelver jurisprudence, for Tools → Fasting days.
/// Researched (2026-10-26) in the marjas' own texts: Sayyed Sistani's Islamic Laws r.1716 and Minhaj
/// 1063–1066, Sayyed Khamenei's رساله نماز و روزه 976–980, Sayyed Fadlallah's treatise (أنواع الصوم)
/// — see CLAUDE.md "Fasting days". The main list is what those sources share; the three
/// `sistaniOnly` reasons are in Sistani's list only. Never suggested: Ramadan (obligatory), Eid
/// al-Fitr and Eid al-Adha (forbidden), Ashura (discouraged — "abstain in mourning until after Asr").
public enum FastReason: String, CaseIterable, Sendable {
  // "Three days each month" (صيام ثلاثة أيام من كل شهر)
  case firstThursday, middleWednesday, lastThursday, whiteDays
  case mabath, mawlid, dahwAlArd, ghadir, mubahala, arafah
  // Sayyed Sistani's list only
  case dhulHijjahDays, muharramDays, shawwalDays
  // Not a fast: Ashura
  case ashuraAbstain
}

public let sistaniOnly: Set<FastReason> = [.dhulHijjahDays, .muharramDays, .shawwalDays]

/// Months recommended as a whole (all of it or any day): Rajab and Sha'ban.
public let wholeMonths = [7, 8]

private let thursday = 4
private let wednesday = 3

/// Why a Hijri day is a recommended fast — empty when it isn't (or fasting is not allowed).
public func fastReasons(_ hijri: HijriDate, _ weekday: Int, _ monthLength: Int) -> [FastReason] {
  let month = hijri.month
  let day = hijri.day
  if month == 9 { return [] } // Ramadan: obligatory, not "recommended"
  if (month == 10 && day == 1) || (month == 12 && day == 10) { return [] } // the two Eids: forbidden
  if month == 1 && day == 10 { return [.ashuraAbstain] }
  var reasons: [FastReason] = []
  if weekday == thursday && day <= 7 { reasons.append(.firstThursday) }
  // "The first Wednesday of the middle ten days" (11th–20th) is always the 11th–17th.
  if weekday == wednesday && (11 ... 17).contains(day) { reasons.append(.middleWednesday) }
  if weekday == thursday && day > monthLength - 7 { reasons.append(.lastThursday) }
  if (13 ... 15).contains(day) { reasons.append(.whiteDays) }
  if month == 7 && day == 27 { reasons.append(.mabath) }
  if month == 3 && day == 17 { reasons.append(.mawlid) }
  if month == 11 && day == 25 { reasons.append(.dahwAlArd) }
  if month == 12 && day == 18 { reasons.append(.ghadir) }
  if month == 12 && day == 24 { reasons.append(.mubahala) }
  if month == 12 && day == 9 { reasons.append(.arafah) }
  if month == 12 && day <= 8 { reasons.append(.dhulHijjahDays) }
  if month == 1 && (day == 1 || day == 3 || day == 7) { reasons.append(.muharramDays) }
  if month == 10 && (4 ... 9).contains(day) { reasons.append(.shawwalDays) }
  return reasons
}

public struct FastingDay: Hashable, Sendable {
  public let day: DayInfo
  public let reasons: [FastReason]
  /// 0 = today.
  public let inDays: Int
}

/// Every day from `fromJdn` up to (not including) `toJdn` with a reason, in date order.
public func fastingDays(_ fromJdn: Int, _ toJdn: Int, _ opts: ConversionOptions) -> [FastingDay] {
  var out: [FastingDay] = []
  for jdn in fromJdn ..< max(fromJdn, toJdn) {
    let day = dayInfo(jdn, opts)
    let reasons = fastReasons(day.hijri, day.weekday, hijriMonthLength(day.hijri.year, day.hijri.month, opts.method))
    if !reasons.isEmpty { out.append(FastingDay(day: day, reasons: reasons, inDays: jdn - fromJdn)) }
  }
  return out
}

/// JDN of day 1 of the Hijri month `months` after the one containing `fromJdn`.
public func monthsAhead(_ fromJdn: Int, _ months: Int, _ opts: ConversionOptions) -> Int {
  let hijri = dayInfo(fromJdn, opts).hijri
  let index = hijri.year * 12 + (hijri.month - 1) + months
  return jdnOfHijri(HijriDate(floorDiv(index, 12), floorMod(index, 12) + 1, 1), opts)
}
