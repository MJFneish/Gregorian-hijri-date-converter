/* eslint-disable no-bitwise -- month lengths are packed as 12-bit masks (see scripts/build-hijri-tables.js) */
import type { MethodId } from './methods';
import type { HijriDate } from './types';
import { METHOD_TABLES, TABLE_FIRST_YEAR, TABLE_LAST_YEAR } from './tables.generated';

export { TABLE_FIRST_YEAR, TABLE_LAST_YEAR };

/**
 * Decoded month-start table for one method: `starts[i]` is the JDN of day 1 of the i-th month
 * counted from 1 Muharram TABLE_FIRST_YEAR, with one extra sentinel entry at the end (the day after
 * the last month). Decoded lazily and cached — ~1,900 ints per method.
 */
const cache = new Map<MethodId, Int32Array>();

function monthStarts(method: MethodId): Int32Array {
  const cached = cache.get(method);
  if (cached) return cached;
  const { firstJdn, lengths } = METHOD_TABLES[method];
  const years = lengths.length / 3;
  const starts = new Int32Array(years * 12 + 1);
  let jdn = firstJdn;
  for (let y = 0; y < years; y++) {
    const bits = parseInt(lengths.slice(y * 3, y * 3 + 3), 16);
    for (let m = 0; m < 12; m++) {
      starts[y * 12 + m] = jdn;
      jdn += bits & (1 << m) ? 30 : 29;
    }
  }
  starts[years * 12] = jdn;
  cache.set(method, starts);
  return starts;
}

const indexOf = (year: number, month: number) => (year - TABLE_FIRST_YEAR) * 12 + (month - 1);

export function isYearInTable(year: number): boolean {
  return year >= TABLE_FIRST_YEAR && year <= TABLE_LAST_YEAR;
}

/** JDN of 1 <month> <year>, or null outside the table. */
export function tableMonthStart(method: MethodId, year: number, month: number): number | null {
  if (!isYearInTable(year)) return null;
  return monthStarts(method)[indexOf(year, month)];
}

export function tableMonthLength(method: MethodId, year: number, month: number): 29 | 30 | null {
  if (!isYearInTable(year)) return null;
  const starts = monthStarts(method);
  const i = indexOf(year, month);
  return (starts[i + 1] - starts[i]) as 29 | 30;
}

/** First day of the table and the day after its last day (JDN). */
export function tableBounds(method: MethodId): { start: number; end: number } {
  const starts = monthStarts(method);
  return { start: starts[0], end: starts[starts.length - 1] };
}

/** Hijri date for a JDN, or null when the JDN falls outside the table. Binary search. */
export function tableLookup(method: MethodId, jdn: number): HijriDate | null {
  const starts = monthStarts(method);
  if (jdn < starts[0] || jdn >= starts[starts.length - 1]) return null;
  let lo = 0;
  let hi = starts.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= jdn) lo = mid;
    else hi = mid - 1;
  }
  return {
    year: TABLE_FIRST_YEAR + Math.floor(lo / 12),
    month: (lo % 12) + 1,
    day: jdn - starts[lo] + 1,
  };
}
