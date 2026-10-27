import Foundation

// Arithmetic ("civil", Friday-epoch, 11-leap-years-in-30 pattern 2,5,7,10,13,16,18,21,24,26,29)
// Islamic calendar. Only used as the fallback outside the precomputed tables (before 1343 AH /
// after 1500 AH) — it agrees with the real calendars about 2/3 of the time and is otherwise a day
// off, which is why every date it produces is labelled "approximate" in the UI.

private let civilEpochJdn = 1_948_440 // 1 Muharram 1 AH = 16 July 622 (Julian)

public func tabularIsLeapYear(_ year: Int) -> Bool {
  floorMod(14 + 11 * year, 30) < 11
}

public func tabularMonthLength(_ year: Int, _ month: Int) -> Int {
  if month == 12 { return tabularIsLeapYear(year) ? 30 : 29 }
  return month % 2 == 1 ? 30 : 29
}

public func tabularToJdn(_ date: HijriDate) -> Int {
  date.day +
    Int((29.5 * Double(date.month - 1)).rounded(.up)) +
    (date.year - 1) * 354 +
    floorDiv(3 + 11 * date.year, 30) +
    civilEpochJdn -
    1
}

public func tabularFromJdn(_ jdn: Int) -> HijriDate {
  let year = floorDiv(30 * (jdn - civilEpochJdn) + 10646, 10631)
  let start = tabularToJdn(HijriDate(year, 1, 1))
  let month = min(12, Int((Double(jdn - (29 + start)) / 29.5).rounded(.up)) + 1)
  let day = jdn - tabularToJdn(HijriDate(year, month, 1)) + 1
  return HijriDate(year, month, day)
}
