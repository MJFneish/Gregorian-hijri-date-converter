import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';

import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  Icon?: LucideIcon;
}

interface Props<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

/** Pill segmented control with a sliding selection indicator (prayer-times-lb's language picker
 * shape, re-done with Reanimated so it slides instead of cross-fading). Mirrors in RTL. */
export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const { colors } = useTheme();
  const { isRTL } = useDirection();
  const [width, setWidth] = useState(0);
  const segmentWidth = options.length > 0 ? (width - 8) / options.length : 0;
  const selected = Math.max(0, options.findIndex(o => o.value === value));
  const visualIndex = isRTL ? options.length - 1 - selected : selected;

  const x = useSharedValue(0);
  const measured = useRef(false);
  useEffect(() => {
    if (segmentWidth <= 0) return;
    const target = visualIndex * segmentWidth;
    // Jump into place on the first measurement (no slide-in on mount); animate later changes.
    x.value = measured.current ? withTiming(target, { duration: 220 }) : target;
    measured.current = true;
  }, [visualIndex, segmentWidth, x]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: colors.surfaceAlt, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { width: segmentWidth, backgroundColor: colors.primary }, indicator]}
        />
      )}
      {options.map(({ value: optionValue, label, Icon }) => {
        const active = optionValue === value;
        const color = active ? colors.onPrimary : colors.text;
        return (
          <Pressable
            key={optionValue}
            style={styles.segment}
            onPress={() => onChange(optionValue)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={label}
          >
            {Icon && <Icon size={16} color={color} />}
            <Text numberOfLines={1} style={[typography.bodyStrong, { color, fontSize: 15 }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radius.pill,
    padding: 4,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radius.pill,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
});
