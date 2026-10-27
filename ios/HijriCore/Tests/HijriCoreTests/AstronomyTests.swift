import CAstronomy
import XCTest
@testable import HijriCore

/// Ports of v1's crescent.test.ts and moon.test.ts (the reference is Astronomy Engine).
final class AstronomyTests: XCTestCase {
  // MARK: - Crescent visibility reproduces the build-time tables

  func testSistaniMonthHas29DaysExactlyWhenNakedEyeVisibleFromNajafOnThe29thsEvening() {
    for year in 1440 ... 1450 {
      for month in 1 ... 12 {
        let day29 = jdnFromHijri(HijriDate(year, month, 1), .sistani) + 28
        let report = crescentAt(day29, najaf, conjunctionNear(noonUtc(day29)))
        XCTAssertEqual((report.v ?? -.infinity) >= vNakedEye, hijriMonthLength(year, month, .sistani) == 29, "\(year)/\(month)")
      }
    }
  }

  func testIranPredictedMonthsHave29DaysExactlyWhenVisibleFromAnyOfThe6Cities() {
    let last = GeneratedTables.iranLastOfficial
    for year in last.year ... 1450 {
      for month in 1 ... 12 {
        if year == last.year && month <= last.month { continue }
        let day29 = jdnFromHijri(HijriDate(year, month, 1), .iran) + 28
        let report = bestOf(day29, iranCities, conjunctionNear(noonUtc(day29))).report
        XCTAssertEqual((report.v ?? -.infinity) >= vMaybeEye, hijriMonthLength(year, month, .iran) == 29, "\(year)/\(month)")
      }
    }
  }

  func testMonthStartForecastCoversThe29thAnd30thEveningsAndEveryOfficesFirst() throws {
    let f = monthStartForecast(YearMonth(year: 1448, month: 5), opts(.iran))
    XCTAssertEqual(f.starting, YearMonth(year: 1448, month: 6))
    let first = jdnFromHijri(HijriDate(1448, 5, 1), .iran)
    XCTAssertEqual(f.evenings.map(\.monthDay), [29, 30])
    XCTAssertEqual(f.evenings.map(\.jdn), [first + 28, first + 29])
    XCTAssertEqual(f.starts.map(\.method), MethodId.allCases)
    for s in f.starts { XCTAssertEqual(s.jdn, jdnFromHijri(HijriDate(1448, 6, 1), s.method)) }
    // The new moon of 9 Nov 2026 (07:02 UTC) is the one found.
    let conjunction = try XCTUnwrap(f.conjunction)
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(identifier: "UTC")
    formatter.dateFormat = "yyyy-MM-dd'T'HH"
    XCTAssertEqual(formatter.string(from: Date(timeIntervalSince1970: Double(conjunction) / 1000)), "2026-11-09T07")
  }

  func testAnEveningBeforeTheConjunctionHasNoCrescentYet() {
    let jdn = gregorianToJdn(GregorianDate(2026, 11, 8))
    XCTAssertEqual(crescentAt(jdn, najaf, conjunctionNear(noonUtc(jdn))).visibility, .notBorn)
  }

  // MARK: - Moon phase vs the full ephemeris

  private func signed180(_ a: Double) -> Double {
    (a + 180).truncatingRemainder(dividingBy: 360).advanced(by: 360).truncatingRemainder(dividingBy: 360) - 180
  }

  private func astroTime(_ ms: Int) -> astro_time_t { Astronomy_TimeFromDays(Double(ms - 946_728_000_000) / 86_400_000.0) }

  /// 160 instants spread over the app's years (1925–2077), at drifting times of day.
  private var samples: [Int] {
    (0 ..< 160).map { i in Int(Double(utcMidnightMs(GregorianDate(1925, 1, 1))) + Double(i) * 347.77 * Double(dayMs)) }
  }

  func testElongationWithinHalfADegree() {
    for ms in samples {
      let reference = Astronomy_MoonPhase(astroTime(ms)).angle
      XCTAssertLessThan(abs(signed180(moonPhaseAt(ms).elongation - reference)), 0.5)
    }
  }

  func testIlluminatedFractionWithin0_006() {
    for ms in samples {
      let reference = Astronomy_Illumination(BODY_MOON, astroTime(ms)).phase_fraction
      XCTAssertLessThan(abs(moonPhaseAt(ms).illumination - reference), 0.006)
    }
  }

  func testAgeWithinAboutAnHour() {
    for ms in samples {
      let newMoon = Astronomy_SearchMoonPhase(0, astroTime(ms), -31)
      XCTAssertEqual(newMoon.status, ASTRO_SUCCESS)
      let newMoonMs = 946_728_000_000.0 + newMoon.time.ut * 86_400_000.0
      let reference = (Double(ms) - newMoonMs) / Double(dayMs)
      XCTAssertLessThan(abs(moonPhaseAt(ms).age - reference), 0.05)
    }
  }

  func testTotalSolarEclipse2024IsANewMoon() {
    let moon = moonPhaseAt(utcMidnightMs(GregorianDate(2024, 4, 8)) + (18 * 60 + 17) * 60_000)
    XCTAssertEqual(moon.name, .new)
    XCTAssertLessThan(moon.illumination, 0.002)
    XCTAssertLessThan(abs(signed180(moon.elongation)), 0.3)
  }

  func testTotalLunarEclipse2025IsAFullMoon() {
    let moon = moonPhaseAt(utcMidnightMs(GregorianDate(2025, 3, 14)) + (6 * 60 + 59) * 60_000)
    XCTAssertEqual(moon.name, .full)
    XCTAssertGreaterThan(moon.illumination, 0.998)
  }

  private var days: [Int] { (0 ..< 3 * 365).map { gregorianToJdn(GregorianDate(2026, 1, 1)) + $0 } }

  func testNewAndFullEachNameExactlyOneDayPerLunation() {
    for name in [MoonPhaseName.new, .full] {
      let hits = days.filter { moonPhaseOnDay($0).name == name }
      XCTAssertGreaterThanOrEqual(hits.count, 36)
      for i in 1 ..< hits.count { XCTAssertTrue((29 ... 30).contains(hits[i] - hits[i - 1])) }
    }
  }

  func testThePercentageNeverContradictsTheName() {
    for jdn in days {
      let moon = moonPhaseOnDay(jdn)
      let percent = illuminationPercent(moon)
      if moon.name != .full { XCTAssertLessThan(percent, 100) }
      if moon.name != .new { XCTAssertGreaterThan(percent, 0) }
    }
  }

  func testEveryDayOfAHijriMonthHasItsOwnMoon() {
    let o = opts(.fadlallah)
    for year in 1440 ... 1450 {
      for month in 1 ... 12 {
        let start = jdnOfHijri(HijriDate(year, month, 1), o)
        let length = hijriMonthLength(year, month, .fadlallah)
        let moons = (0 ..< length).map { moonPhaseOnDay(start + $0) }
        // Day 1 (evening): a young waxing crescent.
        XCTAssertTrue(moons[0].waxing, "\(year)/\(month)")
        XCTAssertTrue(moons[0].elongation > 5 && moons[0].elongation < 45, "\(year)/\(month)")
        // Each evening the Moon has moved on by 9–16° (a different shape every day).
        for i in 1 ..< length {
          let step = signed180(moons[i].elongation - moons[i - 1].elongation)
          XCTAssertTrue(step > 9 && step < 16, "\(year)/\(month) day \(i + 1)")
        }
        // Brightest around the middle of the month.
        var brightest = 0
        for i in moons.indices where moons[i].illumination > moons[brightest].illumination { brightest = i }
        XCTAssertTrue((12 ... 16).contains(brightest + 1), "\(year)/\(month)")
      }
    }
  }
}
