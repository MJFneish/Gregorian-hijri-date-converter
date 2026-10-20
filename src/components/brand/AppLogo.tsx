import React from 'react';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { brand } from '../../theme/colors';

/**
 * The app's emblem: a gold crescent (the lunar Hijri calendar) holding a small sun (the solar
 * Gregorian calendar), circled by two arrows (conversion). Original artwork. The exact same
 * geometry is written to assets/brand/*.svg by scripts/generate-icons.js for the launcher icon
 * and the native splash — keep the two in sync if either changes.
 */

// Crescent = circle C1 (50,50 r30) minus circle C2 (62,42 r25); intersection points precomputed.
export const CRESCENT_PATH = 'M50.13 20 A30 30 0 1 0 77.75 61.42 A25 25 0 1 1 50.13 20 Z';
export const SUN = { cx: 68, cy: 38, r: 6.5, rayFrom: 9.5, rayTo: 13 };

const ARROW_RADIUS = 44;

function polar(angleDeg: number, r = ARROW_RADIUS) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}

/** Clockwise arc from `fromDeg` to `toDeg` with an arrowhead at the end. */
export function arrowArc(fromDeg: number, toDeg: number): { arc: string; head: string } {
  const p0 = polar(fromDeg);
  const p1 = polar(toDeg);
  const arc = `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${ARROW_RADIUS} ${ARROW_RADIUS} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  // Arrowhead: two short strokes pointing back along the clockwise tangent.
  const a = (toDeg * Math.PI) / 180;
  const tangent = { x: -Math.sin(a), y: Math.cos(a) };
  const len = 7;
  const spread = (32 * Math.PI) / 180;
  const back = (rot: number) => ({
    x: p1.x - len * (tangent.x * Math.cos(rot) - tangent.y * Math.sin(rot)),
    y: p1.y - len * (tangent.x * Math.sin(rot) + tangent.y * Math.cos(rot)),
  });
  const l = back(spread);
  const r = back(-spread);
  const head = `M${l.x.toFixed(2)} ${l.y.toFixed(2)} L${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L${r.x.toFixed(2)} ${r.y.toFixed(2)}`;
  return { arc, head };
}

export const ARROWS = [arrowArc(205, 290), arrowArc(25, 110)];

interface Props {
  size: number;
  /** Draw the rounded-square gradient tile behind the emblem (like the launcher icon). */
  tile?: boolean;
  /** Hide the conversion arrows (e.g. when an animated ring replaces them). */
  arrows?: boolean;
  goldColor?: string;
  lightColor?: string;
}

export function AppLogo({ size, tile = false, arrows = true, goldColor = brand.gold, lightColor = brand.moonlight }: Props) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return {
      x1: SUN.cx + SUN.rayFrom * Math.cos(a),
      y1: SUN.cy + SUN.rayFrom * Math.sin(a),
      x2: SUN.cx + SUN.rayTo * Math.cos(a),
      y2: SUN.cy + SUN.rayTo * Math.sin(a),
    };
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no">
      <Defs>
        <LinearGradient id="logoTile" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2B1F7A" />
          <Stop offset="1" stopColor="#5A47D6" />
        </LinearGradient>
        <LinearGradient id="logoGold" x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor="#FFE3A3" />
          <Stop offset="1" stopColor={goldColor} />
        </LinearGradient>
      </Defs>
      {tile && <Rect x="0" y="0" width="100" height="100" rx="22" fill="url(#logoTile)" />}
      <G transform={tile ? 'translate(16 16) scale(0.68)' : undefined}>
        <Path d={CRESCENT_PATH} fill="url(#logoGold)" />
        <Circle cx={SUN.cx} cy={SUN.cy} r={SUN.r} fill={lightColor} />
        {rays.map((r, i) => (
          <Line key={i} {...r} stroke={lightColor} strokeWidth={2.2} strokeLinecap="round" />
        ))}
        {arrows &&
          ARROWS.map((a, i) => (
            <G key={i}>
              <Path d={a.arc} stroke={lightColor} strokeOpacity={0.9} strokeWidth={3.2} fill="none" strokeLinecap="round" />
              <Path d={a.head} stroke={lightColor} strokeOpacity={0.9} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </G>
          ))}
      </G>
    </Svg>
  );
}
