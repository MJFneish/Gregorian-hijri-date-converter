import { useColorScheme } from 'react-native';

import { useSettingsStore } from '../store/useSettingsStore';
import { darkTheme, lightTheme } from './colors';

/** Same shape as prayer-times-lb's hook: theme mode lives in the persisted settings store. */
export function useTheme() {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore(s => s.themeMode);
  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  return { colors: isDark ? darkTheme : lightTheme, isDark };
}
