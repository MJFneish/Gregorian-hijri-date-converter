import { hijriBirthday } from '../birthday';
import { gregorianToJdn } from '../calendar';
import { hijriMonthLength, hijriOfJdn, jdnOfHijri, METHOD_IDS } from '../hijri';

const jdnOf = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return gregorianToJdn({ year, month, day });
};

describe('hijriBirthday', () => {
  it("born on the user's example day (8 Muharram 1423 under Fadlallah)", () => {
    const opts = { method: 'fadlallah' as const, adjustment: 0 };
    const today = jdnOf('2026-10-26');
    const b = hijriBirthday(jdnOf('2002-03-22'), today, opts);
    expect(b.birthHijri).toEqual({ year: 1423, month: 1, day: 8 });
    // Today is 15 Jumada al-Awwal 1448 under Fadlallah: the next one is 8 Muharram 1449, turning 26.
    expect(b.next.hijri).toEqual({ year: 1449, month: 1, day: 8 });
    expect(b.next.turning).toBe(26);
    expect(b.next.jdn).toBe(jdnOfHijri({ year: 1449, month: 1, day: 8 }, opts));
    expect(b.hijriAge.years).toBe(25);
    expect(b.gregorianAge).toEqual({ years: 24, months: 7, days: 4 });
  });

  it('the next birthday is the first matching date on or after today (many birthdays, all methods)', () => {
    const today = jdnOf('2026-10-26');
    for (const method of METHOD_IDS) {
      const opts = { method, adjustment: 0 };
      for (let birth = jdnOf('1950-01-01'); birth < today; birth += 97) {
        const b = hijriBirthday(birth, today, opts);
        expect(b.next.jdn).toBeGreaterThanOrEqual(today);
        expect(b.next.inDays).toBe(b.next.jdn - today);
        expect(b.next.inDays).toBeLessThan(356);
        expect(hijriOfJdn(b.next.jdn, opts)).toEqual(b.next.hijri);
        expect(b.next.hijri.month).toBe(b.birthHijri.month);
        expect(b.next.hijri.day).toBe(b.next.clamped ? 29 : b.birthHijri.day);
        expect(b.next.turning).toBe(b.next.hijri.year - b.birthHijri.year);
        // The year before is already past.
        const prevYear = b.next.hijri.year - 1;
        const prevDay = Math.min(b.birthHijri.day, hijriMonthLength(prevYear, b.birthHijri.month, method));
        expect(jdnOfHijri({ year: prevYear, month: b.birthHijri.month, day: prevDay }, opts)).toBeLessThan(today);
      }
    }
  });

  it('today is the birthday → 0 days', () => {
    const opts = { method: 'iran' as const, adjustment: 0 };
    const today = jdnOf('2026-10-26');
    const birth = jdnOfHijri({ ...hijriOfJdn(today, opts), year: 1420 }, opts);
    const b = hijriBirthday(birth, today, opts);
    expect(b.next.inDays).toBe(0);
    expect(b.next.turning).toBe(28);
  });
});
