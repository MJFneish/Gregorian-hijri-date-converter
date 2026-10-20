import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { AppLogo, ARROWS } from './brand/AppLogo';
import { brand } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

/** Must equal the native splash `--logo-width` (help.md) so the hand-off doesn't jump. */
const LOGO_SIZE = 120;
const BAR_WIDTH = 160;

// Deterministic "random" star field (fractions of the screen), so it looks the same every launch.
const STARS = [
  [0.12, 0.14, 2.2, 0],
  [0.82, 0.1, 1.6, 400],
  [0.68, 0.22, 2.6, 900],
  [0.24, 0.3, 1.4, 1300],
  [0.9, 0.36, 1.8, 200],
  [0.08, 0.52, 2, 1100],
  [0.86, 0.62, 1.5, 600],
  [0.18, 0.74, 2.4, 1500],
  [0.76, 0.8, 1.8, 300],
  [0.44, 0.88, 1.4, 1000],
  [0.56, 0.08, 1.4, 700],
  [0.36, 0.62, 1.2, 1700],
] as const;

function Star({ x, y, r, delay, still }: { x: number; y: number; r: number; delay: number; still: boolean }) {
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    if (still) return;
    opacity.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0.25, { duration: 1300 })), -1, true),
    );
  }, [opacity, delay, still]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.star, { left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r }, style]}
    />
  );
}

function Glow({ size, top, left, color, drift, duration, still }: {
  size: number;
  top: number;
  left: number;
  color: string;
  drift: number;
  duration: number;
  still: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, duration, still]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * drift }, { translateY: -t.value * drift * 0.6 }, { scale: 1 + t.value * 0.12 }],
  }));
  const id = `glow-${size}-${top}`;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top, left, width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

interface Props {
  /** Fired once the screen has laid out — App.tsx hides the native splash at that moment. */
  onReady?: () => void;
}

/**
 * Animated launch screen (same role as lexitoon's LoadingScreen, re-done in this app's night
 * palette): drifting glows, a twinkling star field, the emblem with its two conversion arrows
 * orbiting as the spinner, the app name, and an indeterminate bar. Its first frame is exactly the
 * native splash (same background color, same 120dp emblem, centered), so hiding the native splash
 * underneath is invisible. Fades itself out via `exiting` when App.tsx unmounts it.
 */
export function LoadingScreen({ onReady }: Props) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();

  const spin = useSharedValue(0);
  const breathe = useSharedValue(0);
  const bar = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    spin.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.cubic) }), -1, false);
    breathe.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
    bar.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [spin, breathe, bar, still]);

  const arrowsStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breathe.value * 0.04 }] }));
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -BAR_WIDTH * 0.4 + bar.value * BAR_WIDTH * 1.4 }],
  }));

  const onLayout = (_e: LayoutChangeEvent) => onReady?.();

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container]}
      exiting={FadeOut.duration(380)}
      onLayout={onLayout}
      accessibilityRole="progressbar"
      accessibilityLabel={t('loading.label')}
    >
      <Glow size={width * 1.1} top={-width * 0.35} left={-width * 0.4} color={brand.nightGlow} drift={30} duration={5200} still={still} />
      <Glow size={width * 0.9} top={height * 0.62} left={width * 0.35} color="#6A4FD8" drift={-26} duration={6400} still={still} />
      {STARS.map(([fx, fy, r, delay], i) => (
        <Star key={i} x={fx * width} y={fy * height} r={r} delay={delay} still={still} />
      ))}

      <View style={styles.center}>
        <Animated.View style={[styles.logo, logoStyle]}>
          <AppLogo size={LOGO_SIZE} arrows={false} />
        </Animated.View>
        <Animated.View style={[styles.logo, StyleSheet.absoluteFill, arrowsStyle]} pointerEvents="none">
          <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox="0 0 100 100">
            {ARROWS.map((a, i) => (
              <G key={i}>
                <Path d={a.arc} stroke={brand.moonlight} strokeOpacity={0.92} strokeWidth={3.2} fill="none" strokeLinecap="round" />
                <Path d={a.head} stroke={brand.moonlight} strokeOpacity={0.92} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </G>
            ))}
          </Svg>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.titleBlock}>
        <Text style={[typography.displayMedium, styles.title]}>{t('app.name')}</Text>
        <Text style={[typography.body, styles.tagline]}>{t('loading.tagline')}</Text>
      </Animated.View>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: brand.night,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 100,
  },
  star: { position: 'absolute', backgroundColor: brand.moonlight },
  center: { width: LOGO_SIZE, height: LOGO_SIZE },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  titleBlock: {
    position: 'absolute',
    top: '50%',
    marginTop: LOGO_SIZE / 2 + spacing.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: { color: '#FFFFFF', textAlign: 'center' },
  tagline: { color: 'rgba(233, 229, 255, 0.78)', textAlign: 'center', marginTop: spacing.xs },
  barTrack: {
    position: 'absolute',
    bottom: 72,
    width: BAR_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(233, 229, 255, 0.16)',
    overflow: 'hidden',
  },
  barFill: {
    width: BAR_WIDTH * 0.4,
    height: 4,
    borderRadius: 2,
    backgroundColor: brand.gold,
  },
});
