import * as Astronomy from 'astronomy-engine';

import { jdnToGregorian } from './calendar';
import {
  hijriSource,
  jdnFromHijri,
  jdnOfHijri,
  METHOD_IDS,
  type ConversionOptions,
  type DateSource,
  type MethodId,
} from './hijri';

/**
 * Crescent visibility for Tools → Crescent forecast — the same Odeh criterion (Odeh 2004) the
 * month tables are built with (scripts/build-hijri-tables.js), run on the phone with
 * astronomy-engine for the evenings around a month start. Keep the two in sync: the test checks
 * that this reproduces the Sistani and predicted-Iran tables exactly.
 *
 *   V = ARCV − (−0.1018 W³ + 0.7319 W² − 6.3226 W + 7.1651)
 * at the best time Tb = sunset + 4/9 · lag, with ARCV the airless topocentric moon–sun altitude
 * difference (°) and W the topocentric crescent width (′).
 */
export type Visibility =
  /** Sunset comes before the new moon (conjunction): no crescent can exist yet. */
  | 'notBorn'
  /** The moon sets with or before the sun. */
  | 'setsFirst'
  /** V < −0.96: not visible even with a telescope. */
  | 'none'
  /** −0.96 ≤ V < 2: with optical aid only. */
  | 'opticalOnly'
  /** 2 ≤ V < 5.65: with optical aid, may be seen with the naked eye. */
  | 'opticalMaybeEye'
  /** V ≥ 5.65: visible to the naked eye. */
  | 'nakedEye';

export interface Point {
  lat: number;
  lon: number;
}

/** Same points as the build script. */
export const BEIRUT: Point = { lat: 33.8938, lon: 35.5018 };
export const NAJAF: Point = { lat: 32.028, lon: 44.3419 };
export const IRAN_CITIES: ReadonlyArray<Point & { key: string }> = [
  { key: 'tehran', lat: 35.6892, lon: 51.389 },
  { key: 'mashhad', lat: 36.2605, lon: 59.6168 },
  { key: 'ahvaz', lat: 31.3183, lon: 48.6706 },
  { key: 'bushehr', lat: 28.9234, lon: 50.8203 },
  { key: 'zahedan', lat: 29.4963, lon: 60.8629 },
  { key: 'bandarAbbas', lat: 27.1832, lon: 56.2666 },
];

export const V_NAKED_EYE = 5.65;
export const V_MAYBE_EYE = 2;
export const V_OPTICAL = -0.96;

export interface CrescentReport {
  visibility: Visibility;
  /** Odeh's V, when a crescent exists above the horizon after sunset. */
  v: number | null;
  /** Moon age at sunset (hours since the conjunction); null before it. */
  ageHours: number | null;
  /** Minutes the moon stays up after sunset (≤ 0 = sets first). */
  lagMinutes: number | null;
}

const HOUR_MS = 3600e3;
const DAY_MS = 86400e3;
const observers = new Map<string, Astronomy.Observer>();
function observerFor(p: Point): Astronomy.Observer {
  const key = `${p.lat},${p.lon}`;
  let obs = observers.get(key);
  if (!obs) {
    obs = new Astronomy.Observer(p.lat, p.lon, 0);
    observers.set(key, obs);
  }
  return obs;
}

/** UTC instant of local mean noon at longitude `lon` on civil day `jdn`. */
function localNoonUtc(jdn: number, lon: number): Date {
  const { year, month, day } = jdnToGregorian(jdn);
  return new Date(Date.UTC(year, month - 1, day, 12) - (lon / 15) * HOUR_MS);
}

/** The new moon (geocentric conjunction) nearest to `near`, searched ±20 days. */
export function conjunctionNear(near: Date): Date | null {
  const found = Astronomy.SearchMoonPhase(0, new Date(near.getTime() - 20 * DAY_MS), 40);
  if (!found) return null;
  // SearchMoonPhase returns the first one after the start: keep stepping while the next is closer.
  let best = found.date;
  for (;;) {
    const next = Astronomy.SearchMoonPhase(0, new Date(best.getTime() + DAY_MS), 40);
    if (!next || Math.abs(next.date.getTime() - near.getTime()) >= Math.abs(best.getTime() - near.getTime())) return best;
    best = next.date;
  }
}

const zone = (v: number): Visibility =>
  v >= V_NAKED_EYE ? 'nakedEye' : v >= V_MAYBE_EYE ? 'opticalMaybeEye' : v >= V_OPTICAL ? 'opticalOnly' : 'none';

/**
 * The young crescent on the evening of civil day `jdn` at `p`. `conjunction` is the month's new
 * moon (conjunctionNear): an evening before it has no crescent yet; one more than 3 days after it
 * isn't a young crescent (treated like the build script: no crescent).
 */
export function crescentAt(jdn: number, p: Point, conjunction: Date | null): CrescentReport {
  const obs = observerFor(p);
  const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, localNoonUtc(jdn, p.lon), 1);
  if (!sunset || !conjunction) return { visibility: 'none', v: null, ageHours: null, lagMinutes: null };
  const ageMs = sunset.date.getTime() - conjunction.getTime();
  if (ageMs <= 0) return { visibility: 'notBorn', v: null, ageHours: null, lagMinutes: null };
  const ageHours = ageMs / HOUR_MS;
  if (ageMs > 3 * DAY_MS) return { visibility: 'none', v: null, ageHours, lagMinutes: null };

  const moonset = Astronomy.SearchRiseSet(Astronomy.Body.Moon, obs, -1, sunset, 1);
  if (!moonset) return { visibility: 'none', v: null, ageHours, lagMinutes: null };
  const lagMs = moonset.date.getTime() - sunset.date.getTime();
  const lagMinutes = lagMs / 60e3;
  if (lagMs <= 0) return { visibility: 'setsFirst', v: null, ageHours, lagMinutes };
  if (lagMs > 6 * HOUR_MS) return { visibility: 'none', v: null, ageHours, lagMinutes };

  const best = new Date(sunset.date.getTime() + (4 / 9) * lagMs);
  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, best, obs, true, true);
  const moonEq = Astronomy.Equator(Astronomy.Body.Moon, best, obs, true, true);
  const sunHor = Astronomy.Horizon(best, obs, sunEq.ra, sunEq.dec); // airless (no refraction)
  const moonHor = Astronomy.Horizon(best, obs, moonEq.ra, moonEq.dec);
  const arcv = moonHor.altitude - sunHor.altitude;
  const arcl = Astronomy.AngleBetween(sunEq.vec, moonEq.vec);
  const moonKm = moonEq.dist * Astronomy.KM_PER_AU;
  const sdArcmin = Math.asin(1737.4 / moonKm) * (180 / Math.PI) * 60;
  const w = sdArcmin * (1 - Math.cos(arcl * (Math.PI / 180)));
  const v = arcv - (-0.1018 * w ** 3 + 0.7319 * w ** 2 - 6.3226 * w + 7.1651);
  return { visibility: zone(v), v, ageHours, lagMinutes };
}

/** Best report among several points (highest V; ties/none fall back to the first). */
export function bestOf(jdn: number, points: ReadonlyArray<Point & { key: string }>, conjunction: Date | null) {
  let best: { key: string; report: CrescentReport } | null = null;
  for (const p of points) {
    const report = crescentAt(jdn, p, conjunction);
    if (!best || (report.v ?? -Infinity) > (best.report.v ?? -Infinity)) best = { key: p.key, report };
  }
  return best!;
}

export interface EveningForecast {
  /** Civil day of the evening, and which day of the ending month it is (29 or 30). */
  jdn: number;
  monthDay: 29 | 30;
  beirut: CrescentReport;
  najaf: CrescentReport;
  iran: { key: string; report: CrescentReport };
}

export interface MonthStartForecast {
  /** The month that ends and the one that begins. */
  ending: { year: number; month: number };
  starting: { year: number; month: number };
  conjunction: Date | null;
  evenings: EveningForecast[];
  /** When each office (its own table, no adjustment) begins the new month. */
  starts: Array<{ method: MethodId; jdn: number; source: DateSource }>;
}

/**
 * The evenings of the 29th and 30th of `ending` (counted in the user's calendar) and each
 * office's 1st of the following month.
 */
export function monthStartForecast(ending: { year: number; month: number }, opts: ConversionOptions): MonthStartForecast {
  const starting = ending.month === 12 ? { year: ending.year + 1, month: 1 } : { year: ending.year, month: ending.month + 1 };
  const first = jdnOfHijri({ ...ending, day: 1 }, opts);
  const day29 = first + 28;
  const conjunction = conjunctionNear(localNoonUtc(day29, BEIRUT.lon));
  const evenings = ([29, 30] as const).map(monthDay => {
    const jdn = first + monthDay - 1;
    return {
      jdn,
      monthDay,
      beirut: crescentAt(jdn, BEIRUT, conjunction),
      najaf: crescentAt(jdn, NAJAF, conjunction),
      iran: bestOf(jdn, IRAN_CITIES, conjunction),
    };
  });
  const starts = METHOD_IDS.map(method => {
    const date = { ...starting, day: 1 };
    return { method, jdn: jdnFromHijri(date, method), source: hijriSource(date, method) };
  });
  return { ending, starting, conjunction, evenings, starts };
}
