/**
 * Gregorian calendar + Julian Day Number (JDN) helpers. Every conversion in the app goes through
 * an integer JDN (the day count at noon), so both calendars share one timeline.
 *
 * The Fliegel–Van Flandern formulas below need *truncating* integer division (`Math.trunc`).
 * Using `Math.floor` instead silently shifts results by 1–2 days depending on the month and the
 * year's position in the leap cycle — that exact bug exists in prayer-times-lb's hijri.ts and was
 * the reason this app does not reuse it.
 */

export interface GregorianDate {
  year: number;
  month: number; // 1-12
  day: number;
}

const idiv = (a: number, b: number) => Math.trunc(a / b);

export function gregorianToJdn({ year, month, day }: GregorianDate): number {
  const a = idiv(month - 14, 12);
  return (
    idiv(1461 * (year + 4800 + a), 4) +
    idiv(367 * (month - 2 - 12 * a), 12) -
    idiv(3 * idiv(year + 4900 + a, 100), 4) +
    day -
    32075
  );
}

export function jdnToGregorian(jdn: number): GregorianDate {
  let l = jdn + 68569;
  const n = idiv(4 * l, 146097);
  l = l - idiv(146097 * n + 3, 4);
  const i = idiv(4000 * (l + 1), 1461001);
  l = l - idiv(1461 * i, 4) + 31;
  const j = idiv(80 * l, 2447);
  const day = l - idiv(2447 * j, 80);
  l = idiv(j, 11);
  const month = j + 2 - 12 * l;
  const year = 100 * (n - 49) + i + l;
  return { year, month, day };
}

export function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function gregorianMonthLength(year: number, month: number): number {
  return month === 2 && isGregorianLeapYear(year) ? 29 : MONTH_DAYS[month - 1];
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOfJdn(jdn: number): number {
  return (((jdn + 1) % 7) + 7) % 7;
}

/** The device's current local calendar date as a JDN. */
export function todayJdn(now: Date = new Date()): number {
  return gregorianToJdn({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

export function isSameGregorian(a: GregorianDate, b: GregorianDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export interface YmdSpan {
  years: number;
  months: number;
  days: number;
}

interface Ymd {
  year: number;
  month: number;
  day: number;
}

/**
 * Whole years/months/days from `from` to `to` (to >= from) in any calendar — the way people count
 * ages ("3 years, 2 months and 5 days"). Counts whole months first (stepping back one when `to`'s
 * day is earlier than `from`'s), lands on that anniversary with the day clamped to the month's
 * length (31 Jan + 1 month = 28/29 Feb), then counts the remaining days through the JDN timeline.
 */
export function spanBetween<T extends Ymd>(
  from: T,
  to: T,
  monthLength: (year: number, month: number) => number,
  toJdn: (date: Ymd) => number,
): YmdSpan {
  let totalMonths = (to.year - from.year) * 12 + (to.month - from.month);
  if (to.day < from.day) totalMonths -= 1;
  const monthIndex = from.month - 1 + totalMonths;
  const year = from.year + Math.floor(monthIndex / 12);
  const month = (((monthIndex % 12) + 12) % 12) + 1;
  const anchor = { year, month, day: Math.min(from.day, monthLength(year, month)) };
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: toJdn(to) - toJdn(anchor),
  };
}
