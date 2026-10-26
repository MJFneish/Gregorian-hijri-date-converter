import { countPhrase, spanPhrase } from '../plural';

describe('countPhrase', () => {
  it('Arabic dual is nominative on its own and genitive after a preposition', () => {
    expect(countPhrase('day', 2, 'ar')).toBe('يومان');
    expect(countPhrase('day', 2, 'ar', true)).toBe('يومين');
    expect(countPhrase('month', 2, 'ar', true)).toBe('شهرين');
    expect(countPhrase('year', 2, 'ar', true)).toBe('سنتين');
    expect(countPhrase('week', 2, 'ar', true)).toBe('أسبوعين');
  });

  it('other counts read the same either way', () => {
    for (const n of [1, 3, 10, 11, 19, 100]) {
      expect(countPhrase('day', n, 'ar', true)).toBe(countPhrase('day', n, 'ar'));
    }
    expect(countPhrase('day', 19, 'ar')).toBe('١٩ يومًا');
    expect(countPhrase('day', 3, 'ar')).toBe('٣ أيام');
    expect(countPhrase('day', 2, 'en', true)).toBe('2 days');
  });

  it('spanPhrase joins the non-zero parts', () => {
    expect(spanPhrase({ years: 25, months: 7, days: 3 }, 'en')).toBe('25 years, 7 months and 3 days');
    expect(spanPhrase({ years: 2, months: 0, days: 1 }, 'ar')).toBe('سنتان ويوم واحد');
    expect(spanPhrase({ years: 0, months: 0, days: 0 }, 'en')).toBe('0 days');
  });
});
