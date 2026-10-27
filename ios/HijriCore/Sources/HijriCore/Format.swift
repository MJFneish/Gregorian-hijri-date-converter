import Foundation

private let arabicIndic: [Character] = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]

/// Non-breaking space: keeps "1448 AH" / "١٤٤٨ هـ" together when a long date wraps.
private let nbsp = "\u{00A0}"

/// Arabic UI shows Arabic-Indic digits (١٤٢٣), like prayer-times-lb does.
public func localizeDigits(_ value: String, _ lang: Lang) -> String {
  guard lang == .ar else { return value }
  return String(value.map { c -> Character in
    if let ascii = c.asciiValue, (48 ... 57).contains(ascii) { return arabicIndic[Int(ascii) - 48] }
    return c
  })
}

public func localizeDigits(_ value: Int, _ lang: Lang) -> String {
  localizeDigits(String(value), lang)
}

public func formatHijri(_ date: HijriDate, _ lang: Lang) -> String {
  let month = hijriMonthName(date.month, lang)
  return lang == .ar
    ? localizeDigits("\(date.day) \(month) \(date.year)\(nbsp)هـ", lang)
    : "\(date.day) \(month) \(date.year)\(nbsp)AH"
}

public func formatGregorian(_ date: GregorianDate, _ lang: Lang) -> String {
  let month = gregorianMonthName(date.month, lang)
  return lang == .ar
    ? localizeDigits("\(date.day) \(month) \(date.year)\(nbsp)م", lang)
    : "\(date.day) \(month) \(date.year)"
}

public func formatWeekday(_ date: GregorianDate, _ lang: Lang) -> String {
  weekdayName(weekdayOfJdn(gregorianToJdn(date)), lang)
}

/// "62%" / "٦٢٪".
public func formatPercent(_ percent: Int, _ lang: Lang) -> String {
  lang == .ar ? "\(localizeDigits(percent, lang))٪" : "\(percent)%"
}

/// One decimal place: "7.4" / "٧٫٤".
public func formatDecimal(_ value: Double, _ lang: Lang) -> String {
  let s = toFixed(value, 1)
  return lang == .ar ? localizeDigits(s.replacingOccurrences(of: ".", with: "٫"), lang) : s
}

/// Local wall-clock time, 24h "18:42" (Arabic digits in Arabic).
public func formatTime(_ epochMs: Int, _ lang: Lang, timeZone: TimeZone = .current) -> String {
  var calendar = Calendar(identifier: .gregorian)
  calendar.timeZone = timeZone
  let c = calendar.dateComponents([.hour, .minute], from: Date(timeIntervalSince1970: Double(epochMs) / 1000))
  return localizeDigits(String(format: "%02ld:%02ld", c.hour!, c.minute!), lang)
}

/// "2026-10-26" — for file names and logs, not for display.
public func isoDate(_ date: GregorianDate) -> String {
  String(format: "%04ld-%02ld-%02ld", date.year, date.month, date.day)
}
