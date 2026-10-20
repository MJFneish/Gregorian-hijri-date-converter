import { Platform, type ViewStyle } from 'react-native';

/** Soft card shadow, theme-aware (same helper shape as lexitoon's elevation.ts). */
export function elevation(shadowColor: string, level: 1 | 2 = 1): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor,
      shadowOpacity: 1,
      shadowRadius: level === 1 ? 10 : 18,
      shadowOffset: { width: 0, height: level === 1 ? 4 : 8 },
    },
    default: { elevation: level === 1 ? 2 : 6, shadowColor },
  })!;
}
