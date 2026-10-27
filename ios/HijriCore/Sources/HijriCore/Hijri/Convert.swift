import Foundation

/// Picker ranges. Dates outside the precomputed tables (1343–1500 AH) still convert, via the
/// arithmetic fallback, and are labelled "approximate".
public let hijriMinYear = 1300
public let hijriMaxYear = 1500
public let gregorianMinYear = 1883
public let gregorianMaxYear = 2077

// MARK: - JDN-level primitives (no adjustment)

/// Outside the table the arithmetic calendar takes over — but shifted so it continues seamlessly
/// from the table's first/last month. Unshifted, the two can disagree by a day at the seam, which
/// made one Gregorian day map to "1 Muharram 1343" twice (once per side) and broke round-trips.
private func seamOffsets(_ method: MethodId) -> (before: Int, after: Int) {
  let bounds = tableBounds(method)
  return (
    before: bounds.start - tabularToJdn(HijriDate(GeneratedTables.firstYear, 1, 1)),
    after: bounds.end - tabularToJdn(HijriDate(GeneratedTables.lastYear + 1, 1, 1))
  )
}

public func hijriFromJdn(_ jdn: Int, _ method: MethodId) -> HijriDate {
  if let date = tableLookup(method, jdn) { return date }
  let seams = seamOffsets(method)
  return tabularFromJdn(jdn < tableBounds(method).start ? jdn - seams.before : jdn - seams.after)
}

public func jdnFromHijri(_ date: HijriDate, _ method: MethodId) -> Int {
  if let start = tableMonthStart(method, date.year, date.month) { return start + date.day - 1 }
  let seams = seamOffsets(method)
  return tabularToJdn(date) + (date.year < GeneratedTables.firstYear ? seams.before : seams.after)
}

/// 29 or 30.
public func hijriMonthLength(_ year: Int, _ month: Int, _ method: MethodId) -> Int {
  tableMonthLength(method, year, month) ?? tabularMonthLength(year, month)
}

// MARK: - Public conversion API (with the user's adjustment applied)

public func gregorianToHijri(_ date: GregorianDate, _ opts: ConversionOptions) -> HijriDate {
  hijriFromJdn(gregorianToJdn(date) + opts.adjustment, opts.method)
}

public func hijriToGregorian(_ date: HijriDate, _ opts: ConversionOptions) -> GregorianDate {
  jdnToGregorian(jdnFromHijri(date, opts.method) - opts.adjustment)
}

/// Hijri date of a JDN under the user's options — the form the UI mostly works with.
public func hijriOfJdn(_ jdn: Int, _ opts: ConversionOptions) -> HijriDate {
  hijriFromJdn(jdn + opts.adjustment, opts.method)
}

public func jdnOfHijri(_ date: HijriDate, _ opts: ConversionOptions) -> Int {
  jdnFromHijri(date, opts.method) - opts.adjustment
}

public func isValidHijri(_ date: HijriDate, _ method: MethodId) -> Bool {
  (1 ... 12).contains(date.month) && date.day >= 1 && date.day <= hijriMonthLength(date.year, date.month, method)
}

public func isValidGregorian(_ date: GregorianDate) -> Bool {
  (1 ... 12).contains(date.month) && date.day >= 1 && date.day <= gregorianMonthLength(date.year, date.month)
}

/// How trustworthy a Hijri date is under a method — see `DateSource`.
public func hijriSource(_ date: HijriDate, _ method: MethodId) -> DateSource {
  if !isYearInTable(date.year) { return .approximate }
  switch method {
  case .ummalqura:
    return .official
  case .iran:
    // From the tables in use (a downloaded update can move this cutoff).
    let last = iranLastOfficial()
    let official = date.year < last.year || (date.year == last.year && date.month <= last.month)
    return official ? .official : .calculated
  default:
    return .calculated
  }
}
