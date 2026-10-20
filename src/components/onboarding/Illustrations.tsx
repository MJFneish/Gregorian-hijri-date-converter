import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, RadialGradient } from 'react-native-svg';

import { localizeDigits } from '../../core/format';
import { gregorianMonthName, hijriMonthName } from '../../core/hijri';
import type { Language } from '../../i18n/language';
import { brand } from '../../theme/colors';
import { ARROWS, CRESCENT_PATH } from '../brand/AppLogo';

/**
 * Original onboarding artwork, drawn in code (SVG + Reanimated) so it themes, scales and mirrors
 * cleanly and carries no image-licensing questions. Every loop is skipped under reduced motion.
 */

interface ArtProps {
  size: number;
  lang: Language;
}

function useLoop(duration: number, { reverse = true, delay = 0 }: { reverse?: boolean; delay?: number } = {}) {
  const still = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    v.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, reverse));
  }, [v, duration, reverse, delay, still]);
  return v;
}

function useLinearSpin(duration: number) {
  const still = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    v.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [v, duration, still]);
  return v;
}

function Twinkle({ x, y, r, delay }: { x: number; y: number; r: number; delay: number }) {
  const still = useReducedMotion();
  const o = useSharedValue(0.4);
  useEffect(() => {
    if (still) return;
    o.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.3, { duration: 1100 })), -1));
  }, [o, delay, still]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: brand.moonlight }, style]}
    />
  );
}

const STAR_FIELD = [
  [0.1, 0.15, 1.8, 0],
  [0.25, 0.08, 1.2, 500],
  [0.86, 0.12, 2, 900],
  [0.72, 0.3, 1.3, 300],
  [0.14, 0.62, 1.4, 1200],
  [0.9, 0.7, 1.6, 700],
  [0.5, 0.06, 1.2, 1500],
] as const;

function StarField({ size }: { size: number }) {
  const h = size * 0.8;
  return (
    <>
      {STAR_FIELD.map(([fx, fy, r, d], i) => (
        <Twinkle key={i} x={fx * size} y={fy * h} r={r} delay={d} />
      ))}
    </>
  );
}

// 1 ── Welcome: crescent with the sun orbiting it.
export function WelcomeArt({ size }: ArtProps) {
  const h = size * 0.8;
  const orbit = useLinearSpin(9000);
  const glow = useLoop(2200);
  const orbitSize = h * 0.86;
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${orbit.value * 360}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.55 + glow.value * 0.35, transform: [{ scale: 0.92 + glow.value * 0.1 }] }));
  const crescent = h * 0.52;
  return (
    <View style={{ width: size, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <StarField size={size} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, glowStyle]}>
        <Svg width={h * 0.8} height={h * 0.8}>
          <Defs>
            <RadialGradient id="wGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={brand.gold} stopOpacity={0.45} />
              <Stop offset="1" stopColor={brand.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={h * 0.4} cy={h * 0.4} r={h * 0.4} fill="url(#wGlow)" />
        </Svg>
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Svg width={orbitSize} height={orbitSize}>
          <Circle
            cx={orbitSize / 2}
            cy={orbitSize / 2}
            r={orbitSize / 2 - 10}
            stroke={brand.moonlight}
            strokeOpacity={0.35}
            strokeWidth={1.5}
            strokeDasharray="4 7"
            fill="none"
          />
        </Svg>
      </View>
      <Svg width={crescent} height={crescent} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="wGold" x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#FFE3A3" />
            <Stop offset="1" stopColor={brand.gold} />
          </LinearGradient>
        </Defs>
        <Path d={CRESCENT_PATH} fill="url(#wGold)" />
      </Svg>
      <Animated.View style={[styles.orbit, { width: orbitSize, height: orbitSize }, orbitStyle]} pointerEvents="none">
        <Svg width={orbitSize} height={orbitSize}>
          <Circle cx={orbitSize / 2} cy={10} r={9} fill="#FFD58A" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <Path
                key={i}
                d={`M${orbitSize / 2 + 12 * Math.cos(a)} ${10 + 12 * Math.sin(a)} L${orbitSize / 2 + 16 * Math.cos(a)} ${10 + 16 * Math.sin(a)}`}
                stroke="#FFD58A"
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      </Animated.View>
    </View>
  );
}

// 2 ── Convert: a Gregorian and a Hijri calendar page, swap arrows between them.
const SWAP_SIZE = 80;
function CalendarPage({ header, big, sub, color, float, phase }: {
  header: string;
  big: string;
  sub: string;
  color: string;
  float: SharedValue<number>;
  phase: 1 | -1;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: (float.value - 0.5) * 10 * phase }, { rotate: `${phase * -6}deg` }],
  }));
  return (
    <Animated.View style={[styles.page, style]}>
      <View style={[styles.pageHeader, { backgroundColor: color }]}>
        <Text style={styles.pageHeaderText} numberOfLines={1} adjustsFontSizeToFit>
          {header}
        </Text>
      </View>
      <Text style={styles.pageBig}>{big}</Text>
      <Text style={styles.pageSub} numberOfLines={1} adjustsFontSizeToFit>
        {sub}
      </Text>
    </Animated.View>
  );
}

export function ConvertArt({ size, lang }: ArtProps) {
  const h = size * 0.8;
  const float = useLoop(2400);
  const spin = useLinearSpin(6000);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  return (
    <View style={{ width: size, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <StarField size={size} />
      <View style={[styles.pages, { flexDirection: lang === 'ar' ? 'row-reverse' : 'row' }]}>
        <CalendarPage
          header={`${gregorianMonthName(3, lang)} ${localizeDigits(2002, lang)}`}
          big={localizeDigits(22, lang)}
          sub={lang === 'ar' ? 'ميلادي' : 'Gregorian'}
          color="#4B3AC0"
          float={float}
          phase={1}
        />
        <Animated.View style={[styles.swapIcon, spinStyle]}>
          <Svg width={SWAP_SIZE} height={SWAP_SIZE} viewBox="0 0 100 100">
            {ARROWS.map((a, i) => (
              <G key={i}>
                <Path d={a.arc} stroke={brand.moonlight} strokeWidth={7} fill="none" strokeLinecap="round" />
                <Path d={a.head} stroke={brand.moonlight} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </G>
            ))}
          </Svg>
        </Animated.View>
        <CalendarPage
          header={`${hijriMonthName(1, lang)} ${localizeDigits(1423, lang)}`}
          big={localizeDigits(8, lang)}
          sub={lang === 'ar' ? 'هجري' : 'Hijri'}
          color="#B7832A"
          float={float}
          phase={-1}
        />
      </View>
    </View>
  );
}

// 3 ── Methods: sighting the new crescent at sunset.
export function MethodsArt({ size }: ArtProps) {
  const h = size * 0.8;
  const rise = useLoop(2600);
  const crescentStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + rise.value * 0.65,
    transform: [{ translateY: (1 - rise.value) * 8 }],
  }));
  return (
    <View style={{ width: size, height: h }}>
      <Svg width={size} height={h} viewBox="0 0 300 240" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="mSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1A1452" stopOpacity={0} />
            <Stop offset="0.55" stopColor="#7B4BB7" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#F29E5C" stopOpacity={0.9} />
          </LinearGradient>
          <RadialGradient id="mSun" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFD58A" />
            <Stop offset="1" stopColor="#F29E5C" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="60" width="300" height="140" fill="url(#mSky)" />
        <Circle cx="110" cy="196" r="46" fill="url(#mSun)" />
        <Circle cx="110" cy="196" r="20" fill="#FFC870" />
        <Path d="M0 190 C40 170 80 176 120 186 C160 196 200 168 240 172 C265 175 285 182 300 188 L300 240 L0 240 Z" fill="#1E1747" />
        <Path d="M0 210 C50 196 100 204 150 210 C200 216 250 200 300 206 L300 240 L0 240 Z" fill="#120E33" />
        {/* Observer on a hill */}
        <Circle cx="232" cy="160" r="5" fill="#120E33" />
        <Path d="M226 186 L229 167 L235 167 L238 186 Z" fill="#120E33" />
        <Path d="M234 170 L252 158" stroke="#120E33" strokeWidth={4} strokeLinecap="round" />
      </Svg>
      <StarField size={size} />
      <Animated.View style={[{ position: 'absolute', left: size * 0.6, top: h * 0.22 }, crescentStyle]}>
        <Svg width={size * 0.16} height={size * 0.16} viewBox="0 0 100 100">
          <G transform="rotate(-25 50 50)">
            <Path d="M50 18 A32 32 0 1 0 82 50 A27 27 0 1 1 50 18 Z" fill={brand.gold} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

// 4 ── Occasions: a swinging lantern (fanous) glowing in the night.
export function OccasionsArt({ size }: ArtProps) {
  const h = size * 0.8;
  const swing = useLoop(2200);
  const glow = useLoop(1800, { delay: 300 });
  const lanternW = size * 0.34;
  const swingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(swing.value - 0.5) * 12}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.5 + glow.value * 0.45 }));
  return (
    <View style={{ width: size, height: h, alignItems: 'center' }}>
      <StarField size={size} />
      <Animated.View style={[{ alignItems: 'center', transformOrigin: 'top' }, swingStyle]}>
        <View style={{ width: 2, height: h * 0.16, backgroundColor: 'rgba(233,229,255,0.6)' }} />
        <View style={{ width: lanternW, height: lanternW * 1.55, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, glowStyle]}>
            <Svg width={lanternW * 1.9} height={lanternW * 1.9}>
              <Defs>
                <RadialGradient id="lGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFD58A" stopOpacity={0.7} />
                  <Stop offset="1" stopColor="#FFD58A" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={lanternW * 0.95} cy={lanternW * 0.95} r={lanternW * 0.95} fill="url(#lGlow)" />
            </Svg>
          </Animated.View>
          <Svg width={lanternW} height={lanternW * 1.55} viewBox="0 0 100 155">
            <Path d="M42 4 A8 8 0 1 1 58 4" stroke={brand.gold} strokeWidth={4} fill="none" />
            <Path d="M30 14 L70 14 L80 30 L20 30 Z" fill={brand.gold} />
            <Path d="M22 30 L78 30 L86 110 L14 110 Z" fill="#5A47D6" stroke={brand.gold} strokeWidth={4} />
            <Path d="M34 36 L66 36 L72 104 L28 104 Z" fill="#FFD58A" opacity={0.9} />
            <Path d="M50 36 L50 104 M31 70 L69 70" stroke={brand.gold} strokeWidth={3} />
            <Path d="M14 110 L86 110 L74 128 L26 128 Z" fill={brand.gold} />
            <Ellipse cx="50" cy="136" rx="10" ry="6" fill={brand.gold} />
            <Path d="M50 142 L50 154" stroke={brand.gold} strokeWidth={3} strokeLinecap="round" />
          </Svg>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute' },
  pages: { alignItems: 'center', gap: 8 },
  page: {
    width: 104,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  pageHeader: { alignSelf: 'stretch', paddingVertical: 6, paddingHorizontal: 6, alignItems: 'center' },
  pageHeaderText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  pageBig: { fontSize: 44, fontWeight: '800', color: '#16132B', marginTop: 4 },
  pageSub: { fontSize: 12, fontWeight: '600', color: '#5B5873', paddingHorizontal: 6 },
  swapIcon: { width: SWAP_SIZE, height: SWAP_SIZE },
});
