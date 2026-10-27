package com.devlance.hijriconverter.core

import com.devlance.hijriconverter.core.hijri.ConversionOptions
import com.devlance.hijriconverter.core.hijri.DateSource
import com.devlance.hijriconverter.core.hijri.HijriDate
import com.devlance.hijriconverter.core.hijri.MethodId
import com.devlance.hijriconverter.core.hijri.YearMonth
import com.devlance.hijriconverter.core.hijri.hijriSource
import com.devlance.hijriconverter.core.hijri.jdnFromHijri
import com.devlance.hijriconverter.core.hijri.jdnOfHijri
import io.github.cosinekitty.astronomy.Aberration
import io.github.cosinekitty.astronomy.Body
import io.github.cosinekitty.astronomy.Direction
import io.github.cosinekitty.astronomy.EquatorEpoch
import io.github.cosinekitty.astronomy.KM_PER_AU
import io.github.cosinekitty.astronomy.Observer
import io.github.cosinekitty.astronomy.Refraction
import io.github.cosinekitty.astronomy.Time
import io.github.cosinekitty.astronomy.Vector
import io.github.cosinekitty.astronomy.equator
import io.github.cosinekitty.astronomy.horizon
import io.github.cosinekitty.astronomy.searchMoonPhase
import io.github.cosinekitty.astronomy.searchRiseSet
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Crescent visibility for Tools → Crescent forecast — the same Odeh criterion (Odeh 2004) the
 * month tables are built with (scripts/build-hijri-tables.js), run on the phone with Astronomy
 * Engine (the same library and version as the build script, Kotlin edition) for the evenings
 * around a month start. Keep the two in sync: the test checks that this reproduces the Sistani and
 * predicted-Iran tables exactly.
 *
 *   V = ARCV − (−0.1018 W³ + 0.7319 W² − 6.3226 W + 7.1651)
 * at the best time Tb = sunset + 4/9 · lag, with ARCV the airless topocentric moon–sun altitude
 * difference (°) and W the topocentric crescent width (′).
 *
 * Instants are epoch milliseconds, truncated like the JS `Date`s v1 (and the build script) work in.
 */
enum class Visibility(val key: String) {
  /** Sunset comes before the new moon (conjunction): no crescent can exist yet. */
  NotBorn("notBorn"),
  /** The moon sets with or before the sun. */
  SetsFirst("setsFirst"),
  /** V < −0.96: not visible even with a telescope. */
  None("none"),
  /** −0.96 ≤ V < 2: with optical aid only. */
  OpticalOnly("opticalOnly"),
  /** 2 ≤ V < 5.65: with optical aid, may be seen with the naked eye. */
  OpticalMaybeEye("opticalMaybeEye"),
  /** V ≥ 5.65: visible to the naked eye. */
  NakedEye("nakedEye"),
}

data class Point(val key: String, val lat: Double, val lon: Double)

/** Same points as the build script. */
val BEIRUT = Point("beirut", 33.8938, 35.5018)
val NAJAF = Point("najaf", 32.028, 44.3419)
val IRAN_CITIES = listOf(
  Point("tehran", 35.6892, 51.389),
  Point("mashhad", 36.2605, 59.6168),
  Point("ahvaz", 31.3183, 48.6706),
  Point("bushehr", 28.9234, 50.8203),
  Point("zahedan", 29.4963, 60.8629),
  Point("bandarAbbas", 27.1832, 56.2666),
)

const val V_NAKED_EYE = 5.65
const val V_MAYBE_EYE = 2.0
const val V_OPTICAL = -0.96

data class CrescentReport(
  val visibility: Visibility,
  /** Odeh's V, when a crescent exists above the horizon after sunset. */
  val v: Double?,
  /** Moon age at sunset (hours since the conjunction); null before it. */
  val ageHours: Double?,
  /** Minutes the moon stays up after sunset (≤ 0 = sets first). */
  val lagMinutes: Double?,
)

private const val HOUR_MS = 3_600_000L
private const val J2000_MS = 946_728_000_000.0
private const val RAD2DEG = 57.295779513082321

private val observers = ConcurrentHashMap<Point, Observer>()
private fun observerFor(p: Point) = observers.getOrPut(p) { Observer(p.lat, p.lon, 0.0) }

/** A search result as v1 saw it: `AstroTime.date`, a JS Date (fractional ms truncated). */
private fun jsMillis(time: Time): Long = (J2000_MS + time.ut * 86_400_000.0).toLong()

private fun timeOf(epochMs: Long): Time = Time.fromMillisecondsSince1970(epochMs)

/** JS Astronomy Engine's `AngleBetween` (the Kotlin edition's `angleWith` rounds differently). */
private fun angleBetween(a: Vector, b: Vector): Double {
  val aa = a.x * a.x + a.y * a.y + a.z * a.z
  val bb = b.x * b.x + b.y * b.y + b.z * b.z
  val dot = (a.x * b.x + a.y * b.y + a.z * b.z) / sqrt(aa * bb)
  if (dot <= -1.0) return 180.0
  if (dot >= 1.0) return 0.0
  return RAD2DEG * acos(dot)
}

/** UTC instant of local mean noon at longitude `lon` on civil day `jdn`. */
private fun localNoonUtc(jdn: Int, lon: Double): Long =
  (utcMidnightMs(jdnToGregorian(jdn)) + 12 * HOUR_MS - (lon / 15) * HOUR_MS).toLong()

/** The new moon (geocentric conjunction) nearest to `near`, searched ±20 days. */
fun conjunctionNear(nearMs: Long): Long? {
  val found = searchMoonPhase(0.0, timeOf(nearMs - 20 * DAY_MS), 40.0) ?: return null
  // searchMoonPhase returns the first one after the start: keep stepping while the next is closer.
  var best = jsMillis(found)
  while (true) {
    val next = searchMoonPhase(0.0, timeOf(best + DAY_MS), 40.0) ?: return best
    val nextMs = jsMillis(next)
    if (abs(nextMs - nearMs) >= abs(best - nearMs)) return best
    best = nextMs
  }
}

private fun zone(v: Double): Visibility = when {
  v >= V_NAKED_EYE -> Visibility.NakedEye
  v >= V_MAYBE_EYE -> Visibility.OpticalMaybeEye
  v >= V_OPTICAL -> Visibility.OpticalOnly
  else -> Visibility.None
}

/**
 * The young crescent on the evening of civil day `jdn` at `p`. `conjunction` is the month's new
 * moon ([conjunctionNear]): an evening before it has no crescent yet; one more than 3 days after
 * it isn't a young crescent (treated like the build script: no crescent).
 */
fun crescentAt(jdn: Int, p: Point, conjunction: Long?): CrescentReport {
  val obs = observerFor(p)
  val sunset = searchRiseSet(Body.Sun, obs, Direction.Set, timeOf(localNoonUtc(jdn, p.lon)), 1.0)
  if (sunset == null || conjunction == null) return CrescentReport(Visibility.None, null, null, null)
  val sunsetMs = jsMillis(sunset)
  val ageMs = sunsetMs - conjunction
  if (ageMs <= 0) return CrescentReport(Visibility.NotBorn, null, null, null)
  val ageHours = ageMs.toDouble() / HOUR_MS
  if (ageMs > 3 * DAY_MS) return CrescentReport(Visibility.None, null, ageHours, null)

  // v1 passes the sunset AstroTime itself here (exact), not its truncated Date.
  val moonset = searchRiseSet(Body.Moon, obs, Direction.Set, sunset, 1.0)
    ?: return CrescentReport(Visibility.None, null, ageHours, null)
  val lagMs = jsMillis(moonset) - sunsetMs
  val lagMinutes = lagMs / 60e3
  if (lagMs <= 0) return CrescentReport(Visibility.SetsFirst, null, ageHours, lagMinutes)
  if (lagMs > 6 * HOUR_MS) return CrescentReport(Visibility.None, null, ageHours, lagMinutes)

  val best = timeOf((sunsetMs + (4.0 / 9) * lagMs).toLong())
  val sunEq = equator(Body.Sun, best, obs, EquatorEpoch.OfDate, Aberration.Corrected)
  val moonEq = equator(Body.Moon, best, obs, EquatorEpoch.OfDate, Aberration.Corrected)
  val sunHor = horizon(best, obs, sunEq.ra, sunEq.dec, Refraction.None) // airless
  val moonHor = horizon(best, obs, moonEq.ra, moonEq.dec, Refraction.None)
  val arcv = moonHor.altitude - sunHor.altitude
  val arcl = angleBetween(sunEq.vec, moonEq.vec)
  val moonKm = moonEq.dist * KM_PER_AU
  val sdArcmin = asin(1737.4 / moonKm) * (180 / Math.PI) * 60
  val w = sdArcmin * (1 - cos(arcl * (Math.PI / 180)))
  val v = arcv - (-0.1018 * w.pow(3) + 0.7319 * w.pow(2) - 6.3226 * w + 7.1651)
  return CrescentReport(zone(v), v, ageHours, lagMinutes)
}

data class PlaceReport(val key: String, val report: CrescentReport)

/** Best report among several points (highest V; ties/none fall back to the first). */
fun bestOf(jdn: Int, points: List<Point>, conjunction: Long?): PlaceReport {
  var best: PlaceReport? = null
  for (p in points) {
    val report = crescentAt(jdn, p, conjunction)
    if (best == null || (report.v ?: Double.NEGATIVE_INFINITY) > (best.report.v ?: Double.NEGATIVE_INFINITY)) {
      best = PlaceReport(p.key, report)
    }
  }
  return best!!
}

data class EveningForecast(
  /** Civil day of the evening, and which day of the ending month it is (29 or 30). */
  val jdn: Int,
  val monthDay: Int,
  val beirut: CrescentReport,
  val najaf: CrescentReport,
  val iran: PlaceReport,
)

data class OfficeStart(val method: MethodId, val jdn: Int, val source: DateSource)

data class MonthStartForecast(
  /** The month that ends and the one that begins. */
  val ending: YearMonth,
  val starting: YearMonth,
  val conjunction: Long?,
  val evenings: List<EveningForecast>,
  /** When each office (its own table, no adjustment) begins the new month. */
  val starts: List<OfficeStart>,
)

/**
 * The evenings of the 29th and 30th of `ending` (counted in the user's calendar) and each
 * office's 1st of the following month.
 */
fun monthStartForecast(ending: YearMonth, opts: ConversionOptions): MonthStartForecast {
  val starting = if (ending.month == 12) YearMonth(ending.year + 1, 1) else YearMonth(ending.year, ending.month + 1)
  val first = jdnOfHijri(HijriDate(ending.year, ending.month, 1), opts)
  val day29 = first + 28
  val conjunction = conjunctionNear(localNoonUtc(day29, BEIRUT.lon))
  val evenings = listOf(29, 30).map { monthDay ->
    val jdn = first + monthDay - 1
    EveningForecast(
      jdn = jdn,
      monthDay = monthDay,
      beirut = crescentAt(jdn, BEIRUT, conjunction),
      najaf = crescentAt(jdn, NAJAF, conjunction),
      iran = bestOf(jdn, IRAN_CITIES, conjunction),
    )
  }
  val starts = MethodId.entries.map { method ->
    val date = HijriDate(starting.year, starting.month, 1)
    OfficeStart(method, jdnFromHijri(date, method), hijriSource(date, method))
  }
  return MonthStartForecast(ending, starting, conjunction, evenings, starts)
}
