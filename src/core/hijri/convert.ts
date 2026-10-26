import { gregorianMonthLength, gregorianToJdn, jdnToGregorian, type GregorianDate } from '../calendar';
import type { MethodId } from './methods';
import {
  iranLastOfficial,
  isYearInTable,
  tableBounds,
  tableLookup,
  tableMonthLength,
  tableMonthStart,
  TABLE_FIRST_YEAR,
  TABLE_LAST_YEAR,
} from './tables';
import { tabularFromJdn, tabularMonthLength, tabularToJdn } from './tabular';
import type { DateSource, HijriDate } from './types';

/** Picker ranges. Dates outside the precomputed tables (1343–1500 AH) still convert, via the
 * arithmetic fallback, and are labelled "approximate". */
export const HIJRI_MIN_YEAR = 1300;
export const HIJRI_MAX_YEAR = 1500;
export const GREGORIAN_MIN_YEAR = 1883;
export const GREGORIAN_MAX_YEAR = 2077;

export interface ConversionOptions {
  method: MethodId;
  /** Manual shift in days (Settings → Hijri date adjustment), −2…+2. Positive = the Hijri date
   * shown for a given Gregorian day is later. */
  adjustment: number;
  /** Not read by the conversions: changes when downloaded month tables replace the ones in use,
   * so React memos keyed on the options object recompute (see useConversionOptions). */
  tablesVersion?: number;
}

// ---------------------------------------------------------------------------------------------
// JDN-level primitives (no adjustment)

/**
 * Outside the table the arithmetic calendar takes over — but shifted so it continues seamlessly
 * from the table's first/last month. Unshifted, the two can disagree by a day at the seam, which
 * made one Gregorian day map to "1 Muharram 1343" twice (once per side) and broke round-trips.
 */
function seamOffsets(method: MethodId): { before: number; after: number } {
  const { start, end } = tableBounds(method);
  return {
    before: start - tabularToJdn({ year: TABLE_FIRST_YEAR, month: 1, day: 1 }),
    after: end - tabularToJdn({ year: TABLE_LAST_YEAR + 1, month: 1, day: 1 }),
  };
}

export function hijriFromJdn(jdn: number, method: MethodId): HijriDate {
  const fromTable = tableLookup(method, jdn);
  if (fromTable) return fromTable;
  const { before, after } = seamOffsets(method);
  return tabularFromJdn(jdn < tableBounds(method).start ? jdn - before : jdn - after);
}

export function jdnFromHijri(date: HijriDate, method: MethodId): number {
  const start = tableMonthStart(method, date.year, date.month);
  if (start !== null) return start + date.day - 1;
  const { before, after } = seamOffsets(method);
  return tabularToJdn(date) + (date.year < TABLE_FIRST_YEAR ? before : after);
}

export function hijriMonthLength(year: number, month: number, method: MethodId): 29 | 30 {
  return tableMonthLength(method, year, month) ?? tabularMonthLength(year, month);
}

// ---------------------------------------------------------------------------------------------
// Public conversion API (with the user's adjustment applied)

export function gregorianToHijri(date: GregorianDate, { method, adjustment }: ConversionOptions): HijriDate {
  return hijriFromJdn(gregorianToJdn(date) + adjustment, method);
}

export function hijriToGregorian(date: HijriDate, { method, adjustment }: ConversionOptions): GregorianDate {
  return jdnToGregorian(jdnFromHijri(date, method) - adjustment);
}

/** Hijri date of a JDN under the user's options — the form the UI mostly works with. */
export function hijriOfJdn(jdn: number, { method, adjustment }: ConversionOptions): HijriDate {
  return hijriFromJdn(jdn + adjustment, method);
}

export function jdnOfHijri(date: HijriDate, { method, adjustment }: ConversionOptions): number {
  return jdnFromHijri(date, method) - adjustment;
}

export function isValidHijri(date: HijriDate, method: MethodId): boolean {
  return (
    Number.isInteger(date.year) &&
    date.month >= 1 &&
    date.month <= 12 &&
    date.day >= 1 &&
    date.day <= hijriMonthLength(date.year, date.month, method)
  );
}

export function isValidGregorian(date: GregorianDate): boolean {
  return (
    Number.isInteger(date.year) &&
    date.month >= 1 &&
    date.month <= 12 &&
    date.day >= 1 &&
    date.day <= gregorianMonthLength(date.year, date.month)
  );
}

/** How trustworthy a Hijri date is under a method — see `DateSource`. */
export function hijriSource(date: HijriDate, method: MethodId): DateSource {
  if (!isYearInTable(date.year)) return 'approximate';
  if (method === 'ummalqura') return 'official';
  if (method === 'iran') {
    // From the tables in use (a downloaded update can move this cutoff).
    const last = iranLastOfficial();
    const official = date.year < last.year || (date.year === last.year && date.month <= last.month);
    return official ? 'official' : 'calculated';
  }
  return 'calculated';
}
