import { useMemo } from 'react';

import type { ConversionOptions } from '../core/hijri';
import { useSettingsStore } from '../store/useSettingsStore';

/** The user's method + adjustment, memoized so it can sit in dependency arrays. */
export function useConversionOptions(): ConversionOptions {
  const method = useSettingsStore(s => s.method);
  const adjustment = useSettingsStore(s => s.adjustment);
  return useMemo(() => ({ method, adjustment }), [method, adjustment]);
}
