import XCTest
@testable import HijriCore

/// Port of v1's hijri.test.ts (and the Android HijriTest).
final class HijriTests: XCTestCase {
  // MARK: - The user's ground truth: 2002-03-22 = Friday 8 Muharram 1423

  func testTheExampleDayIsAFriday() {
    XCTAssertEqual(weekdayOfJdn(jdnOf("2002-03-22")), 5)
  }

  func testTheExampleIs8Muharram1423UnderFadlallah() {
    XCTAssertEqual(gregorianToHijri(iso("2002-03-22"), opts(.fadlallah)), HijriDate(1423, 1, 8))
  }

  func testTheExampleIs7Muharram1423InIransOfficialCalendar() {
    // 1 Muharram was Sat 16 Mar there.
    XCTAssertEqual(gregorianToHijri(iso("2002-03-22"), opts(.iran)), HijriDate(1423, 1, 7))
    XCTAssertEqual(hijriToGregorian(HijriDate(1423, 1, 1), opts(.iran)), iso("2002-03-16"))
  }

  func testTheExampleConvertsBack() {
    XCTAssertEqual(hijriToGregorian(HijriDate(1423, 1, 8), opts(.fadlallah)), iso("2002-03-22"))
  }

  // MARK: - Fadlallah office announcements

  func testFadlallahOfficeAnnouncements() {
    // [Hijri month, first day as announced by Sayyed Fadlallah's office]
    let known: [(Int, Int, String)] = [
      (1423, 1, "2002-03-15"),
      (1432, 9, "2011-08-01"),
      (1435, 10, "2014-07-28"),
      (1446, 10, "2025-03-30"),
      (1447, 10, "2026-03-20"),
    ]
    for (year, month, first) in known {
      XCTAssertEqual(hijriToGregorian(HijriDate(year, month, 1), opts(.fadlallah)), iso(first), "\(year)/\(month)")
    }
  }

  // MARK: - Iran official table vs every published month start

  private lazy var qamariRows: [(Int, Int, String)] = {
    let text = try! String(contentsOf: repoFile("android/scripts/data/qamari-consolidated.txt"), encoding: .utf8)
    let line = try! NSRegularExpression(pattern: "^\\*?([0-9]{4})/([0-9]{1,2}) ([0-9]{4}-[0-9]{2}-[0-9]{2})")
    return text.split(whereSeparator: \.isNewline).compactMap { raw in
      let s = String(raw)
      guard let m = line.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) else { return nil }
      let group = { (i: Int) in String(s[Range(m.range(at: i), in: s)!]) }
      return (Int(group(1))!, Int(group(2))!, group(3))
    }.filter { $0.0 >= tableFirstYear }
  }()

  func testQamariCoversTheWholePublishedRange() {
    XCTAssertGreaterThan(qamariRows.count, 1250)
  }

  func testIranOfficialTableReproducesEveryPublishedMonthStart() {
    let mismatches = qamariRows.filter { year, month, first in
      jdnFromHijri(HijriDate(year, month, 1), .iran) != jdnOf(first)
    }
    XCTAssertTrue(mismatches.isEmpty, "\(mismatches)")
  }

  func testLabelsPublishedMonthsOfficialAndLaterOnesCalculated() {
    XCTAssertEqual(hijriSource(HijriDate(1447, 10, 1), .iran), .official)
    XCTAssertEqual(hijriSource(HijriDate(1448, 1, 1), .iran), .calculated)
    XCTAssertEqual(hijriSource(HijriDate(1423, 1, 1), .fadlallah), .calculated)
    XCTAssertEqual(hijriSource(HijriDate(1320, 1, 1), .iran), .approximate)
  }

  // MARK: - ICU references (v1 read them through Intl; Foundation's calendars are ICU's)

  private func icu(_ identifier: Calendar.Identifier, _ jdn: Int) -> HijriDate {
    var calendar = Calendar(identifier: identifier)
    calendar.timeZone = TimeZone(identifier: "UTC")!
    let c = calendar.dateComponents([.year, .month, .day], from: Date(timeIntervalSince1970: Double(noonUtc(jdn)) / 1000))
    return HijriDate(c.year!, c.month!, c.day!)
  }

  func testUmmAlQuraTableMatchesIcuForEveryDay1990To2050() {
    var bad: [String] = []
    for jdn in jdnOf("1990-01-01") ... jdnOf("2050-12-31") where hijriFromJdn(jdn, .ummalqura) != icu(.islamicUmmAlQura, jdn) {
      bad.append(isoDate(jdnToGregorian(jdn)))
    }
    XCTAssertTrue(bad.isEmpty, "\(bad.prefix(20))")
  }

  func testArithmeticFallbackMatchesIcuIslamicCivil() {
    for (from, to) in [("1880-01-01", "1923-12-31"), ("2078-01-01", "2100-12-31")] {
      for jdn in stride(from: jdnOf(from), through: jdnOf(to), by: 7) {
        XCTAssertEqual(tabularFromJdn(jdn), icu(.islamicCivil, jdn), isoDate(jdnToGregorian(jdn)))
      }
    }
  }

  func testTheFallbackIsUsedOutsideTheTableAndStillRoundTrips() {
    let date = HijriDate(1320, 5, 10)
    XCTAssertEqual(gregorianToHijri(hijriToGregorian(date, opts(.iran)), opts(.iran)), date)
  }

  // MARK: - Table integrity, every method

  func testEveryMonthIs29Or30DaysAndEveryYear353To356() {
    // Sighting-based years can be 353 or 356 days (arithmetic calendars only ever give 354/355);
    // Iran's real published calendar contains such years, so that range is the correct invariant.
    for method in MethodId.allCases {
      for y in tableFirstYear ... tableLastYear {
        var yearLength = 0
        for m in 1 ... 12 {
          let len = hijriMonthLength(y, m, method)
          XCTAssertTrue(len == 29 || len == 30, "\(method) \(y)/\(m)")
          yearLength += len
        }
        XCTAssertTrue((353 ... 356).contains(yearLength), "\(method) \(y): \(yearLength)")
      }
    }
  }

  func testRoundTripsForEveryDayInRangeEveryMethod() {
    for method in MethodId.allCases {
      let first = jdnFromHijri(HijriDate(tableFirstYear, 1, 1), method)
      let last = jdnFromHijri(HijriDate(tableLastYear, 12, hijriMonthLength(tableLastYear, 12, method)), method)
      var failures = 0
      for jdn in first - 400 ... last + 400 where jdnFromHijri(hijriFromJdn(jdn, method), method) != jdn {
        failures += 1
      }
      XCTAssertEqual(failures, 0, "\(method)")
    }
  }

  func testMethodsNeverDisagreeByMoreThan2Days() {
    for jdn in stride(from: jdnOf("1950-01-01"), through: jdnOf("2070-12-31"), by: 3) {
      let reference = jdnFromHijri(hijriFromJdn(jdn, .iran), .fadlallah)
      XCTAssertLessThanOrEqual(abs(reference - jdn), 2)
    }
  }

  // MARK: - Manual adjustment

  func testManualAdjustmentShiftsTheHijriDateAndTheReverseConversionUndoesIt() {
    let g = iso("2002-03-22")
    XCTAssertEqual(gregorianToHijri(g, opts(.fadlallah, 1)), HijriDate(1423, 1, 9))
    XCTAssertEqual(gregorianToHijri(g, opts(.fadlallah, -2)), HijriDate(1423, 1, 6))
    for adjustment in -2 ... 2 {
      XCTAssertEqual(hijriToGregorian(gregorianToHijri(g, opts(.iran, adjustment)), opts(.iran, adjustment)), g)
    }
  }
}
