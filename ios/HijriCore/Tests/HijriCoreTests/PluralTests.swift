import XCTest
@testable import HijriCore

/// Port of v1's plural.test.ts (and the Android PluralTest).
final class PluralTests: XCTestCase {
  func testArabicDualIsNominativeOnItsOwnAndGenitiveAfterAPreposition() {
    XCTAssertEqual(countPhrase(.day, 2, .ar), "يومان")
    XCTAssertEqual(countPhrase(.day, 2, .ar, afterPreposition: true), "يومين")
    XCTAssertEqual(countPhrase(.month, 2, .ar, afterPreposition: true), "شهرين")
    XCTAssertEqual(countPhrase(.year, 2, .ar, afterPreposition: true), "سنتين")
    XCTAssertEqual(countPhrase(.week, 2, .ar, afterPreposition: true), "أسبوعين")
  }

  func testOtherCountsReadTheSameEitherWay() {
    for n in [1, 3, 10, 11, 19, 100] {
      XCTAssertEqual(countPhrase(.day, n, .ar, afterPreposition: true), countPhrase(.day, n, .ar))
    }
    XCTAssertEqual(countPhrase(.day, 19, .ar), "١٩ يومًا")
    XCTAssertEqual(countPhrase(.day, 3, .ar), "٣ أيام")
    XCTAssertEqual(countPhrase(.day, 2, .en, afterPreposition: true), "2 days")
  }

  func testSpanPhraseJoinsTheNonZeroParts() {
    XCTAssertEqual(spanPhrase(YmdSpan(25, 7, 3), .en), "25 years, 7 months and 3 days")
    XCTAssertEqual(spanPhrase(YmdSpan(2, 0, 1), .ar), "سنتان ويوم واحد")
    XCTAssertEqual(spanPhrase(YmdSpan(0, 0, 0), .en), "0 days")
  }

  func testNumbersAreGrouped() {
    XCTAssertEqual(formatNumber(9780, .en), "9,780")
    XCTAssertEqual(formatNumber(9780, .ar), "٩٬٧٨٠")
    XCTAssertEqual(formatNumber(1_234_567, .en), "1,234,567")
    XCTAssertEqual(formatNumber(-12, .en), "-12")
    XCTAssertEqual(formatNumber(999, .en), "999")
  }
}
