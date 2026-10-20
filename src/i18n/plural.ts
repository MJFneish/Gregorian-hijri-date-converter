import { localizeDigits } from '../core/format';
import type { Language } from './language';

/**
 * Counted phrases ("3 years", "٣ سنوات") without i18next's plural keys — those rely on
 * `Intl.PluralRules`, which Hermes doesn't reliably provide, and Arabic needs all six CLDR forms
 * (zero/one/two/few/many/other) to read naturally.
 */
export type Unit = 'year' | 'month' | 'week' | 'day';

type ArabicForms = { one: string; two: string; few: string; many: string; other: string };

const AR: Record<Unit, ArabicForms> = {
  year: { one: 'سنة واحدة', two: 'سنتان', few: '{n} سنوات', many: '{n} سنة', other: '{n} سنة' },
  month: { one: 'شهر واحد', two: 'شهران', few: '{n} أشهر', many: '{n} شهرًا', other: '{n} شهر' },
  week: { one: 'أسبوع واحد', two: 'أسبوعان', few: '{n} أسابيع', many: '{n} أسبوعًا', other: '{n} أسبوع' },
  day: { one: 'يوم واحد', two: 'يومان', few: '{n} أيام', many: '{n} يومًا', other: '{n} يوم' },
};

const EN: Record<Unit, [string, string]> = {
  year: ['year', 'years'],
  month: ['month', 'months'],
  week: ['week', 'weeks'],
  day: ['day', 'days'],
};

/** "9,780" / "٩٬٧٨٠". */
export function formatNumber(n: number, lang: Language): string {
  const grouped = String(Math.abs(Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'ar' ? '٬' : ',');
  return localizeDigits((n < 0 ? '-' : '') + grouped, lang);
}

function arabicForm(n: number): keyof ArabicForms {
  const mod100 = n % 100;
  if (n === 1) return 'one';
  if (n === 2) return 'two';
  if (mod100 >= 3 && mod100 <= 10) return 'few';
  if (mod100 >= 11 && mod100 <= 99) return 'many';
  return 'other';
}

export function countPhrase(unit: Unit, n: number, lang: Language): string {
  if (lang === 'ar') {
    if (n === 0) return `${localizeDigits(0, 'ar')} ${AR[unit].other.replace('{n} ', '')}`;
    return AR[unit][arabicForm(n)].replace('{n}', formatNumber(n, 'ar'));
  }
  return `${formatNumber(n, 'en')} ${EN[unit][n === 1 ? 0 : 1]}`;
}

/** Joins non-zero parts: "2 years, 3 months and 5 days" / "سنتان و٣ أشهر و٥ أيام". */
export function joinParts(parts: string[], lang: Language): string {
  if (parts.length <= 1) return parts.join('');
  if (lang === 'ar') return parts.join(' و');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
