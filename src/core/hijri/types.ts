export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
}

/**
 * Where a converted date comes from — shown as a small label under results so users know how
 * much to trust it:
 * - `official`   published by the authority itself (Iran's printed/observed calendar, Umm al-Qura)
 * - `calculated` computed from the authority's crescent-visibility rule (all Fadlallah/Sistani
 *                dates, and Iran's months after its last published one)
 * - `approximate` outside the precomputed range — arithmetic (tabular) calendar, ±1 day
 */
export type DateSource = 'official' | 'calculated' | 'approximate';
