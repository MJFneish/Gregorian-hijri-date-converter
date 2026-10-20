/** 4/8 dp rhythm (same scale as prayer-times-lb). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Minimum touch target (Android 48dp guideline). */
export const TOUCH_TARGET = 48;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;
