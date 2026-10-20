import fs from 'fs';
import path from 'path';

import { gregorianToJdn, jdnToGregorian, weekdayOfJdn } from '../calendar';
import {
  gregorianToHijri,
  hijriFromJdn,
  hijriMonthLength,
  hijriSource,
  hijriToGregorian,
  jdnFromHijri,
  METHOD_IDS,
  TABLE_FIRST_YEAR,
  TABLE_LAST_YEAR,
  type MethodId,
} from '../hijri';
import { tabularFromJdn } from '../hijri/tabular';

const iso = (s: string) => {
  const [year, month, day] = s.split('-').map(Number);
  return { year, month, day };
};
const opts = (method: MethodId, adjustment = 0) => ({ method, adjustment });

describe("the user's ground-truth example: 2002-03-22 = Friday 8 Muharram 1423", () => {
  it('is a Friday', () => {
    expect(weekdayOfJdn(gregorianToJdn(iso('2002-03-22')))).toBe(5);
  });

  it('is 8 Muharram 1423 under Fadlallah (calculation, shared night)', () => {
    expect(gregorianToHijri(iso('2002-03-22'), opts('fadlallah'))).toEqual({ year: 1423, month: 1, day: 8 });
  });

  it("is 7 Muharram 1423 in Iran's official calendar (1 Muharram was Sat 16 Mar there)", () => {
    expect(gregorianToHijri(iso('2002-03-22'), opts('iran'))).toEqual({ year: 1423, month: 1, day: 7 });
    expect(hijriToGregorian({ year: 1423, month: 1, day: 1 }, opts('iran'))).toEqual(iso('2002-03-16'));
  });

  it('converts back the other way', () => {
    expect(hijriToGregorian({ year: 1423, month: 1, day: 8 }, opts('fadlallah'))).toEqual(iso('2002-03-22'));
  });
});

describe('Fadlallah office announcements', () => {
  // [Hijri month, first day as announced by Sayyed Fadlallah's office]
  const KNOWN: Array<[number, number, string]> = [
    [1423, 1, '2002-03-15'],
    [1432, 9, '2011-08-01'],
    [1435, 10, '2014-07-28'],
    [1446, 10, '2025-03-30'],
    [1447, 10, '2026-03-20'],
  ];
  it.each(KNOWN)('%i/%i starts on %s', (year, month, first) => {
    expect(hijriToGregorian({ year, month, day: 1 }, opts('fadlallah'))).toEqual(iso(first));
  });
});

describe("Iran official table reproduces every published month start (qamari, CC0)", () => {
  const lines = fs
    .readFileSync(path.join(__dirname, '../../../scripts/data/qamari-consolidated.txt'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);
  const rows = lines
    .map(l => l.match(/^\*?(\d{4})\/(\d{1,2}) (\d{4}-\d{2}-\d{2})/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(m => ({ year: Number(m[1]), month: Number(m[2]), first: m[3] }))
    .filter(r => r.year >= TABLE_FIRST_YEAR);

  it('covers the whole published range', () => {
    expect(rows.length).toBeGreaterThan(1250);
  });

  it('matches all of them', () => {
    const mismatches = rows.filter(
      r => jdnFromHijri({ year: r.year, month: r.month, day: 1 }, 'iran') !== gregorianToJdn(iso(r.first)),
    );
    expect(mismatches).toEqual([]);
  });

  it('labels published months official and later ones calculated', () => {
    expect(hijriSource({ year: 1447, month: 10, day: 1 }, 'iran')).toBe('official');
    expect(hijriSource({ year: 1448, month: 1, day: 1 }, 'iran')).toBe('calculated');
    expect(hijriSource({ year: 1423, month: 1, day: 1 }, 'fadlallah')).toBe('calculated');
    expect(hijriSource({ year: 1320, month: 1, day: 1 }, 'iran')).toBe('approximate');
  });
});

describe('Umm al-Qura table matches ICU (islamic-umalqura)', () => {
  const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  it('for every day 1990-2050', () => {
    const bad: string[] = [];
    for (let jdn = gregorianToJdn(iso('1990-01-01')); jdn <= gregorianToJdn(iso('2050-12-31')); jdn++) {
      const g = jdnToGregorian(jdn);
      const parts = Object.fromEntries(
        fmt.formatToParts(new Date(Date.UTC(g.year, g.month - 1, g.day, 12))).map(p => [p.type, p.value]),
      );
      const expected = {
        year: Number(String(parts.year ?? parts.relatedYear).replace(/\D/g, '')),
        month: Number(parts.month),
        day: Number(parts.day),
      };
      const actual = hijriFromJdn(jdn, 'ummalqura');
      if (actual.year !== expected.year || actual.month !== expected.month || actual.day !== expected.day) {
        bad.push(`${g.year}-${g.month}-${g.day}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('table integrity, every method', () => {
  // Sighting-based years can be 353 or 356 days (arithmetic calendars only ever give 354/355);
  // Iran's real published calendar contains such years, so that range is the correct invariant.
  it.each(METHOD_IDS)('%s: every month is 29 or 30 days and every year 353-356', method => {
    for (let y = TABLE_FIRST_YEAR; y <= TABLE_LAST_YEAR; y++) {
      let yearLength = 0;
      for (let m = 1; m <= 12; m++) {
        const len = hijriMonthLength(y, m, method);
        expect([29, 30]).toContain(len);
        yearLength += len;
      }
      expect([353, 354, 355, 356]).toContain(yearLength);
    }
  });

  it.each(METHOD_IDS)('%s: Gregorian -> Hijri -> Gregorian round-trips for every day in range', method => {
    const first = jdnFromHijri({ year: TABLE_FIRST_YEAR, month: 1, day: 1 }, method);
    const last = jdnFromHijri({ year: TABLE_LAST_YEAR, month: 12, day: hijriMonthLength(TABLE_LAST_YEAR, 12, method) }, method);
    for (let jdn = first - 400; jdn <= last + 400; jdn++) {
      expect(jdnFromHijri(hijriFromJdn(jdn, method), method)).toBe(jdn);
    }
  });

  it('methods never disagree by more than 2 days', () => {
    for (let jdn = gregorianToJdn(iso('1950-01-01')); jdn <= gregorianToJdn(iso('2070-12-31')); jdn += 3) {
      const reference = jdnFromHijri(hijriFromJdn(jdn, 'iran'), 'fadlallah');
      expect(Math.abs(reference - jdn)).toBeLessThanOrEqual(2);
    }
  });
});

describe('arithmetic fallback outside the tables', () => {
  const civil = new Intl.DateTimeFormat('en-u-ca-islamic-civil', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  it('matches ICU islamic-civil (1880-1923 and 2078-2100)', () => {
    const ranges: Array<[string, string]> = [
      ['1880-01-01', '1923-12-31'],
      ['2078-01-01', '2100-12-31'],
    ];
    for (const [from, to] of ranges) {
      for (let jdn = gregorianToJdn(iso(from)); jdn <= gregorianToJdn(iso(to)); jdn += 7) {
        const g = jdnToGregorian(jdn);
        const parts = Object.fromEntries(
          civil.formatToParts(new Date(Date.UTC(g.year, g.month - 1, g.day, 12))).map(p => [p.type, p.value]),
        );
        expect(tabularFromJdn(jdn)).toEqual({
          year: Number(String(parts.year ?? parts.relatedYear).replace(/\D/g, '')),
          month: Number(parts.month),
          day: Number(parts.day),
        });
      }
    }
  });

  it('is used for years outside the table and still round-trips', () => {
    const date = { year: 1320, month: 5, day: 10 };
    expect(gregorianToHijri(hijriToGregorian(date, opts('iran')), opts('iran'))).toEqual(date);
  });
});

describe('manual adjustment', () => {
  it('shifts the Hijri date, and the reverse conversion undoes it', () => {
    const g = iso('2002-03-22');
    expect(gregorianToHijri(g, opts('fadlallah', 1))).toEqual({ year: 1423, month: 1, day: 9 });
    expect(gregorianToHijri(g, opts('fadlallah', -2))).toEqual({ year: 1423, month: 1, day: 6 });
    for (const adjustment of [-2, -1, 0, 1, 2]) {
      expect(hijriToGregorian(gregorianToHijri(g, opts('iran', adjustment)), opts('iran', adjustment))).toEqual(g);
    }
  });
});
