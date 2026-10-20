import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

/** Placeholder for the result card while a conversion runs: pulsing bars shaped like the label,
 * date, weekday line and source chip it replaces (so the card barely changes height), plus a
 * spinner with "Converting…" for screen readers and anyone who reads the bars as decoration. */
export function ResultSkeleton() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, isRTL } = useDirection();
  const still = useReducedMotion();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    if (still) return;
    pulse.value = withRepeat(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse, still]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  // Muted text colour at low opacity reads as a placeholder on the card in both themes (surfaceAlt
  // was nearly invisible against the dark card on the emulator).
  const bar = (width: DimensionValue, height: number, marginTop = 0) => (
    <View
      style={[
        styles.bar,
        { width, height, marginTop, backgroundColor: colors.textMuted, alignSelf: isRTL ? 'flex-end' : 'flex-start' },
      ]}
    />
  );

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t('home.converting')} accessibilityLiveRegion="polite">
      <Animated.View style={pulseStyle}>
        {bar('34%', 12)}
        {bar('82%', 30, spacing.sm)}
        {bar('52%', 30, spacing.xs)}
        {bar('60%', 16, spacing.sm)}
        {bar(112, 26, spacing.md)}
      </Animated.View>
      <View style={[styles.status, { flexDirection: rowDirection }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[typography.bodyStrong, { color: colors.primary }]}>{t('home.converting')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderRadius: radius.sm, opacity: 0.22 },
  status: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, minHeight: 48 },
});
