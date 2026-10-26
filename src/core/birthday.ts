import { gregorianMonthLength, gregorianToJdn, jdnToGregorian, spanBetween, type YmdSpan } from './calendar';
import { hijriMonthLength, hijriOfJdn, jdnOfHijri, type ConversionOptions, type HijriDate } from './hijri';

export interface HijriBirthday {
  /** The birth date in the Hijri calendar (under the user's method). */
  birthHijri: HijriDate;
  /** Age today, counted in Hijri years/months/days and in Gregorian ones. */
  hijriAge: YmdSpan;
  gregorianAge: YmdSpan;
  next: {
    jdn: number;
    hijri: HijriDate;
    /** 0 = today. */
    inDays: number;
    /** Hijri age reached that day. */
    turning: number;
    /** Born on the 30th, but that month has 29 days in the birthday's year: kept on the 29th. */
    clamped: boolean;
  };
}

/**
 * Hijri birthday maths for Tools → Hijri birthday. A Hijri year is ~11 days shorter than a
 * Gregorian one, so the Hijri birthday moves earlier every Gregorian year and the Hijri age runs
 * ahead. `birthJdn` must not be after `today`.
 */
export function hijriBirthday(birthJdn: number, today: number, opts: ConversionOptions): HijriBirthday {
  const birthHijri = hijriOfJdn(birthJdn, opts);
  const todayHijri = hijriOfJdn(today, opts);

  const occurrence = (year: number) => {
    const length = hijriMonthLength(year, birthHijri.month, opts.method);
    const hijri = { year, month: birthHijri.month, day: Math.min(birthHijri.day, length) };
    return { hijri, jdn: jdnOfHijri(hijri, opts), clamped: birthHijri.day > length };
  };
  let next = occurrence(todayHijri.year);
  if (next.jdn < today) next = occurrence(todayHijri.year + 1);

  return {
    birthHijri,
    hijriAge: spanBetween(
      birthHijri,
      todayHijri,
      (y, m) => hijriMonthLength(y, m, opts.method),
      d => jdnOfHijri(d, opts),
    ),
    gregorianAge: spanBetween(jdnToGregorian(birthJdn), jdnToGregorian(today), gregorianMonthLength, gregorianToJdn),
    next: {
      jdn: next.jdn,
      hijri: next.hijri,
      inDays: next.jdn - today,
      turning: next.hijri.year - birthHijri.year,
      clamped: next.clamped,
    },
  };
}
