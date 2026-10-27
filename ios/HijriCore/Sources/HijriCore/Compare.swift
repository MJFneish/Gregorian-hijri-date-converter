import Foundation

/// One office's reading of a day (Tools → Compare offices).
public struct OfficeDate: Hashable, Sendable {
  public let method: MethodId
  public let hijri: HijriDate
  public let source: DateSource
  /// How many days this office's calendar runs ahead (+) of or behind (−) the reference office's on
  /// this day: +1 = it shows today the date the reference shows tomorrow.
  public let offset: Int
  /// JDN of day 1 of the month this office is in, and that month's length.
  public let monthStart: Int
  public let monthLength: Int
}

private func nextMonth(_ date: HijriDate) -> HijriDate {
  date.month == 12 ? HijriDate(date.year + 1, 1, 1) : HijriDate(date.year, date.month + 1, 1)
}

/// Days office `method` is ahead of `reference` on `jdn`, from the date labels: find the day the
/// reference shows the same date. When it never does (e.g. the office is on the 30th of a month the
/// reference keeps at 29 days), compare when the two start the office's next month instead.
private func offsetOf(_ jdn: Int, _ hijri: HijriDate, _ method: MethodId, _ reference: MethodId) -> Int {
  for k in [0, 1, -1, 2, -2, 3, -3] where hijriFromJdn(jdn + k, reference) == hijri {
    return k
  }
  let next = nextMonth(hijri)
  return jdnFromHijri(next, reference) - jdnFromHijri(next, method)
}

/// Every office's date for one day, in `MethodId` order, measured against `reference` (the user's
/// chosen method). The manual ±day adjustment is deliberately not applied: each row is that
/// office's own calendar.
public func compareOffices(_ jdn: Int, _ reference: MethodId) -> [OfficeDate] {
  MethodId.allCases.map { method in
    let hijri = hijriFromJdn(jdn, method)
    return OfficeDate(
      method: method,
      hijri: hijri,
      source: hijriSource(hijri, method),
      offset: method == reference ? 0 : offsetOf(jdn, hijri, method, reference),
      monthStart: jdnFromHijri(hijri.withDay(1), method),
      monthLength: hijriMonthLength(hijri.year, hijri.month, method)
    )
  }
}
