import { gregorianToJdn } from '../calendar';
import { compareOffices } from '../compare';
import { hijriFromJdn, jdnFromHijri, METHOD_IDS } from '../hijri';

const jdnOf = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return gregorianToJdn({ year, month, day });
};

describe('compareOffices', () => {
  it("the user's example day: Iran 7 Muharram, Fadlallah and Umm al-Qura 8 (a day ahead)", () => {
    const rows = compareOffices(jdnOf('2002-03-22'), 'iran');
    const byMethod = Object.fromEntries(rows.map(r => [r.method, r]));
    expect(rows.map(r => r.method)).toEqual(METHOD_IDS);
    expect(byMethod.iran.hijri).toEqual({ year: 1423, month: 1, day: 7 });
    expect(byMethod.iran.offset).toBe(0);
    expect(byMethod.fadlallah.hijri).toEqual({ year: 1423, month: 1, day: 8 });
    expect(byMethod.fadlallah.offset).toBe(1);
    expect(byMethod.ummalqura.offset).toBe(1);
    // Iran started 1423 on Sat 16 Mar 2002.
    expect(byMethod.iran.monthStart).toBe(jdnOf('2002-03-16'));
  });

  it('offsets flip sign when the reference changes', () => {
    const rows = compareOffices(jdnOf('2002-03-22'), 'fadlallah');
    expect(rows.find(r => r.method === 'iran')!.offset).toBe(-1);
    expect(rows.find(r => r.method === 'fadlallah')!.offset).toBe(0);
  });

  it('every offset says when the reference reaches the same date (3 years of days, all pairs)', () => {
    const first = jdnOf('2024-01-01');
    for (let jdn = first; jdn < first + 3 * 365; jdn++) {
      for (const reference of METHOD_IDS) {
        for (const row of compareOffices(jdn, reference)) {
          expect(Math.abs(row.offset)).toBeLessThanOrEqual(3);
          if (row.hijri.day <= 29) {
            // The reference shows this office's date `offset` days later.
            expect(hijriFromJdn(jdn + row.offset, reference)).toEqual(row.hijri);
          }
          expect(jdnFromHijri({ ...row.hijri, day: 1 }, row.method)).toBe(row.monthStart);
          expect(jdn - row.monthStart).toBe(row.hijri.day - 1);
        }
      }
    }
  });
});
