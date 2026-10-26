import { conjunctionNear, crescentAt, bestOf, IRAN_CITIES, monthStartForecast, NAJAF, V_MAYBE_EYE, V_NAKED_EYE } from '../crescent';
import { gregorianToJdn, jdnToGregorian } from '../calendar';
import { hijriMonthLength, IRAN_LAST_OFFICIAL, jdnFromHijri, METHOD_IDS } from '../hijri';

const noonUtc = (jdn: number) => {
  const { year, month, day } = jdnToGregorian(jdn);
  return new Date(Date.UTC(year, month - 1, day, 12));
};

describe('crescent visibility reproduces the build-time tables (same Odeh rule)', () => {
  it("Sistani: a month has 29 days exactly when the crescent is naked-eye visible from Najaf on the 29th's evening", () => {
    for (let year = 1440; year <= 1450; year++) {
      for (let month = 1; month <= 12; month++) {
        const day29 = jdnFromHijri({ year, month, day: 1 }, 'sistani') + 28;
        const report = crescentAt(day29, NAJAF, conjunctionNear(noonUtc(day29)));
        expect([`${year}/${month}`, (report.v ?? -Infinity) >= V_NAKED_EYE]).toEqual([
          `${year}/${month}`,
          hijriMonthLength(year, month, 'sistani') === 29,
        ]);
      }
    }
  });

  it('Iran (predicted months): 29 days exactly when it is visible (V ≥ 2) from any of the 6 cities', () => {
    for (let year = IRAN_LAST_OFFICIAL.year; year <= 1450; year++) {
      for (let month = 1; month <= 12; month++) {
        if (year === IRAN_LAST_OFFICIAL.year && month <= IRAN_LAST_OFFICIAL.month) continue;
        const day29 = jdnFromHijri({ year, month, day: 1 }, 'iran') + 28;
        const { report } = bestOf(day29, IRAN_CITIES, conjunctionNear(noonUtc(day29)));
        expect([`${year}/${month}`, (report.v ?? -Infinity) >= V_MAYBE_EYE]).toEqual([
          `${year}/${month}`,
          hijriMonthLength(year, month, 'iran') === 29,
        ]);
      }
    }
  });
});

describe('monthStartForecast', () => {
  it('covers the 29th and 30th evenings and every office’s 1st of the next month', () => {
    const opts = { method: 'iran' as const, adjustment: 0 };
    const f = monthStartForecast({ year: 1448, month: 5 }, opts);
    expect(f.starting).toEqual({ year: 1448, month: 6 });
    const first = jdnFromHijri({ year: 1448, month: 5, day: 1 }, 'iran');
    expect(f.evenings.map(e => [e.monthDay, e.jdn])).toEqual([
      [29, first + 28],
      [30, first + 29],
    ]);
    expect(f.starts.map(s => s.method)).toEqual(METHOD_IDS);
    for (const s of f.starts) expect(s.jdn).toBe(jdnFromHijri({ year: 1448, month: 6, day: 1 }, s.method));
    // The new moon of 9 Nov 2026 (07:02 UTC) is the one found.
    expect(f.conjunction!.toISOString().slice(0, 13)).toBe('2026-11-09T07');
  });

  it('an evening before the conjunction has no crescent yet', () => {
    const jdn = gregorianToJdn({ year: 2026, month: 11, day: 8 });
    expect(crescentAt(jdn, NAJAF, conjunctionNear(noonUtc(jdn))).visibility).toBe('notBorn');
  });
});
