import {
  gregorianMonthLength,
  gregorianToJdn,
  jdnToGregorian,
  spanBetween,
  weekdayOfJdn,
} from '../calendar';
import { formatGregorian, formatHijri, localizeDigits } from '../format';
import { hijriMonthLength, jdnFromHijri } from '../hijri';
import { maghribInstant } from '../maghrib';
import { occasionsOn } from '../occasions';

describe('Gregorian <-> JDN', () => {
  it('known anchors', () => {
    expect(gregorianToJdn({ year: 2000, month: 1, day: 1 })).toBe(2451545);
    expect(gregorianToJdn({ year: 2002, month: 3, day: 22 })).toBe(2452356);
    expect(jdnToGregorian(2452356)).toEqual({ year: 2002, month: 3, day: 22 });
  });

  it('round-trips every day 1800-2200 and agrees with JS Date on weekdays', () => {
    const start = gregorianToJdn({ year: 1800, month: 1, day: 1 });
    const end = gregorianToJdn({ year: 2200, month: 12, day: 31 });
    for (let jdn = start; jdn <= end; jdn++) {
      const g = jdnToGregorian(jdn);
      expect(gregorianToJdn(g)).toBe(jdn);
      if (jdn % 97 === 0) {
        expect(weekdayOfJdn(jdn)).toBe(new Date(Date.UTC(g.year, g.month - 1, g.day)).getUTCDay());
      }
    }
  });

  it('month lengths incl. leap years', () => {
    expect(gregorianMonthLength(2024, 2)).toBe(29);
    expect(gregorianMonthLength(1900, 2)).toBe(28);
    expect(gregorianMonthLength(2000, 2)).toBe(29);
    expect(gregorianMonthLength(2026, 4)).toBe(30);
  });
});

describe('spanBetween', () => {
  const g = (from: string, to: string) => {
    const [a, b] = [from, to].map(s => {
      const [year, month, day] = s.split('-').map(Number);
      return { year, month, day };
    });
    return spanBetween(a, b, gregorianMonthLength, gregorianToJdn);
  };

  it('counts whole years, months and remaining days', () => {
    expect(g('2000-01-15', '2026-10-20')).toEqual({ years: 26, months: 9, days: 5 });
    expect(g('2026-10-20', '2026-10-20')).toEqual({ years: 0, months: 0, days: 0 });
    expect(g('2026-01-31', '2026-03-01')).toEqual({ years: 0, months: 1, days: 1 });
    expect(g('2024-02-29', '2025-02-28')).toEqual({ years: 0, months: 11, days: 30 });
  });

  it('works in the Hijri calendar too', () => {
    const span = spanBetween(
      { year: 1423, month: 1, day: 8 },
      { year: 1448, month: 5, day: 9 },
      (y, m) => hijriMonthLength(y, m, 'iran'),
      d => jdnFromHijri(d, 'iran'),
    );
    expect(span).toEqual({ years: 25, months: 4, days: 1 });
  });
});

describe('occasions', () => {
  it('finds Ashura and Eid al-Ghadir', () => {
    expect(occasionsOn({ year: 1448, month: 1, day: 10 }, 30).map(o => o.nameEn)).toEqual([
      'Ashura — Martyrdom of Imam Husayn (AS)',
    ]);
    expect(occasionsOn({ year: 1448, month: 12, day: 18 }, 29)).toHaveLength(1);
    expect(occasionsOn({ year: 1448, month: 1, day: 11 }, 30)).toHaveLength(0);
  });

  it("puts Imam al-Rida's martyrdom on the last day of Safar, 29 or 30", () => {
    const rida = 'Martyrdom of Imam Ali al-Rida (AS)';
    expect(occasionsOn({ year: 1448, month: 2, day: 29 }, 29).map(o => o.nameEn)).toContain(rida);
    expect(occasionsOn({ year: 1448, month: 2, day: 29 }, 30).map(o => o.nameEn)).not.toContain(rida);
    expect(occasionsOn({ year: 1448, month: 2, day: 30 }, 30).map(o => o.nameEn)).toContain(rida);
  });
});

describe('Maghrib (eve hint)', () => {
  it("matches Al Sirat's published Beirut Maghrib (2026-07-12 20:11 UTC+3) within a minute", () => {
    const m = maghribInstant({ year: 2026, month: 7, day: 12 });
    expect(m).not.toBeNull();
    const minutesUtc = m!.getUTCHours() * 60 + m!.getUTCMinutes() + m!.getUTCSeconds() / 60;
    expect(Math.abs(minutesUtc - (17 * 60 + 11))).toBeLessThanOrEqual(1);
  });
});

describe('formatting', () => {
  it('uses Arabic-Indic digits in Arabic', () => {
    expect(localizeDigits('1423', 'ar')).toBe('١٤٢٣');
    // \u00A0 keeps the year and its era marker on one line when a long date wraps.
    expect(formatHijri({ year: 1423, month: 1, day: 8 }, 'ar')).toBe('٨ محرّم ١٤٢٣\u00A0هـ');
    expect(formatHijri({ year: 1423, month: 1, day: 8 }, 'en')).toBe('8 Muharram 1423\u00A0AH');
    expect(formatGregorian({ year: 2002, month: 3, day: 22 }, 'en')).toBe('22 March 2002');
    expect(formatGregorian({ year: 2002, month: 3, day: 22 }, 'ar')).toBe('٢٢ آذار ٢٠٠٢\u00A0م');
  });
});
