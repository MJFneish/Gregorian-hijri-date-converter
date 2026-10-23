import { jdnToGregorian } from './calendar';
import { maghribInstant } from './maghrib';

/**
 * The Moon's phase for the converter's result card: what the real Moon looks like on a given
 * day, so every day of a Hijri month gets its own shape (the disc is drawn continuously from
 * these numbers, not picked from 8 icons — see components/moon/MoonDisc.tsx).
 *
 * Unlike the month tables (precomputed at build time), this runs on the phone: it's a handful of
 * trig terms, not an ephemeris. The elongation is Meeus, *Astronomical Algorithms* (2nd ed.),
 * eq. 48.4 — 180° minus the phase angle, from the mean elongation D and the largest periodic
 * terms of the Moon's and Sun's longitudes — extended with the next Moon terms of ch. 47, which
 * keeps it within ~0.1° of a full ephemeris (the test checks it against astronomy-engine).
 */
export type MoonPhaseName =
  | 'new'
  | 'waxingCrescent'
  | 'firstQuarter'
  | 'waxingGibbous'
  | 'full'
  | 'waningGibbous'
  | 'lastQuarter'
  | 'waningCrescent';

export interface MoonPhase {
  /** Elongation of the Moon east of the Sun, 0–360°: 0 new, 90 first quarter, 180 full, 270 last quarter. */
  elongation: number;
  /** Illuminated fraction of the disc, 0–1. */
  illumination: number;
  /** Lit side growing (elongation < 180°) — lit on the right, as seen from the northern hemisphere. */
  waxing: boolean;
  /** Days since the last new moon (conjunction). */
  age: number;
  name: MoonPhaseName;
}

const DEG = Math.PI / 180;
const SYNODIC_MONTH = 29.530588853;
const MEAN_DAILY_MOTION = 360 / SYNODIC_MONTH;

const norm360 = (a: number) => a - 360 * Math.floor(a / 360);
/** Wraps to (-180, 180]. */
const signed180 = (a: number) => {
  const x = norm360(a);
  return x > 180 ? x - 360 : x;
};
const sin = (deg: number) => Math.sin(deg * DEG);

/** Julian Day (fractional, UT) of an instant. */
export const julianDayOf = (instant: Date) => instant.getTime() / 86400000 + 2440587.5;

/** Moon–Sun elongation (degrees, 0–360) at Julian Day `jd`. UT is used for TT: ΔT is about a
 * minute over the app's years, a few hundredths of a degree here. */
function elongation(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const T2 = T * T;
  const T3 = T2 * T;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000;
  return norm360(
    D +
      // eq. 48.4 (the -2.100 sin M merges the Moon's -0.186 with the Sun's equation of centre;
      // +0.110 sin D is the Moon's -0.035 plus the Earth-Moon vs Earth-Sun distance correction)
      6.289 * sin(Mp) -
      2.1 * sin(M) +
      1.274 * sin(2 * D - Mp) +
      0.658 * sin(2 * D) +
      0.214 * sin(2 * Mp) +
      0.11 * sin(D) +
      // next-largest terms of the Moon's longitude (ch. 47) and the Sun's equation of centre
      -0.114 * sin(2 * F) +
      0.059 * sin(2 * D - 2 * Mp) +
      0.057 * sin(2 * D - M - Mp) +
      0.053 * sin(2 * D + Mp) +
      0.046 * sin(2 * D - M) -
      0.041 * sin(M - Mp) -
      0.03 * sin(M + Mp) -
      0.02 * sin(2 * M),
  );
}

/** Current elongation rate, degrees per day (≈ 10–15: the Moon's speed varies along its orbit). */
function dailyMotion(jd: number): number {
  return signed180(elongation(jd + 0.05) - elongation(jd - 0.05)) / 0.1;
}

/** The conjunction (new moon) at or before `jd`. Starts from the mean motion, then Newton steps. */
function previousNewMoon(jd: number, elongationNow: number): number {
  let t = jd - elongationNow / MEAN_DAILY_MOTION;
  for (let i = 0; i < 4; i++) t -= signed180(elongation(t)) / dailyMotion(t);
  return t;
}

const PRINCIPAL: ReadonlyArray<readonly [number, MoonPhaseName]> = [
  [0, 'new'],
  [90, 'firstQuarter'],
  [180, 'full'],
  [270, 'lastQuarter'],
];

export function moonPhaseAt(instant: Date): MoonPhase {
  const jd = julianDayOf(instant);
  const e = elongation(jd);
  const waxing = e < 180;
  const halfDay = dailyMotion(jd) / 2;
  // A principal phase names only the day it happens on (exact instant within ±12 h of `instant`),
  // like printed calendars and weather apps; every other day gets the in-between name.
  const principal = PRINCIPAL.find(([target]) => Math.abs(signed180(e - target)) < halfDay);
  const name: MoonPhaseName = principal
    ? principal[1]
    : e < 90
      ? 'waxingCrescent'
      : e < 180
        ? 'waxingGibbous'
        : e < 270
          ? 'waningGibbous'
          : 'waningCrescent';
  return {
    elongation: e,
    illumination: (1 - Math.cos(e * DEG)) / 2,
    waxing,
    age: Math.max(0, jd - previousNewMoon(jd, e)),
    name,
  };
}

/** Whole-percent illumination for display. Rounding alone would print "100%" for the evening
 * before a full moon and "0%" for a visible crescent, contradicting the phase name beside it. */
export function illuminationPercent(phase: MoonPhase): number {
  const percent = Math.round(phase.illumination * 100);
  if (phase.name === 'full' || phase.name === 'new') return percent;
  return Math.min(99, Math.max(1, percent));
}

/**
 * The Moon on the evening of a civil day: at Beirut's Maghrib, the moment the app already uses
 * for the start of the Islamic night (core/maghrib.ts). The evening is when the Moon is watched —
 * a new month's crescent is sought then — so day 1 of a Hijri month shows a young crescent and
 * the 14th/15th a full moon. The phase is the real sky's, so it follows the Gregorian day only:
 * the method and ±day adjustment relabel the Hijri date but don't move the Moon.
 */
export function moonPhaseOnDay(jdn: number): MoonPhase {
  const date = jdnToGregorian(jdn);
  const evening = maghribInstant(date) ?? new Date(Date.UTC(date.year, date.month - 1, date.day, 16));
  return moonPhaseAt(evening);
}
