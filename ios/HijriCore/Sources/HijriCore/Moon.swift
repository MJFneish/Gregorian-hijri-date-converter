import Foundation

// The Moon's phase for the converter's result card: what the real Moon looks like on a given day,
// so every day of a Hijri month gets its own shape (the disc is drawn continuously from these
// numbers, not picked from 8 icons — see MoonDisc in the app).
//
// It's a handful of trig terms, not an ephemeris: the elongation is Meeus, *Astronomical
// Algorithms* (2nd ed.), eq. 48.4 — 180° minus the phase angle, from the mean elongation D and the
// largest periodic terms of the Moon's and Sun's longitudes — extended with the next Moon terms of
// ch. 47, which keeps it within ~0.1° of a full ephemeris (the test checks it against Astronomy
// Engine).

public enum MoonPhaseName: String, Sendable {
  case new, waxingCrescent, firstQuarter, waxingGibbous, full, waningGibbous, lastQuarter, waningCrescent
}

public struct MoonPhase: Hashable, Sendable {
  /// Elongation of the Moon east of the Sun, 0–360°: 0 new, 90 first quarter, 180 full, 270 last quarter.
  public let elongation: Double
  /// Illuminated fraction of the disc, 0–1.
  public let illumination: Double
  /// Lit side growing (elongation < 180°) — lit on the right, as seen from the northern hemisphere.
  public let waxing: Bool
  /// Days since the last new moon (conjunction).
  public let age: Double
  public let name: MoonPhaseName
}

private let deg = Double.pi / 180
private let synodicMonth = 29.530588853
private let meanDailyMotion = 360 / synodicMonth

private func norm360(_ a: Double) -> Double { a - 360 * (a / 360).rounded(.down) }

/// Wraps to (-180, 180].
private func signed180(_ a: Double) -> Double {
  let x = norm360(a)
  return x > 180 ? x - 360 : x
}

private func sind(_ d: Double) -> Double { sin(d * deg) }

/// Julian Day (fractional, UT) of an instant.
public func julianDayOf(_ epochMs: Int) -> Double { Double(epochMs) / 86400000 + 2440587.5 }

/// Moon–Sun elongation (degrees, 0–360) at Julian Day `jd`. UT is used for TT: ΔT is about a minute
/// over the app's years, a few hundredths of a degree here.
private func elongation(_ jd: Double) -> Double {
  let t = (jd - 2451545) / 36525
  let t2 = t * t
  let t3 = t2 * t
  let d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t2 + t3 / 545868
  let m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000
  let mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t2 + t3 / 69699
  let f = 93.272095 + 483202.0175233 * t - 0.0036539 * t2 - t3 / 3526000
  // eq. 48.4 (the -2.100 sin M merges the Moon's -0.186 with the Sun's equation of centre;
  // +0.110 sin D is the Moon's -0.035 plus the Earth-Moon vs Earth-Sun distance correction),
  // then the next-largest terms of the Moon's longitude (ch. 47) and the Sun's equation of centre.
  // Summed left to right in v1's order.
  var e = d
  e += 6.289 * sind(mp)
  e -= 2.1 * sind(m)
  e += 1.274 * sind(2 * d - mp)
  e += 0.658 * sind(2 * d)
  e += 0.214 * sind(2 * mp)
  e += 0.11 * sind(d)
  e += -0.114 * sind(2 * f)
  e += 0.059 * sind(2 * d - 2 * mp)
  e += 0.057 * sind(2 * d - m - mp)
  e += 0.053 * sind(2 * d + mp)
  e += 0.046 * sind(2 * d - m)
  e -= 0.041 * sind(m - mp)
  e -= 0.03 * sind(m + mp)
  e -= 0.02 * sind(2 * m)
  return norm360(e)
}

/// Current elongation rate, degrees per day (≈ 10–15: the Moon's speed varies along its orbit).
private func dailyMotion(_ jd: Double) -> Double {
  signed180(elongation(jd + 0.05) - elongation(jd - 0.05)) / 0.1
}

/// The conjunction (new moon) at or before `jd`. Starts from the mean motion, then Newton steps.
private func previousNewMoon(_ jd: Double, _ elongationNow: Double) -> Double {
  var t = jd - elongationNow / meanDailyMotion
  for _ in 0 ..< 4 { t -= signed180(elongation(t)) / dailyMotion(t) }
  return t
}

private let principal: [(Double, MoonPhaseName)] = [(0, .new), (90, .firstQuarter), (180, .full), (270, .lastQuarter)]

public func moonPhaseAt(_ epochMs: Int) -> MoonPhase {
  let jd = julianDayOf(epochMs)
  let e = elongation(jd)
  let waxing = e < 180
  let halfDay = dailyMotion(jd) / 2
  // A principal phase names only the day it happens on (exact instant within ±12 h of `instant`),
  // like printed calendars and weather apps; every other day gets the in-between name.
  let name: MoonPhaseName
  if let hit = principal.first(where: { abs(signed180(e - $0.0)) < halfDay }) {
    name = hit.1
  } else if e < 90 {
    name = .waxingCrescent
  } else if e < 180 {
    name = .waxingGibbous
  } else if e < 270 {
    name = .waningGibbous
  } else {
    name = .waningCrescent
  }
  return MoonPhase(
    elongation: e,
    illumination: (1 - cos(e * deg)) / 2,
    waxing: waxing,
    age: max(0, jd - previousNewMoon(jd, e)),
    name: name
  )
}

/// Whole-percent illumination for display. Rounding alone would print "100%" for the evening before
/// a full moon and "0%" for a visible crescent, contradicting the phase name beside it.
public func illuminationPercent(_ phase: MoonPhase) -> Int {
  let percent = jsRound(phase.illumination * 100)
  if phase.name == .full || phase.name == .new { return percent }
  return min(99, max(1, percent))
}

/// The Moon on the evening of a civil day: at Beirut's Maghrib, the moment the app already uses for
/// the start of the Islamic night. So day 1 of a Hijri month shows a young crescent and the
/// 14th/15th a full moon. It follows the Gregorian day only: the method and ±day adjustment relabel
/// the Hijri date but don't move the Moon.
public func moonPhaseOnDay(_ jdn: Int) -> MoonPhase {
  let date = jdnToGregorian(jdn)
  let evening = maghribInstant(date) ?? (utcMidnightMs(date) + 16 * 3_600_000)
  return moonPhaseAt(evening)
}
