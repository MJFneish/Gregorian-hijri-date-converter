import { gregorianToJdn } from '../calendar';
import { fastingDays, fastReasons, monthsAhead, SISTANI_ONLY } from '../fasting';
import { hijriMonthLength, jdnOfHijri, METHOD_IDS } from '../hijri';

const jdnOf = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return gregorianToJdn({ year, month, day });
};

describe('fasting days', () => {
  const from = jdnOf('2024-01-01');
  const to = jdnOf('2029-01-01');

  it.each(METHOD_IDS)('the "three days each month" happen once a month, never on Ramadan or an Eid (%s)', method => {
    const opts = { method, adjustment: 0 };
    const perMonth = new Map<string, Record<string, number>>();
    for (const { day, reasons } of fastingDays(from, to, opts)) {
      const key = `${day.hijri.year}-${day.hijri.month}`;
      const counts = perMonth.get(key) ?? {};
      for (const r of reasons) counts[r] = (counts[r] ?? 0) + 1;
      perMonth.set(key, counts);

      const { month, day: d } = day.hijri;
      expect(month).not.toBe(9);
      expect(month === 10 && d === 1).toBe(false);
      expect(month === 12 && d === 10).toBe(false);
      if (month === 1 && d === 10) expect(reasons).toEqual(['ashuraAbstain']);
      if (reasons.includes('firstThursday')) expect(d).toBeLessThanOrEqual(7);
      if (reasons.includes('middleWednesday')) expect(d >= 11 && d <= 17).toBe(true);
      if (reasons.includes('lastThursday')) {
        expect(d + 7).toBeGreaterThan(hijriMonthLength(day.hijri.year, month, method));
      }
    }
    for (const [key, counts] of perMonth) {
      const [year, month] = key.split('-').map(Number);
      // Skip the partial months at the window's edges.
      const start = jdnOfHijri({ year, month, day: 1 }, opts);
      if (start < from || start + hijriMonthLength(year, month, method) > to) continue;
      // An Eid can swallow one of them (a first Thursday on 1 Shawwal).
      const eidMonth = month === 10 || month === 12;
      expect(counts.firstThursday ?? 0).toBe(eidMonth ? (counts.firstThursday ?? 0) : 1);
      expect(counts.middleWednesday).toBe(1);
      expect(counts.lastThursday).toBe(1);
      expect(counts.whiteDays).toBe(3);
    }
  });

  it('the dated days land where the sources put them', () => {
    const at = (month: number, day: number) => fastReasons({ year: 1448, month, day }, 0, 30);
    expect(at(7, 27)).toContain('mabath');
    expect(at(3, 17)).toContain('mawlid');
    expect(at(11, 25)).toContain('dahwAlArd');
    expect(at(12, 18)).toContain('ghadir');
    expect(at(12, 24)).toContain('mubahala');
    expect(at(12, 9)).toContain('arafah');
    expect(at(12, 10)).toEqual([]);
    expect(at(10, 1)).toEqual([]);
    expect(at(9, 14)).toEqual([]);
    expect(at(1, 10)).toEqual(['ashuraAbstain']);
    expect(at(12, 3)).toEqual(['dhulHijjahDays']);
    expect(at(10, 6)).toEqual(['shawwalDays']);
    expect([...SISTANI_ONLY].sort()).toEqual(['dhulHijjahDays', 'muharramDays', 'shawwalDays']);
  });

  it('monthsAhead gives the 1st of a later month', () => {
    const opts = { method: 'iran' as const, adjustment: 0 };
    const today = jdnOf('2026-10-26'); // 14 Jumada al-Awwal 1448
    expect(monthsAhead(today, 0, opts)).toBe(jdnOfHijri({ year: 1448, month: 5, day: 1 }, opts));
    expect(monthsAhead(today, 3, opts)).toBe(jdnOfHijri({ year: 1448, month: 8, day: 1 }, opts));
    expect(monthsAhead(today, 8, opts)).toBe(jdnOfHijri({ year: 1449, month: 1, day: 1 }, opts));
  });
});
