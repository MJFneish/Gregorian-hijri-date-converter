import CAstronomy
import Foundation

// Crescent visibility for Tools → Crescent forecast — the same Odeh criterion (Odeh 2004) the
// month tables are built with (android/scripts/build-hijri-tables.js), run on the phone with
// Astronomy Engine's C edition (same version as the build script's JS) for the evenings around a
// month start. Keep the copies in sync: the tests check this reproduces the Sistani and
// predicted-Iran tables exactly.
//
//   V = ARCV − (−0.1018 W³ + 0.7319 W² − 6.3226 W + 7.1651)
// at the best time Tb = sunset + 4/9 · lag, with ARCV the airless topocentric moon–sun altitude
// difference (°) and W the topocentric crescent width (′).
//
// Instants are epoch milliseconds, truncated like the JS `Date`s v1 (and the build script) use.

public enum CrescentVisibility: String, Sendable {
  /// Sunset comes before the new moon (conjunction): no crescent can exist yet.
  case notBorn
  /// The moon sets with or before the sun.
  case setsFirst
  /// V < −0.96: not visible even with a telescope.
  case none
  /// −0.96 ≤ V < 2: with optical aid only.
  case opticalOnly
  /// 2 ≤ V < 5.65: with optical aid, may be seen with the naked eye.
  case opticalMaybeEye
  /// V ≥ 5.65: visible to the naked eye.
  case nakedEye
}

public struct Point: Hashable, Sendable {
  public let key: String
  public let lat: Double
  public let lon: Double
}

/// Same points as the build script.
public let beirut = Point(key: "beirut", lat: 33.8938, lon: 35.5018)
public let najaf = Point(key: "najaf", lat: 32.028, lon: 44.3419)
public let iranCities = [
  Point(key: "tehran", lat: 35.6892, lon: 51.389),
  Point(key: "mashhad", lat: 36.2605, lon: 59.6168),
  Point(key: "ahvaz", lat: 31.3183, lon: 48.6706),
  Point(key: "bushehr", lat: 28.9234, lon: 50.8203),
  Point(key: "zahedan", lat: 29.4963, lon: 60.8629),
  Point(key: "bandarAbbas", lat: 27.1832, lon: 56.2666),
]

public let vNakedEye = 5.65
public let vMaybeEye = 2.0
public let vOptical = -0.96

public struct CrescentReport: Hashable, Sendable {
  public let visibility: CrescentVisibility
  /// Odeh's V, when a crescent exists above the horizon after sunset.
  public let v: Double?
  /// Moon age at sunset (hours since the conjunction); nil before it.
  public let ageHours: Double?
  /// Minutes the moon stays up after sunset (≤ 0 = sets first).
  public let lagMinutes: Double?
}

private let hourMs = 3_600_000
private let j2000Ms = 946_728_000_000.0
private let rad2deg = 57.295779513082321

/// v1's `MakeTime(Date)`: days since J2000 from epoch ms.
private func timeOf(_ epochMs: Int) -> astro_time_t {
  Astronomy_TimeFromDays(Double(epochMs - 946_728_000_000) / 86_400_000.0)
}

/// A search result as v1 saw it: `AstroTime.date`, a JS Date (fractional ms truncated).
private func jsMillis(_ time: astro_time_t) -> Int {
  Int((j2000Ms + time.ut * 86_400_000.0).rounded(.towardZero))
}

/// JS Astronomy Engine's `AngleBetween`.
private func angleBetween(_ a: astro_vector_t, _ b: astro_vector_t) -> Double {
  let aa = a.x * a.x + a.y * a.y + a.z * a.z
  let bb = b.x * b.x + b.y * b.y + b.z * b.z
  let dot = (a.x * b.x + a.y * b.y + a.z * b.z) / (aa * bb).squareRoot()
  if dot <= -1.0 { return 180 }
  if dot >= 1.0 { return 0 }
  return rad2deg * acos(dot)
}

/// UTC instant of local mean noon at longitude `lon` on civil day `jdn`.
private func localNoonUtc(_ jdn: Int, _ lon: Double) -> Int {
  Int((Double(utcMidnightMs(jdnToGregorian(jdn)) + 12 * hourMs) - (lon / 15) * Double(hourMs)).rounded(.towardZero))
}

/// The new moon (geocentric conjunction) nearest to `near`, searched ±20 days.
public func conjunctionNear(_ nearMs: Int) -> Int? {
  let found = Astronomy_SearchMoonPhase(0, timeOf(nearMs - 20 * dayMs), 40)
  guard found.status == ASTRO_SUCCESS else { return nil }
  // SearchMoonPhase returns the first one after the start: keep stepping while the next is closer.
  var best = jsMillis(found.time)
  while true {
    let next = Astronomy_SearchMoonPhase(0, timeOf(best + dayMs), 40)
    guard next.status == ASTRO_SUCCESS else { return best }
    let nextMs = jsMillis(next.time)
    if abs(nextMs - nearMs) >= abs(best - nearMs) { return best }
    best = nextMs
  }
}

private func zone(_ v: Double) -> CrescentVisibility {
  if v >= vNakedEye { return .nakedEye }
  if v >= vMaybeEye { return .opticalMaybeEye }
  if v >= vOptical { return .opticalOnly }
  return .none
}

/// The young crescent on the evening of civil day `jdn` at `p`. `conjunction` is the month's new
/// moon (`conjunctionNear`): an evening before it has no crescent yet; one more than 3 days after
/// it isn't a young crescent (treated like the build script: no crescent).
public func crescentAt(_ jdn: Int, _ p: Point, _ conjunction: Int?) -> CrescentReport {
  let obs = Astronomy_MakeObserver(p.lat, p.lon, 0)
  let sunset = Astronomy_SearchRiseSetEx(BODY_SUN, obs, DIRECTION_SET, timeOf(localNoonUtc(jdn, p.lon)), 1, 0)
  guard sunset.status == ASTRO_SUCCESS, let conjunction else {
    return CrescentReport(visibility: .none, v: nil, ageHours: nil, lagMinutes: nil)
  }
  let sunsetMs = jsMillis(sunset.time)
  let ageMs = sunsetMs - conjunction
  if ageMs <= 0 { return CrescentReport(visibility: .notBorn, v: nil, ageHours: nil, lagMinutes: nil) }
  let ageHours = Double(ageMs) / Double(hourMs)
  if ageMs > 3 * dayMs { return CrescentReport(visibility: .none, v: nil, ageHours: ageHours, lagMinutes: nil) }

  // v1 passes the sunset AstroTime itself here (exact), not its truncated Date.
  let moonset = Astronomy_SearchRiseSetEx(BODY_MOON, obs, DIRECTION_SET, sunset.time, 1, 0)
  guard moonset.status == ASTRO_SUCCESS else {
    return CrescentReport(visibility: .none, v: nil, ageHours: ageHours, lagMinutes: nil)
  }
  let lagMs = jsMillis(moonset.time) - sunsetMs
  let lagMinutes = Double(lagMs) / 60e3
  if lagMs <= 0 { return CrescentReport(visibility: .setsFirst, v: nil, ageHours: ageHours, lagMinutes: lagMinutes) }
  if lagMs > 6 * hourMs { return CrescentReport(visibility: .none, v: nil, ageHours: ageHours, lagMinutes: lagMinutes) }

  var best = timeOf(Int((Double(sunsetMs) + (4.0 / 9) * Double(lagMs)).rounded(.towardZero)))
  let sunEq = Astronomy_Equator(BODY_SUN, &best, obs, EQUATOR_OF_DATE, ABERRATION)
  let moonEq = Astronomy_Equator(BODY_MOON, &best, obs, EQUATOR_OF_DATE, ABERRATION)
  let sunHor = Astronomy_Horizon(&best, obs, sunEq.ra, sunEq.dec, REFRACTION_NONE) // airless
  let moonHor = Astronomy_Horizon(&best, obs, moonEq.ra, moonEq.dec, REFRACTION_NONE)
  let arcv = moonHor.altitude - sunHor.altitude
  let arcl = angleBetween(sunEq.vec, moonEq.vec)
  let moonKm = moonEq.dist * KM_PER_AU
  let sdArcmin = asin(1737.4 / moonKm) * (180 / Double.pi) * 60
  let w = sdArcmin * (1 - cos(arcl * (Double.pi / 180)))
  let v = arcv - (-0.1018 * pow(w, 3) + 0.7319 * pow(w, 2) - 6.3226 * w + 7.1651)
  return CrescentReport(visibility: zone(v), v: v, ageHours: ageHours, lagMinutes: lagMinutes)
}

public struct PlaceReport: Hashable, Sendable {
  public let key: String
  public let report: CrescentReport
}

/// Best report among several points (highest V; ties/none fall back to the first).
public func bestOf(_ jdn: Int, _ points: [Point], _ conjunction: Int?) -> PlaceReport {
  var best: PlaceReport?
  for p in points {
    let report = crescentAt(jdn, p, conjunction)
    if best == nil || (report.v ?? -.infinity) > (best!.report.v ?? -.infinity) {
      best = PlaceReport(key: p.key, report: report)
    }
  }
  return best!
}

public struct EveningForecast: Hashable, Sendable {
  /// Civil day of the evening, and which day of the ending month it is (29 or 30).
  public let jdn: Int
  public let monthDay: Int
  public let beirut: CrescentReport
  public let najaf: CrescentReport
  public let iran: PlaceReport
}

public struct OfficeStart: Hashable, Sendable {
  public let method: MethodId
  public let jdn: Int
  public let source: DateSource
}

public struct MonthStartForecast: Hashable, Sendable {
  /// The month that ends and the one that begins.
  public let ending: YearMonth
  public let starting: YearMonth
  public let conjunction: Int?
  public let evenings: [EveningForecast]
  /// When each office (its own table, no adjustment) begins the new month.
  public let starts: [OfficeStart]
}

/// The evenings of the 29th and 30th of `ending` (counted in the user's calendar) and each office's
/// 1st of the following month.
public func monthStartForecast(_ ending: YearMonth, _ opts: ConversionOptions) -> MonthStartForecast {
  let starting = ending.month == 12 ? YearMonth(year: ending.year + 1, month: 1) : YearMonth(year: ending.year, month: ending.month + 1)
  let first = jdnOfHijri(HijriDate(ending.year, ending.month, 1), opts)
  let day29 = first + 28
  let conjunction = conjunctionNear(localNoonUtc(day29, beirut.lon))
  let evenings = [29, 30].map { monthDay -> EveningForecast in
    let jdn = first + monthDay - 1
    return EveningForecast(
      jdn: jdn,
      monthDay: monthDay,
      beirut: crescentAt(jdn, beirut, conjunction),
      najaf: crescentAt(jdn, najaf, conjunction),
      iran: bestOf(jdn, iranCities, conjunction)
    )
  }
  let starts = MethodId.allCases.map { method -> OfficeStart in
    let date = HijriDate(starting.year, starting.month, 1)
    return OfficeStart(method: method, jdn: jdnFromHijri(date, method), source: hijriSource(date, method))
  }
  return MonthStartForecast(ending: ending, starting: starting, conjunction: conjunction, evenings: evenings, starts: starts)
}
