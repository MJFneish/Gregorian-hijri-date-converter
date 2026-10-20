/** Kept separate from `src/i18n/index.ts` so the pure calendar core (and its Jest tests) can use
 * the type without pulling in i18next / native modules. */
export type Language = 'en' | 'ar';

export const LANGUAGES: readonly Language[] = ['en', 'ar'];
