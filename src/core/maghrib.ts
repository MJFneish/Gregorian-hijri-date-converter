import type { GregorianDate } from './calendar';

/**
 * Maghrib for the "eve" hint on the Today card. In Shia jurisprudence the Islamic night (and so
 * the next Hijri day) begins at Maghrib — when the eastern redness has gone, a few minutes after
 * sunset — not at midnight. The app still changes "today" at midnight (the user's choice) but,
 * between Maghrib and midnight, says "Tonight is the eve of …".
 *
 * Maghrib = sun 4.5° below the horizon — the Jafari "Tehran" angle that prayer-times-lb verified
 * against 114 real Al Sirat data points. Computed for Beirut (no location permission needed), with
 * the same low-precision solar formulas as prayer-times-lb's solar.ts (PrayTimes.js class,
 * accurate to well under a minute — plenty for a hint).
 */
export const MAGHRIB_ANGLE = 4.5;
export const BEIRUT = { lat: 33.8938, lng: 35.5018 };

const DEG = Math.PI / 180;

const fixAngle = (a: number) => a - 360 * Math.floor(a / 360);
const fixHour = (h: number) => h - 24 * Math.floor(h / 24);

/** Julian Day (fractional, at 0h UT) for a Gregorian date. */
function julianDay({ year, month, day }: GregorianDate): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

function sunPosition(jd: number) {
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d);
  const q = fixAngle(280.459 + 0.98564736 * d);
  const l = fixAngle(q + 1.915 * Math.sin(g * DEG) + 0.02 * Math.sin(2 * g * DEG));
  const e = 23.439 - 0.00000036 * d;
  const ra = Math.atan2(Math.cos(e * DEG) * Math.sin(l * DEG), Math.cos(l * DEG)) / DEG / 15;
  return {
    equationOfTime: q / 15 - fixHour(ra),
    declination: Math.asin(Math.sin(e * DEG) * Math.sin(l * DEG)) / DEG,
  };
}

/** Maghrib instant (UTC) at `place` on the given civil date, or null if the sun never gets that
 * low (polar edge case — can't happen at Beirut). */
export function maghribInstant(date: GregorianDate, place = BEIRUT): Date | null {
  const jd = julianDay(date);
  const noon = fixHour(12 - sunPosition(jd + 0.5).equationOfTime) - place.lng / 15; // UTC hours
  const { declination } = sunPosition(jd + noon / 24);
  const cosH =
    (-Math.sin(MAGHRIB_ANGLE * DEG) - Math.sin(place.lat * DEG) * Math.sin(declination * DEG)) /
    (Math.cos(place.lat * DEG) * Math.cos(declination * DEG));
  if (cosH < -1 || cosH > 1) return null;
  const hours = noon + Math.acos(cosH) / DEG / 15;
  return new Date(Date.UTC(date.year, date.month - 1, date.day) + hours * 3600e3);
}

/** True between Beirut's Maghrib and the device's local midnight. */
export function isEveningAfterMaghrib(now: Date): { isEve: boolean; maghrib: Date | null } {
  const maghrib = maghribInstant({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
  return { isEve: maghrib !== null && now.getTime() >= maghrib.getTime(), maghrib };
}
