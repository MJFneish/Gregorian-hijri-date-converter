import { hijriMonthLength, jdnOfHijri, type ConversionOptions, type HijriDate } from './hijri';
import { dayInfo, type DayInfo } from './today';

/**
 * Recommended (mustahab) fasting days in Twelver jurisprudence, for Tools → Fasting days.
 * Researched (2026-10-26) in the marjas' own texts: Sayyed Sistani's Islamic Laws r.1716 and
 * Minhaj 1063–1066, Sayyed Khamenei's رساله نماز و روزه 976–980, Sayyed Fadlallah's treatise
 * (أنواع الصوم) — see CLAUDE.md "Fasting days". The main list is what those sources share; the
 * three SISTANI_ONLY reasons are in Sistani's list only (still recommended under Khamenei's
 * general rule that any day not forbidden or discouraged is). Never suggested: Ramadan
 * (obligatory), Eid al-Fitr and Eid al-Adha (forbidden), Ashura (discouraged — shown as
 * "abstain in mourning until after Asr" instead).
 */
export type FastReason =
  // "Three days each month" (صيام ثلاثة أيام من كل شهر)
  | 'firstThursday'
  | 'middleWednesday'
  | 'lastThursday'
  | 'whiteDays'
  | 'mabath'
  | 'mawlid'
  | 'dahwAlArd'
  | 'ghadir'
  | 'mubahala'
  | 'arafah'
  // Sayyed Sistani's list only
  | 'dhulHijjahDays'
  | 'muharramDays'
  | 'shawwalDays'
  // Not a fast: Ashura
  | 'ashuraAbstain';

export const SISTANI_ONLY: ReadonlySet<FastReason> = new Set<FastReason>(['dhulHijjahDays', 'muharramDays', 'shawwalDays']);

/** Months recommended as a whole (all of it or any day): Rajab and Sha'ban. */
export const WHOLE_MONTHS: readonly number[] = [7, 8];

const THURSDAY = 4;
const WEDNESDAY = 3;

/** Why a Hijri day is a recommended fast — empty when it isn't (or fasting is not allowed). */
export function fastReasons(hijri: HijriDate, weekday: number, monthLength: number): FastReason[] {
  const { month, day } = hijri;
  if (month === 9) return []; // Ramadan: obligatory, not "recommended"
  if ((month === 10 && day === 1) || (month === 12 && day === 10)) return []; // the two Eids: forbidden
  if (month === 1 && day === 10) return ['ashuraAbstain'];
  const reasons: FastReason[] = [];
  if (weekday === THURSDAY && day <= 7) reasons.push('firstThursday');
  // "The first Wednesday of the middle ten days" (11th–20th) is always the 11th–17th.
  if (weekday === WEDNESDAY && day >= 11 && day <= 17) reasons.push('middleWednesday');
  if (weekday === THURSDAY && day > monthLength - 7) reasons.push('lastThursday');
  if (day >= 13 && day <= 15) reasons.push('whiteDays');
  if (month === 7 && day === 27) reasons.push('mabath');
  if (month === 3 && day === 17) reasons.push('mawlid');
  if (month === 11 && day === 25) reasons.push('dahwAlArd');
  if (month === 12 && day === 18) reasons.push('ghadir');
  if (month === 12 && day === 24) reasons.push('mubahala');
  if (month === 12 && day === 9) reasons.push('arafah');
  if (month === 12 && day <= 8) reasons.push('dhulHijjahDays');
  if (month === 1 && (day === 1 || day === 3 || day === 7)) reasons.push('muharramDays');
  if (month === 10 && day >= 4 && day <= 9) reasons.push('shawwalDays');
  return reasons;
}

export interface FastingDay {
  day: DayInfo;
  reasons: FastReason[];
  /** 0 = today. */
  inDays: number;
}

/** Every day from `fromJdn` up to (not including) `toJdn` with a reason, in date order. */
export function fastingDays(fromJdn: number, toJdn: number, opts: ConversionOptions): FastingDay[] {
  const out: FastingDay[] = [];
  for (let jdn = fromJdn; jdn < toJdn; jdn++) {
    const day = dayInfo(jdn, opts);
    const reasons = fastReasons(day.hijri, day.weekday, hijriMonthLength(day.hijri.year, day.hijri.month, opts.method));
    if (reasons.length > 0) out.push({ day, reasons, inDays: jdn - fromJdn });
  }
  return out;
}

/** JDN of day 1 of the Hijri month `months` after the one containing `fromJdn`. */
export function monthsAhead(fromJdn: number, months: number, opts: ConversionOptions): number {
  const { year, month } = dayInfo(fromJdn, opts).hijri;
  const index = year * 12 + (month - 1) + months;
  return jdnOfHijri({ year: Math.floor(index / 12), month: (index % 12) + 1, day: 1 }, opts);
}
