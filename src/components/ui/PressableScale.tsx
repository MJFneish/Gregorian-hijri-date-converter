import React from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Style for the outer (touch) box — use for flex sizing; visuals go in `style`. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Fade the control when disabled (default). Pass false for "busy" buttons that are disabled
   * only to block double presses and already show a spinner. */
  dimWhenDisabled?: boolean;
  children: React.ReactNode;
}

/**
 * Press feedback by scaling. The `Pressable` itself stays plain and the animation lives on an
 * inner `Animated.View`: wrapping Pressable with `Animated.createAnimatedComponent` silently stops
 * it receiving touches on RN 0.87 + Reanimated 4 + Fabric (found the hard way in lexitoon — see its
 * CLAUDE.md "Known gotchas").
 */
export function PressableScale({
  style,
  containerStyle,
  children,
  onPressIn,
  onPressOut,
  disabled,
  dimWhenDisabled = true,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={containerStyle}
      onPressIn={e => {
        scale.value = withTiming(0.96, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={e => {
        scale.value = withTiming(1, { duration: 140 });
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, animated, disabled && dimWhenDisabled && styles.dimmed]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dimmed: { opacity: 0.45 },
});
