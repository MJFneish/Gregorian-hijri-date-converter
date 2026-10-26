import { gregorianToJdn } from '../calendar';
import { METHOD_IDS } from '../hijri';
import { OCCASIONS } from '../occasions';
import { todaySummary, upcomingOccasions } from '../today';

describe('upcomingOccasions', () => {
  const starts = ['2026-10-26', '2026-03-20', '2025-07-06', '2030-01-01'].map(iso => {
    const [year, month, day] = iso.split('-').map(Number);
    return gregorianToJdn({ year, month, day });
  });

  it('lists every occasion exactly once over the coming Hijri year, in date order', () => {
    for (const method of METHOD_IDS) {
      for (const from of starts) {
        const list = upcomingOccasions(from, { method, adjustment: 0 });
        expect(list).toHaveLength(OCCASIONS.length);
        expect(new Set(list.map(u => u.occasion)).size).toBe(OCCASIONS.length);
        for (let i = 1; i < list.length; i++) expect(list[i].day.jdn).toBeGreaterThanOrEqual(list[i - 1].day.jdn);
        for (const u of list) {
          expect(u.inDays).toBe(u.day.jdn - from);
          expect(u.day.occasions).toContain(u.occasion);
        }
      }
    }
  });

  it("starts with the Today card's next occasion", () => {
    const now = new Date(2026, 9, 26, 10);
    const opts = { method: 'iran' as const, adjustment: 0 };
    const { next } = todaySummary(now, opts);
    const list = upcomingOccasions(gregorianToJdn({ year: 2026, month: 10, day: 26 }), opts);
    const first = list.find(u => u.inDays > 0);
    expect(first?.day.jdn).toBe(next?.day.jdn);
  });
});
