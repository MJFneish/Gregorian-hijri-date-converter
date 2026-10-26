import { jdnToGregorian, todayJdn, weekdayOfJdn, type GregorianDate } from './calendar';
import {
  hijriMonthLength,
  hijriOfJdn,
  hijriSource,
  jdnOfHijri,
  type ConversionOptions,
  type DateSource,
  type HijriDate,
} from './hijri';
import { isEveningAfterMaghrib } from './maghrib';
import { occasionsOn, type Occasion } from './occasions';

export interface DayInfo {
  jdn: number;
  gregorian: GregorianDate;
  hijri: HijriDate;
  weekday: number;
  source: DateSource;
  occasions: Occasion[];
}

export function dayInfo(jdn: number, opts: ConversionOptions): DayInfo {
  const hijri = hijriOfJdn(jdn, opts);
  return {
    jdn,
    gregorian: jdnToGregorian(jdn),
    hijri,
    weekday: weekdayOfJdn(jdn),
    source: hijriSource(hijri, opts.method),
    occasions: occasionsOn(hijri, hijriMonthLength(hijri.year, hijri.month, opts.method)),
  };
}

export interface UpcomingOccasion {
  occasion: Occasion;
  day: DayInfo;
  /** 0 = today. */
  inDays: number;
}

/**
 * Every occasion from `fromJdn` up to (not including) the same Hijri date a year later — so each
 * occasion appears exactly once, in date order (Tools → Occasions).
 */
export function upcomingOccasions(fromJdn: number, opts: ConversionOptions): UpcomingOccasion[] {
  const start = hijriOfJdn(fromJdn, opts);
  const nextYear = start.year + 1;
  const day = Math.min(start.day, hijriMonthLength(nextYear, start.month, opts.method));
  const end = jdnOfHijri({ year: nextYear, month: start.month, day }, opts);
  const out: UpcomingOccasion[] = [];
  for (let jdn = fromJdn; jdn < end; jdn++) {
    const info = dayInfo(jdn, opts);
    for (const occasion of info.occasions) out.push({ occasion, day: info, inDays: jdn - fromJdn });
  }
  return out;
}

export interface TodaySummary {
  today: DayInfo;
  /** Between Beirut's Maghrib and local midnight: the coming Hijri day whose night has begun. */
  eve: DayInfo | null;
  maghrib: Date | null;
  /** First upcoming occasion after today (within ~13 months). */
  next: { day: DayInfo; inDays: number } | null;
}

export function todaySummary(now: Date, opts: ConversionOptions): TodaySummary {
  const jdn = todayJdn(now);
  const today = dayInfo(jdn, opts);
  const { isEve, maghrib } = isEveningAfterMaghrib(now);
  let next: TodaySummary['next'] = null;
  for (let i = 1; i <= 400; i++) {
    const day = dayInfo(jdn + i, opts);
    if (day.occasions.length > 0) {
      next = { day, inDays: i };
      break;
    }
  }
  return { today, eve: isEve ? dayInfo(jdn + 1, opts) : null, maghrib, next };
}
