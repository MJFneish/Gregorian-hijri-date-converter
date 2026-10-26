/* eslint-disable no-bitwise -- month lengths are packed as 12-bit masks (see scripts/build-hijri-tables.js) */
import { METHOD_IDS, type MethodId } from './methods';
import type { HijriDate } from './types';
import {
  IRAN_LAST_OFFICIAL,
  METHOD_TABLES,
  TABLES_GENERATED,
  TABLE_FIRST_YEAR,
  TABLE_LAST_YEAR,
} from './tables.generated';

export { TABLE_FIRST_YEAR, TABLE_LAST_YEAR };

/**
 * The month-start tables in use. Starts as the copy bundled in the APK; `setTableData` swaps in
 * a newer one downloaded from the repo (tableUpdates.ts — month starts can be corrected without a
 * new APK). The year range never changes: a download must cover exactly the bundled years.
 */
export interface TableData {
  /** ISO timestamp of the build-hijri-tables run that produced it — the version. */
  generated: string;
  /** Last month whose Iran-official start is from published data (later ones are predicted). */
  iranLastOfficial: { year: number; month: number };
  methods: Record<MethodId, { firstJdn: number; lengths: string }>;
}

export const BUNDLED_TABLES: TableData = {
  generated: TABLES_GENERATED,
  iranLastOfficial: IRAN_LAST_OFFICIAL,
  methods: METHOD_TABLES,
};

let current: TableData = BUNDLED_TABLES;

export function currentTables(): TableData {
  return current;
}

/** Switch to another (validated) table set. Callers re-render via the table store's version. */
export function setTableData(data: TableData): void {
  current = data;
  cache.clear();
}

export function iranLastOfficial(): { year: number; month: number } {
  return current.iranLastOfficial;
}

/**
 * Decoded month-start table for one method: `starts[i]` is the JDN of day 1 of the i-th month
 * counted from 1 Muharram TABLE_FIRST_YEAR, with one extra sentinel entry at the end (the day after
 * the last month). Decoded lazily and cached — ~1,900 ints per method.
 */
const cache = new Map<MethodId, Int32Array>();

function decode({ firstJdn, lengths }: { firstJdn: number; lengths: string }): Int32Array {
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
  return starts;
}

function monthStarts(method: MethodId): Int32Array {
  const cached = cache.get(method);
  if (cached) return cached;
  const starts = decode(current.methods[method]);
  cache.set(method, starts);
  return starts;
}

/** Most a downloaded month start may differ from the bundled one — anything further is garbage. */
const MAX_DRIFT_DAYS = 3;
const YEARS = TABLE_LAST_YEAR - TABLE_FIRST_YEAR + 1;

/**
 * Checks a downloaded table set (data/hijri-tables.json) before it may replace the bundled one:
 * format 1, the same year range, every method present with a well-formed mask, every year 353–356
 * days (sighting calendars can have 353/356 — see the integrity test), and every month start within
 * MAX_DRIFT_DAYS of the bundled table's. Returns null when anything is off.
 */
export function validateTableData(raw: unknown): TableData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.format !== 1 || r.firstYear !== TABLE_FIRST_YEAR || r.lastYear !== TABLE_LAST_YEAR) return null;
  if (typeof r.generated !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(r.generated)) return null;
  const iran = r.iranLastOfficial as { year?: unknown; month?: unknown } | undefined;
  if (
    !iran ||
    !Number.isInteger(iran.year) ||
    !Number.isInteger(iran.month) ||
    (iran.year as number) < TABLE_FIRST_YEAR ||
    (iran.year as number) > TABLE_LAST_YEAR ||
    (iran.month as number) < 1 ||
    (iran.month as number) > 12
  ) {
    return null;
  }
  const methodsRaw = r.methods as Record<string, { firstJdn?: unknown; lengths?: unknown }> | undefined;
  if (!methodsRaw || typeof methodsRaw !== 'object') return null;
  const methods = {} as TableData['methods'];
  for (const method of METHOD_IDS) {
    const m = methodsRaw[method];
    if (!m || !Number.isInteger(m.firstJdn) || typeof m.lengths !== 'string') return null;
    if (m.lengths.length !== YEARS * 3 || !/^[0-9a-f]+$/.test(m.lengths)) return null;
    const table = { firstJdn: m.firstJdn as number, lengths: m.lengths };
    for (let y = 0; y < YEARS; y++) {
      let thirties = 0;
      for (let bits = parseInt(table.lengths.slice(y * 3, y * 3 + 3), 16); bits; bits >>= 1) thirties += bits & 1;
      if (thirties < 5 || thirties > 8) return null; // 348 + thirties = 353..356 days
    }
    const starts = decode(table);
    const bundled = decode(BUNDLED_TABLES.methods[method]);
    for (let i = 0; i < starts.length; i++) {
      if (Math.abs(starts[i] - bundled[i]) > MAX_DRIFT_DAYS) return null;
    }
    methods[method] = table;
  }
  return {
    generated: r.generated,
    iranLastOfficial: { year: iran.year as number, month: iran.month as number },
    methods,
  };
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
