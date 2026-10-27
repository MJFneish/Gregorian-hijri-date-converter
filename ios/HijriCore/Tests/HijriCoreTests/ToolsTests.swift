import XCTest
@testable import HijriCore

/// Ports of v1's birthday, compare, fasting and today tests (and the Android ToolsTest).
final class ToolsTests: XCTestCase {
  // MARK: - hijriBirthday

  func testBirthdayBornOnTheUsersExampleDay() {
    let o = opts(.fadlallah)
    let today = jdnOf("2026-10-26")
    let b = hijriBirthday(jdnOf("2002-03-22"), today, o)
    XCTAssertEqual(b.birthHijri, HijriDate(1423, 1, 8))
    // Today is 15 Jumada al-Awwal 1448 under Fadlallah: the next one is 8 Muharram 1449, turning 26.
    XCTAssertEqual(b.next.hijri, HijriDate(1449, 1, 8))
    XCTAssertEqual(b.next.turning, 26)
    XCTAssertEqual(b.next.jdn, jdnOfHijri(HijriDate(1449, 1, 8), o))
    XCTAssertEqual(b.hijriAge.years, 25)
    XCTAssertEqual(b.gregorianAge, YmdSpan(24, 7, 4))
  }

  func testBirthdayNextIsTheFirstMatchingDateOnOrAfterToday() {
    let today = jdnOf("2026-10-26")
    for method in MethodId.allCases {
      let o = opts(method)
      for birth in stride(from: jdnOf("1950-01-01"), to: today, by: 97) {
        let b = hijriBirthday(birth, today, o)
        XCTAssertGreaterThanOrEqual(b.next.jdn, today)
        XCTAssertEqual(b.next.inDays, b.next.jdn - today)
        XCTAssertLessThan(b.next.inDays, 356)
        XCTAssertEqual(hijriOfJdn(b.next.jdn, o), b.next.hijri)
        XCTAssertEqual(b.next.hijri.month, b.birthHijri.month)
        XCTAssertEqual(b.next.hijri.day, b.next.clamped ? 29 : b.birthHijri.day)
        XCTAssertEqual(b.next.turning, b.next.hijri.year - b.birthHijri.year)
        // The year before is already past.
        let prevYear = b.next.hijri.year - 1
        let prevDay = min(b.birthHijri.day, hijriMonthLength(prevYear, b.birthHijri.month, method))
        XCTAssertLessThan(jdnOfHijri(HijriDate(prevYear, b.birthHijri.month, prevDay), o), today)
      }
    }
  }

  func testBirthdayTodayGivesZeroDays() {
    let o = opts(.iran)
    let today = jdnOf("2026-10-26")
    let birth = jdnOfHijri(hijriOfJdn(today, o).withYear(1420), o)
    let b = hijriBirthday(birth, today, o)
    XCTAssertEqual(b.next.inDays, 0)
    XCTAssertEqual(b.next.turning, 28)
  }

  // MARK: - compareOffices

  func testCompareTheUsersExampleDay() {
    let rows = compareOffices(jdnOf("2002-03-22"), .iran)
    let byMethod = Dictionary(uniqueKeysWithValues: rows.map { ($0.method, $0) })
    XCTAssertEqual(rows.map(\.method), MethodId.allCases)
    XCTAssertEqual(byMethod[.iran]!.hijri, HijriDate(1423, 1, 7))
    XCTAssertEqual(byMethod[.iran]!.offset, 0)
    XCTAssertEqual(byMethod[.fadlallah]!.hijri, HijriDate(1423, 1, 8))
    XCTAssertEqual(byMethod[.fadlallah]!.offset, 1)
    XCTAssertEqual(byMethod[.ummalqura]!.offset, 1)
    // Iran started 1423 on Sat 16 Mar 2002.
    XCTAssertEqual(byMethod[.iran]!.monthStart, jdnOf("2002-03-16"))
  }

  func testCompareOffsetsFlipSignWhenTheReferenceChanges() {
    let rows = compareOffices(jdnOf("2002-03-22"), .fadlallah)
    XCTAssertEqual(rows.first { $0.method == .iran }!.offset, -1)
    XCTAssertEqual(rows.first { $0.method == .fadlallah }!.offset, 0)
  }

  func testCompareEveryOffsetSaysWhenTheReferenceReachesTheSameDate() {
    let first = jdnOf("2024-01-01")
    for jdn in first ..< first + 3 * 365 {
      for reference in MethodId.allCases {
        for row in compareOffices(jdn, reference) {
          XCTAssertLessThanOrEqual(abs(row.offset), 3)
          if row.hijri.day <= 29 {
            // The reference shows this office's date `offset` days later.
            XCTAssertEqual(hijriFromJdn(jdn + row.offset, reference), row.hijri)
          }
          XCTAssertEqual(jdnFromHijri(row.hijri.withDay(1), row.method), row.monthStart)
          XCTAssertEqual(jdn - row.monthStart, row.hijri.day - 1)
        }
      }
    }
  }

  // MARK: - Fasting days

  func testFastingThreeDaysEachMonthOnceAMonthNeverOnRamadanOrAnEid() {
    let from = jdnOf("2024-01-01")
    let to = jdnOf("2029-01-01")
    for method in MethodId.allCases {
      let o = opts(method)
      var perMonth: [YearMonth: [FastReason: Int]] = [:]
      for f in fastingDays(from, to, o) {
        let key = YearMonth(year: f.day.hijri.year, month: f.day.hijri.month)
        for r in f.reasons { perMonth[key, default: [:]][r, default: 0] += 1 }
        let month = f.day.hijri.month
        let d = f.day.hijri.day
        XCTAssertNotEqual(month, 9)
        XCTAssertFalse(month == 10 && d == 1)
        XCTAssertFalse(month == 12 && d == 10)
        if month == 1 && d == 10 { XCTAssertEqual(f.reasons, [.ashuraAbstain]) }
        if f.reasons.contains(.firstThursday) { XCTAssertLessThanOrEqual(d, 7) }
        if f.reasons.contains(.middleWednesday) { XCTAssertTrue((11 ... 17).contains(d)) }
        if f.reasons.contains(.lastThursday) { XCTAssertGreaterThan(d + 7, hijriMonthLength(f.day.hijri.year, month, method)) }
      }
      for (key, counts) in perMonth {
        // Skip the partial months at the window's edges.
        let start = jdnOfHijri(HijriDate(key.year, key.month, 1), o)
        if start < from || start + hijriMonthLength(key.year, key.month, method) > to { continue }
        // An Eid can swallow one of them (a first Thursday on 1 Shawwal).
        let eidMonth = key.month == 10 || key.month == 12
        if !eidMonth { XCTAssertEqual(counts[.firstThursday] ?? 0, 1, "\(method) \(key)") }
        XCTAssertEqual(counts[.middleWednesday], 1, "\(method) \(key)")
        XCTAssertEqual(counts[.lastThursday], 1, "\(method) \(key)")
        XCTAssertEqual(counts[.whiteDays], 3, "\(method) \(key)")
      }
    }
  }

  func testFastingDatedDaysLandWhereTheSourcesPutThem() {
    func at(_ month: Int, _ day: Int) -> [FastReason] { fastReasons(HijriDate(1448, month, day), 0, 30) }
    XCTAssertTrue(at(7, 27).contains(.mabath))
    XCTAssertTrue(at(3, 17).contains(.mawlid))
    XCTAssertTrue(at(11, 25).contains(.dahwAlArd))
    XCTAssertTrue(at(12, 18).contains(.ghadir))
    XCTAssertTrue(at(12, 24).contains(.mubahala))
    XCTAssertTrue(at(12, 9).contains(.arafah))
    XCTAssertEqual(at(12, 10), [])
    XCTAssertEqual(at(10, 1), [])
    XCTAssertEqual(at(9, 14), [])
    XCTAssertEqual(at(1, 10), [.ashuraAbstain])
    XCTAssertEqual(at(12, 3), [.dhulHijjahDays])
    XCTAssertEqual(at(10, 6), [.shawwalDays])
    XCTAssertEqual(sistaniOnly, [.dhulHijjahDays, .muharramDays, .shawwalDays])
  }

  func testFastingMonthsAheadGivesTheFirstOfALaterMonth() {
    let o = opts(.iran)
    let today = jdnOf("2026-10-26") // 14 Jumada al-Awwal 1448
    XCTAssertEqual(monthsAhead(today, 0, o), jdnOfHijri(HijriDate(1448, 5, 1), o))
    XCTAssertEqual(monthsAhead(today, 3, o), jdnOfHijri(HijriDate(1448, 8, 1), o))
    XCTAssertEqual(monthsAhead(today, 8, o), jdnOfHijri(HijriDate(1449, 1, 1), o))
  }

  // MARK: - Upcoming occasions / today

  func testOccasionsEveryOccasionExactlyOnceOverTheComingHijriYear() {
    let starts = ["2026-10-26", "2026-03-20", "2025-07-06", "2030-01-01"].map(jdnOf)
    for method in MethodId.allCases {
      for from in starts {
        let list = upcomingOccasions(from, opts(method))
        XCTAssertEqual(list.count, occasions.count)
        XCTAssertEqual(Set(list.map(\.occasion)).count, occasions.count)
        for i in 1 ..< list.count { XCTAssertGreaterThanOrEqual(list[i].day.jdn, list[i - 1].day.jdn) }
        for u in list {
          XCTAssertEqual(u.inDays, u.day.jdn - from)
          XCTAssertTrue(u.day.occasions.contains(u.occasion))
        }
      }
    }
  }

  func testOccasionsListStartsWithTheTodayCardsNextOccasion() {
    let zone = TimeZone(identifier: "Asia/Beirut")!
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = zone
    let now = Int(calendar.date(from: DateComponents(year: 2026, month: 10, day: 26, hour: 10))!.timeIntervalSince1970 * 1000)
    let o = opts(.iran)
    let next = todaySummary(now, o, timeZone: zone).next
    let first = upcomingOccasions(gregorianToJdn(GregorianDate(2026, 10, 26)), o).first { $0.inDays > 0 }
    XCTAssertEqual(next?.day.jdn, first?.day.jdn)
  }

  func testTodayTheEveAppearsAfterBeirutsMaghribOnly() {
    let zone = TimeZone(identifier: "Asia/Beirut")!
    let o = opts(.iran)
    let maghrib = maghribInstant(GregorianDate(2026, 10, 26))!
    XCTAssertNil(todaySummary(maghrib - 60_000, o, timeZone: zone).eve)
    let eve = todaySummary(maghrib + 60_000, o, timeZone: zone)
    XCTAssertEqual(eve.eve?.jdn, eve.today.jdn + 1)
    XCTAssertEqual(eve.maghrib, maghrib)
  }
}
