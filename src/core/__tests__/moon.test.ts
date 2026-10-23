import * as Astronomy from 'astronomy-engine';

import { gregorianToJdn } from '../calendar';
import { hijriMonthLength, jdnOfHijri } from '../hijri';
import { illuminationPercent, moonPhaseAt, moonPhaseOnDay, type MoonPhaseName } from '../moon';

const DAY_MS = 86400e3;
const signed180 = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

/** 160 instants spread over the app's years (1925–2077), at drifting times of day. */
const SAMPLES = Array.from({ length: 160 }, (_, i) => new Date(Date.UTC(1925, 0, 1) + i * 347.77 * DAY_MS));

describe('moon phase vs astronomy-engine (full ephemeris)', () => {
  it('elongation within 0.5°', () => {
    for (const date of SAMPLES) {
      expect(Math.abs(signed180(moonPhaseAt(date).elongation - Astronomy.MoonPhase(date)))).toBeLessThan(0.5);
    }
  });

  it('illuminated fraction within 0.006', () => {
    for (const date of SAMPLES) {
      const reference = Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction;
      expect(Math.abs(moonPhaseAt(date).illumination - reference)).toBeLessThan(0.006);
    }
  });

  it('age (days since new moon) within ~1 hour', () => {
    for (const date of SAMPLES) {
      const newMoon = Astronomy.SearchMoonPhase(0, date, -31);
      expect(newMoon).not.toBeNull();
      const reference = (date.getTime() - newMoon!.date.getTime()) / DAY_MS;
      expect(Math.abs(moonPhaseAt(date).age - reference)).toBeLessThan(0.05);
    }
  });
});

describe('eclipses (exact new and full moons)', () => {
  it('total solar eclipse, 2024-04-08 18:17 UTC: new moon', () => {
    const moon = moonPhaseAt(new Date(Date.UTC(2024, 3, 8, 18, 17)));
    expect(moon.name).toBe('new');
    expect(moon.illumination).toBeLessThan(0.002);
    expect(Math.abs(signed180(moon.elongation))).toBeLessThan(0.3);
  });

  it('total lunar eclipse, 2025-03-14 06:59 UTC: full moon', () => {
    const moon = moonPhaseAt(new Date(Date.UTC(2025, 2, 14, 6, 59)));
    expect(moon.name).toBe('full');
    expect(moon.illumination).toBeGreaterThan(0.998);
  });
});

describe('phase names', () => {
  const first = gregorianToJdn({ year: 2026, month: 1, day: 1 });
  const days = Array.from({ length: 3 * 365 }, (_, i) => first + i);
  const named = (name: MoonPhaseName) => days.filter(jdn => moonPhaseOnDay(jdn).name === name);

  it.each<MoonPhaseName>(['new', 'full'])('"%s" names exactly one day per lunation', name => {
    const hits = named(name);
    expect(hits.length).toBeGreaterThanOrEqual(36);
    for (let i = 1; i < hits.length; i++) expect([29, 30]).toContain(hits[i] - hits[i - 1]);
  });

  it('the percentage never contradicts the name (100% only at full, 0% only at new)', () => {
    for (const jdn of days) {
      const moon = moonPhaseOnDay(jdn);
      const percent = illuminationPercent(moon);
      if (moon.name !== 'full') expect(percent).toBeLessThan(100);
      if (moon.name !== 'new') expect(percent).toBeGreaterThan(0);
    }
  });
});

describe('every day of a Hijri month has its own moon (Fadlallah, 1440–1450 AH)', () => {
  const opts = { method: 'fadlallah' as const, adjustment: 0 };
  for (let year = 1440; year <= 1450; year++) {
    for (let month = 1; month <= 12; month++) {
      it(`${year}/${month}`, () => {
        const start = jdnOfHijri({ year, month, day: 1 }, opts);
        const length = hijriMonthLength(year, month, 'fadlallah');
        const moons = Array.from({ length }, (_, i) => moonPhaseOnDay(start + i));

        // Day 1 (evening): a young waxing crescent.
        expect(moons[0].waxing).toBe(true);
        expect(moons[0].elongation).toBeGreaterThan(5);
        expect(moons[0].elongation).toBeLessThan(45);
        // Each evening the Moon has moved on by 9–16° (a different shape every day).
        for (let i = 1; i < length; i++) {
          const step = signed180(moons[i].elongation - moons[i - 1].elongation);
          expect(step).toBeGreaterThan(9);
          expect(step).toBeLessThan(16);
        }
        // Brightest around the middle of the month.
        const brightest = moons.reduce((best, m, i) => (m.illumination > moons[best].illumination ? i : best), 0) + 1;
        expect(brightest).toBeGreaterThanOrEqual(12);
        expect(brightest).toBeLessThanOrEqual(16);
      });
    }
  }
});
