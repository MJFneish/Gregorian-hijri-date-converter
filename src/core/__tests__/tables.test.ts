/* eslint-disable no-bitwise -- editing the 12-bit month masks */
import fs from 'fs';
import path from 'path';

import {
  BUNDLED_TABLES,
  currentTables,
  hijriFromJdn,
  hijriSource,
  jdnFromHijri,
  setTableData,
  TABLE_FIRST_YEAR,
  validateTableData,
  type TableData,
} from '../hijri';

const remoteJson = () =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'data', 'hijri-tables.json'), 'utf8'));

/** A copy of the bundled tables with one year's month mask replaced. */
function withYearMask(method: 'iran', year: number, mutate: (bits: number) => number, generated = '2099-01-01T00:00:00Z') {
  const raw = remoteJson();
  const lengths: string = raw.methods[method].lengths;
  const i = (year - TABLE_FIRST_YEAR) * 3;
  const bits = mutate(parseInt(lengths.slice(i, i + 3), 16));
  raw.methods[method].lengths = lengths.slice(0, i) + bits.toString(16).padStart(3, '0') + lengths.slice(i + 3);
  raw.generated = generated;
  return raw;
}

afterEach(() => setTableData(BUNDLED_TABLES));

describe('downloadable tables (data/hijri-tables.json)', () => {
  it('match the bundled tables exactly — rerun the build script and commit both', () => {
    const data = validateTableData(remoteJson());
    expect(data).not.toBeNull();
    expect(data!.generated).toBe(BUNDLED_TABLES.generated);
    expect(data!.iranLastOfficial).toEqual(BUNDLED_TABLES.iranLastOfficial);
    expect(data!.methods).toEqual(JSON.parse(JSON.stringify(BUNDLED_TABLES.methods)));
  });

  it('rejects anything malformed or implausible', () => {
    const bad: Array<[string, (raw: any) => void]> = [
      ['format', raw => (raw.format = 2)],
      ['year range', raw => (raw.lastYear = 1501)],
      ['timestamp', raw => (raw.generated = 'yesterday')],
      ['missing method', raw => delete raw.methods.sistani],
      ['short mask', raw => (raw.methods.iran.lengths = raw.methods.iran.lengths.slice(3))],
      ['not hex', raw => (raw.methods.iran.lengths = 'z' + raw.methods.iran.lengths.slice(1))],
      ['Iran cutoff', raw => (raw.iranLastOfficial = { year: 1447, month: 13 })],
      ['drift', raw => (raw.methods.fadlallah.firstJdn += 5)],
    ];
    expect(validateTableData(null)).toBeNull();
    expect(validateTableData('nope')).toBeNull();
    for (const [label, mutate] of bad) {
      const raw = remoteJson();
      mutate(raw);
      expect([label, validateTableData(raw)]).toEqual([label, null]);
    }
    // A year with only 4 thirty-day months would be 352 days — impossible.
    expect(validateTableData(withYearMask('iran', 1448, () => 0b000000001111))).toBeNull();
  });
});

describe('setTableData', () => {
  it('a downloaded correction moves the month start everywhere', () => {
    // Find a 29-day month followed by a 30-day one in Iran's 1448 and swap them, as if the office
    // had announced the next month a day later than predicted.
    const i = (1448 - TABLE_FIRST_YEAR) * 3;
    const bits = parseInt(remoteJson().methods.iran.lengths.slice(i, i + 3), 16);
    const k = [...Array(11).keys()].find(m => !((bits >> m) & 1) && (bits >> (m + 1)) & 1)!;
    expect(k).toBeDefined();
    const [shorter, moved, after] = [k + 1, k + 2, k + 3]; // 1-based months
    const before = jdnFromHijri({ year: 1448, month: moved, day: 1 }, 'iran');
    const afterStart = jdnFromHijri({ year: 1448, month: after, day: 1 }, 'iran');

    const corrected = validateTableData(withYearMask('iran', 1448, b => (b | (1 << k)) & ~(1 << (k + 1))));
    expect(corrected).not.toBeNull();
    setTableData(corrected as TableData);
    expect(currentTables().generated).toBe('2099-01-01T00:00:00Z');
    expect(jdnFromHijri({ year: 1448, month: moved, day: 1 }, 'iran')).toBe(before + 1);
    expect(hijriFromJdn(before, 'iran')).toEqual({ year: 1448, month: shorter, day: 30 });
    // The month after is unchanged: the two lengths were only swapped.
    expect(jdnFromHijri({ year: 1448, month: after, day: 1 }, 'iran')).toBe(afterStart);
  });

  it("moves Iran's official/calculated cutoff with the data", () => {
    const raw = remoteJson();
    raw.generated = '2099-01-01T00:00:00Z';
    raw.iranLastOfficial = { year: 1448, month: 5 };
    expect(hijriSource({ year: 1448, month: 5, day: 1 }, 'iran')).toBe('calculated');
    setTableData(validateTableData(raw) as TableData);
    expect(hijriSource({ year: 1448, month: 5, day: 1 }, 'iran')).toBe('official');
    expect(hijriSource({ year: 1448, month: 6, day: 1 }, 'iran')).toBe('calculated');
  });
});
