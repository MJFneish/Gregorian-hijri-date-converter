import {
  hijriFromJdn,
  hijriMonthLength,
  hijriSource,
  jdnFromHijri,
  METHOD_IDS,
  type DateSource,
  type HijriDate,
  type MethodId,
} from './hijri';

/** One office's reading of a day (Tools → Compare offices). */
export interface OfficeDate {
  method: MethodId;
  hijri: HijriDate;
  source: DateSource;
  /**
   * How many days this office's calendar runs ahead (+) of or behind (−) the reference office's
   * on this day: +1 = it shows today the date the reference shows tomorrow.
   */
  offset: number;
  /** JDN of day 1 of the month this office is in, and that month's length. */
  monthStart: number;
  monthLength: 29 | 30;
}

const sameDate = (a: HijriDate, b: HijriDate) => a.year === b.year && a.month === b.month && a.day === b.day;
const nextMonth = ({ year, month }: HijriDate): HijriDate =>
  month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 };

/**
 * Days office `method` is ahead of `reference` on `jdn`, from the date labels: find the day the
 * reference shows the same date. When it never does (e.g. the office is on the 30th of a month the
 * reference keeps at 29 days), compare when the two start the office's next month instead.
 */
function offsetOf(jdn: number, hijri: HijriDate, method: MethodId, reference: MethodId): number {
  for (const k of [0, 1, -1, 2, -2, 3, -3]) {
    if (sameDate(hijriFromJdn(jdn + k, reference), hijri)) return k;
  }
  const next = nextMonth(hijri);
  return jdnFromHijri(next, reference) - jdnFromHijri(next, method);
}

/**
 * Every office's date for one day, in METHOD_IDS order, measured against `reference` (the user's
 * chosen method). The manual ±day adjustment is deliberately not applied: each row is that
 * office's own calendar.
 */
export function compareOffices(jdn: number, reference: MethodId): OfficeDate[] {
  return METHOD_IDS.map(method => {
    const hijri = hijriFromJdn(jdn, method);
    return {
      method,
      hijri,
      source: hijriSource(hijri, method),
      offset: method === reference ? 0 : offsetOf(jdn, hijri, method, reference),
      monthStart: jdnFromHijri({ ...hijri, day: 1 }, method),
      monthLength: hijriMonthLength(hijri.year, hijri.month, method),
    };
  });
}
