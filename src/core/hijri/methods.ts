/**
 * The calendar authorities the app can follow. How each table is produced (data sources, crescent
 * rules, calibration numbers) is documented in scripts/build-hijri-tables.js and CLAUDE.md.
 */
export type MethodId = 'iran' | 'fadlallah' | 'sistani' | 'ummalqura';

/** The user's explicit choice: Iran's official calendar is the default. */
export const DEFAULT_METHOD: MethodId = 'iran';

/** Display order in Settings — the Shia methods first, Umm al-Qura last as a Sunni reference. */
export const METHOD_IDS: readonly MethodId[] = ['iran', 'fadlallah', 'sistani', 'ummalqura'];

/** Manual "Hijri date adjustment" range (days), applied on top of whichever method is chosen. */
export const MAX_ADJUSTMENT = 2;

export function isMethodId(value: unknown): value is MethodId {
  return typeof value === 'string' && (METHOD_IDS as readonly string[]).includes(value);
}
