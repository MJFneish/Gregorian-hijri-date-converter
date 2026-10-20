import { weekdayOfJdn, gregorianToJdn, type GregorianDate } from './calendar';
import { gregorianMonthName, hijriMonthName, weekdayName } from './hijri/names';
import type { HijriDate } from './hijri/types';
import type { Language } from '../i18n/language';

const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Non-breaking space: keeps "1448 AH" / "١٤٤٨ هـ" together when a long date wraps. */
const NBSP = '\u00A0';

/** Arabic UI shows Arabic-Indic digits (١٤٢٣), like prayer-times-lb does. */
export function localizeDigits(value: string | number, lang: Language): string {
  const s = String(value);
  return lang === 'ar' ? s.replace(/[0-9]/g, d => ARABIC_INDIC[Number(d)]) : s;
}

export function formatHijri(date: HijriDate, lang: Language): string {
  const month = hijriMonthName(date.month, lang);
  return lang === 'ar'
    ? localizeDigits(`${date.day} ${month} ${date.year}${NBSP}هـ`, lang)
    : `${date.day} ${month} ${date.year}${NBSP}AH`;
}

export function formatGregorian(date: GregorianDate, lang: Language): string {
  const month = gregorianMonthName(date.month, lang);
  return lang === 'ar'
    ? localizeDigits(`${date.day} ${month} ${date.year}${NBSP}م`, lang)
    : `${date.day} ${month} ${date.year}`;
}

export function formatWeekday(date: GregorianDate, lang: Language): string {
  return weekdayName(weekdayOfJdn(gregorianToJdn(date)), lang);
}

/** Local wall-clock time, 24h "18:42" (Arabic digits in Arabic). */
export function formatTime(instant: Date, lang: Language): string {
  const hh = String(instant.getHours()).padStart(2, '0');
  const mm = String(instant.getMinutes()).padStart(2, '0');
  return localizeDigits(`${hh}:${mm}`, lang);
}
