import Foundation

// Maghrib for the "eve" hint on the Today card. In Shia jurisprudence the Islamic night (and so the
// next Hijri day) begins at Maghrib — when the eastern redness has gone, a few minutes after sunset
// — not at midnight. The app still changes "today" at midnight (the user's choice) but, between
// Maghrib and midnight, says "Tonight is the eve of …".
//
// Maghrib = sun 4.5° below the horizon — the Jafari "Tehran" angle that prayer-times-lb verified
// against 114 real Al Sirat data points. Computed for Beirut (no location permission needed), with
// the same low-precision solar formulas as prayer-times-lb (PrayTimes.js class, accurate to well
// under a minute — plenty for a hint).

public let maghribAngle = 4.5

public struct LatLng: Sendable {
  public let lat: Double
  public let lng: Double
}

public let beirutLatLng = LatLng(lat: 33.8938, lng: 35.5018)

private let deg = Double.pi / 180

private func fixAngle(_ a: Double) -> Double { a - 360 * (a / 360).rounded(.down) }
private func fixHour(_ h: Double) -> Double { h - 24 * (h / 24).rounded(.down) }

/// Julian Day (fractional, at 0h UT) for a Gregorian date.
private func julianDay(_ date: GregorianDate) -> Double {
  var y = date.year
  var m = date.month
  if m <= 2 {
    y -= 1
    m += 12
  }
  let a = (Double(y) / 100).rounded(.down)
  let b = 2 - a + (a / 4).rounded(.down)
  return (365.25 * Double(y + 4716)).rounded(.down) + (30.6001 * Double(m + 1)).rounded(.down) + Double(date.day) + b - 1524.5
}

private func sunPosition(_ jd: Double) -> (equationOfTime: Double, declination: Double) {
  let d = jd - 2451545.0
  let g = fixAngle(357.529 + 0.98560028 * d)
  let q = fixAngle(280.459 + 0.98564736 * d)
  let l = fixAngle(q + 1.915 * sin(g * deg) + 0.02 * sin(2 * g * deg))
  let e = 23.439 - 0.00000036 * d
  let ra = atan2(cos(e * deg) * sin(l * deg), cos(l * deg)) / deg / 15
  return (equationOfTime: q / 15 - fixHour(ra), declination: asin(sin(e * deg) * sin(l * deg)) / deg)
}

/// Maghrib instant (epoch ms) at `place` on the given civil date, or nil if the sun never gets that
/// low (polar edge case — can't happen at Beirut).
public func maghribInstant(_ date: GregorianDate, place: LatLng = beirutLatLng) -> Int? {
  let jd = julianDay(date)
  let noon = fixHour(12 - sunPosition(jd + 0.5).equationOfTime) - place.lng / 15 // UTC hours
  let declination = sunPosition(jd + noon / 24).declination
  let cosH = (-sin(maghribAngle * deg) - sin(place.lat * deg) * sin(declination * deg)) /
    (cos(place.lat * deg) * cos(declination * deg))
  if cosH < -1 || cosH > 1 { return nil }
  let hours = noon + acos(cosH) / deg / 15
  // v1's `new Date(ms)` truncates a fractional millisecond.
  return Int((Double(utcMidnightMs(date)) + hours * 3600e3).rounded(.towardZero))
}

public struct EveningState: Sendable {
  public let isEve: Bool
  public let maghrib: Int?
}

/// True between Beirut's Maghrib and the phone's local midnight.
public func isEveningAfterMaghrib(_ nowMs: Int, timeZone: TimeZone = .current) -> EveningState {
  let maghrib = maghribInstant(localDate(nowMs, timeZone: timeZone))
  return EveningState(isEve: maghrib != nil && nowMs >= maghrib!, maghrib: maghrib)
}
