import { useMemo } from 'react';

import type { ConversionOptions } from '../core/hijri';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTableStore } from '../store/useTableStore';

/** The user's method + adjustment, memoized so it can sit in dependency arrays. Its identity
 * also changes when downloaded month tables replace the ones in use (useTableStore.version), so
 * every memoized conversion keyed on it recomputes. */
export function useConversionOptions(): ConversionOptions {
  const method = useSettingsStore(s => s.method);
  const adjustment = useSettingsStore(s => s.adjustment);
  const tablesVersion = useTableStore(s => s.version);
  return useMemo(() => ({ method, adjustment, tablesVersion }), [method, adjustment, tablesVersion]);
}
