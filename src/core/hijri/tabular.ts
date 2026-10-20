import type { HijriDate } from './types';

/**
 * Arithmetic ("civil", Friday-epoch, 11-leap-years-in-30 pattern 2,5,7,10,13,16,18,21,24,26,29)
 * Islamic calendar. Only used as the fallback outside the precomputed tables (before 1343 AH /
 * after 1500 AH) — it agrees with the real calendars about 2/3 of the time and is otherwise a day
 * off, which is why every date it produces is labelled "approximate" in the UI.
 */
const CIVIL_EPOCH_JDN = 1948440; // 1 Muharram 1 AH = 16 July 622 (Julian)

export function tabularIsLeapYear(year: number): boolean {
  return (((14 + 11 * year) % 30) + 30) % 30 < 11;
}

export function tabularMonthLength(year: number, month: number): 29 | 30 {
  if (month === 12) return tabularIsLeapYear(year) ? 30 : 29;
  return month % 2 === 1 ? 30 : 29;
}

export function tabularToJdn({ year, month, day }: HijriDate): number {
  return (
    day +
    Math.ceil(29.5 * (month - 1)) +
    (year - 1) * 354 +
    Math.floor((3 + 11 * year) / 30) +
    CIVIL_EPOCH_JDN -
    1
  );
}

export function tabularFromJdn(jdn: number): HijriDate {
  const year = Math.floor((30 * (jdn - CIVIL_EPOCH_JDN) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jdn - (29 + tabularToJdn({ year, month: 1, day: 1 }))) / 29.5) + 1);
  const day = jdn - tabularToJdn({ year, month, day: 1 }) + 1;
  return { year, month, day };
}
