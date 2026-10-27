import XCTest
@testable import HijriCore

/// Port of v1's calendar.test.ts (and the Android CalendarTest).
final class CalendarTests: XCTestCase {
  func testKnownJdnAnchors() {
    XCTAssertEqual(gregorianToJdn(GregorianDate(2000, 1, 1)), 2_451_545)
    XCTAssertEqual(gregorianToJdn(GregorianDate(2002, 3, 22)), 2_452_356)
    XCTAssertEqual(jdnToGregorian(2_452_356), GregorianDate(2002, 3, 22))
  }

  func testRoundTripsEveryDay1800To2200AndAgreesWithFoundationOnWeekdays() {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "UTC")!
    for jdn in gregorianToJdn(GregorianDate(1800, 1, 1)) ... gregorianToJdn(GregorianDate(2200, 12, 31)) {
      let g = jdnToGregorian(jdn)
      XCTAssertEqual(gregorianToJdn(g), jdn)
      if jdn % 97 == 0 {
        let date = calendar.date(from: DateComponents(year: g.year, month: g.month, day: g.day))!
        XCTAssertEqual(weekdayOfJdn(jdn), calendar.component(.weekday, from: date) - 1)
      }
    }
  }

  func testMonthLengthsInclLeapYears() {
    XCTAssertEqual(gregorianMonthLength(2024, 2), 29)
    XCTAssertEqual(gregorianMonthLength(1900, 2), 28)
    XCTAssertEqual(gregorianMonthLength(2000, 2), 29)
    XCTAssertEqual(gregorianMonthLength(2026, 4), 30)
  }

  private func g(_ from: String, _ to: String) -> YmdSpan {
    spanBetween(iso(from), iso(to), monthLength: gregorianMonthLength, toJdn: { y, m, d in gregorianToJdn(y, m, d) })
  }

  func testSpanBetweenCountsWholeYearsMonthsAndRemainingDays() {
    XCTAssertEqual(g("2000-01-15", "2026-10-20"), YmdSpan(26, 9, 5))
    XCTAssertEqual(g("2026-10-20", "2026-10-20"), YmdSpan(0, 0, 0))
    XCTAssertEqual(g("2026-01-31", "2026-03-01"), YmdSpan(0, 1, 1))
    XCTAssertEqual(g("2024-02-29", "2025-02-28"), YmdSpan(0, 11, 30))
  }

  func testSpanBetweenWorksInTheHijriCalendarToo() {
    let span = spanBetween(
      HijriDate(1423, 1, 8),
      HijriDate(1448, 5, 9),
      monthLength: { y, m in hijriMonthLength(y, m, .iran) },
      toJdn: { y, m, d in jdnFromHijri(HijriDate(y, m, d), .iran) }
    )
    XCTAssertEqual(span, YmdSpan(25, 4, 1))
  }

  func testOccasionsFindAshuraAndEidAlGhadir() {
    XCTAssertEqual(occasionsOn(HijriDate(1448, 1, 10), 30).map(\.nameEn), ["Ashura — Martyrdom of Imam Husayn (AS)"])
    XCTAssertEqual(occasionsOn(HijriDate(1448, 12, 18), 29).count, 1)
    XCTAssertEqual(occasionsOn(HijriDate(1448, 1, 11), 30).count, 0)
  }

  func testImamAlRidasMartyrdomIsOnTheLastDayOfSafar() {
    let rida = "Martyrdom of Imam Ali al-Rida (AS)"
    XCTAssertTrue(occasionsOn(HijriDate(1448, 2, 29), 29).map(\.nameEn).contains(rida))
    XCTAssertFalse(occasionsOn(HijriDate(1448, 2, 29), 30).map(\.nameEn).contains(rida))
    XCTAssertTrue(occasionsOn(HijriDate(1448, 2, 30), 30).map(\.nameEn).contains(rida))
  }

  func testMaghribMatchesAlSiratsPublishedBeirutMaghribWithinAMinute() throws {
    // 2026-07-12 20:11 UTC+3
    let m = try XCTUnwrap(maghribInstant(GregorianDate(2026, 7, 12)))
    let minutesUtc = Double(m - utcMidnightMs(GregorianDate(2026, 7, 12))) / 60_000
    XCTAssertLessThanOrEqual(abs(minutesUtc - Double(17 * 60 + 11)), 1)
  }

  func testFormattingUsesArabicIndicDigitsInArabic() {
    XCTAssertEqual(localizeDigits("1423", .ar), "١٤٢٣")
    // U+00A0 keeps the year and its era marker on one line when a long date wraps.
    XCTAssertEqual(formatHijri(HijriDate(1423, 1, 8), .ar), "٨ محرّم ١٤٢٣\u{00A0}هـ")
    XCTAssertEqual(formatHijri(HijriDate(1423, 1, 8), .en), "8 Muharram 1423\u{00A0}AH")
    XCTAssertEqual(formatGregorian(GregorianDate(2002, 3, 22), .en), "22 March 2002")
    XCTAssertEqual(formatGregorian(GregorianDate(2002, 3, 22), .ar), "٢٢ آذار ٢٠٠٢\u{00A0}م")
  }

  func testDecimalsAndPercentsRoundLikeJs() {
    XCTAssertEqual(formatDecimal(7.35, .en), "7.3") // 7.35 is 7.3499999… in binary: JS says "7.3" too
    XCTAssertEqual(formatDecimal(7.46, .ar), "٧٫٥")
    XCTAssertEqual(toFixed(0.25, 1), "0.3")
    XCTAssertEqual(formatPercent(62, .en), "62%")
    XCTAssertEqual(formatPercent(62, .ar), "٦٢٪")
    XCTAssertEqual(isoDate(GregorianDate(2026, 10, 5)), "2026-10-05")
  }
}
