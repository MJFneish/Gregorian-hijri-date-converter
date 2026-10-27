import Foundation

/// Counted phrases ("3 years", "٣ سنوات") built by hand: Arabic needs all six CLDR forms
/// (zero/one/two/few/many/other) to read naturally, plus the genitive dual after a preposition.
public enum CountUnit: Sendable {
  case year, month, week, day
}

private struct ArabicForms {
  let one: String, two: String, few: String, many: String, other: String
}

private let arForms: [CountUnit: ArabicForms] = [
  .year: ArabicForms(one: "سنة واحدة", two: "سنتان", few: "{n} سنوات", many: "{n} سنة", other: "{n} سنة"),
  .month: ArabicForms(one: "شهر واحد", two: "شهران", few: "{n} أشهر", many: "{n} شهرًا", other: "{n} شهر"),
  .week: ArabicForms(one: "أسبوع واحد", two: "أسبوعان", few: "{n} أسابيع", many: "{n} أسبوعًا", other: "{n} أسبوع"),
  .day: ArabicForms(one: "يوم واحد", two: "يومان", few: "{n} أيام", many: "{n} يومًا", other: "{n} يوم"),
]

/// The dual after a preposition (بعد يومين، إلى يومين، بـيومين) — genitive, not the nominative يومان.
private let arDualGenitive: [CountUnit: String] = [.year: "سنتين", .month: "شهرين", .week: "أسبوعين", .day: "يومين"]

private let enWords: [CountUnit: (String, String)] = [
  .year: ("year", "years"), .month: ("month", "months"), .week: ("week", "weeks"), .day: ("day", "days"),
]

/// "9,780" / "٩٬٧٨٠".
public func formatNumber(_ n: Int, _ lang: Lang) -> String {
  let digits = Array(String(n.magnitude))
  let separator: Character = lang == .ar ? "٬" : ","
  var grouped = ""
  for (i, c) in digits.enumerated() {
    if i > 0 && (digits.count - i) % 3 == 0 { grouped.append(separator) }
    grouped.append(c)
  }
  return localizeDigits((n < 0 ? "-" : "") + grouped, lang)
}

private func arabicForm(_ forms: ArabicForms, _ n: Int) -> String {
  let mod100 = n % 100
  if n == 1 { return forms.one }
  if n == 2 { return forms.two }
  if (3 ... 10).contains(mod100) { return forms.few }
  if (11 ... 99).contains(mod100) { return forms.many }
  return forms.other
}

/// "3 days" / "٣ أيام". Pass `afterPreposition` when the phrase follows بعد / إلى / بـ in the
/// template ("بعد {{days}}"): Arabic then needs the genitive dual (يومين, not يومان).
public func countPhrase(_ unit: CountUnit, _ n: Int, _ lang: Lang, afterPreposition: Bool = false) -> String {
  if lang == .ar {
    let forms = arForms[unit]!
    if n == 0 { return "\(localizeDigits(0, .ar)) \(forms.other.replacingOccurrences(of: "{n} ", with: ""))" }
    if n == 2 && afterPreposition { return arDualGenitive[unit]! }
    return arabicForm(forms, n).replacingOccurrences(of: "{n}", with: formatNumber(n, .ar))
  }
  let (one, many) = enWords[unit]!
  return "\(formatNumber(n, .en)) \(n == 1 ? one : many)"
}

/// Joins non-zero parts: "2 years, 3 months and 5 days" / "سنتان و٣ أشهر و٥ أيام".
public func joinParts(_ parts: [String], _ lang: Lang) -> String {
  if parts.count <= 1 { return parts.joined() }
  if lang == .ar { return parts.joined(separator: " و") }
  return "\(parts.dropLast().joined(separator: ", ")) and \(parts.last!)"
}

/// "25 years, 7 months and 3 days" / "٢٥ سنة و٧ أشهر و٣ أيام"; zero parts are left out.
public func spanPhrase(_ span: YmdSpan, _ lang: Lang) -> String {
  var parts: [String] = []
  if span.years > 0 { parts.append(countPhrase(.year, span.years, lang)) }
  if span.months > 0 { parts.append(countPhrase(.month, span.months, lang)) }
  if span.days > 0 { parts.append(countPhrase(.day, span.days, lang)) }
  return parts.isEmpty ? countPhrase(.day, 0, lang) : joinParts(parts, lang)
}
