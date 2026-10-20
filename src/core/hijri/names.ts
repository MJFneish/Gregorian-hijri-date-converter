import type { Language } from '../../i18n/language';

export const HIJRI_MONTHS_AR = [
  'محرّم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوّال',
  'ذو القعدة',
  'ذو الحجة',
] as const;

export const HIJRI_MONTHS_EN = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
] as const;

/** Levantine month names — what Lebanese calendars print (same set prayer-times-lb uses). */
export const GREGORIAN_MONTHS_AR = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تمّوز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول',
] as const;

export const GREGORIAN_MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const;
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function hijriMonthName(month: number, lang: Language): string {
  return (lang === 'ar' ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN)[month - 1];
}

export function gregorianMonthName(month: number, lang: Language): string {
  return (lang === 'ar' ? GREGORIAN_MONTHS_AR : GREGORIAN_MONTHS_EN)[month - 1];
}

/** 0 = Sunday. */
export function weekdayName(weekday: number, lang: Language): string {
  return (lang === 'ar' ? WEEKDAYS_AR : WEEKDAYS_EN)[weekday];
}
