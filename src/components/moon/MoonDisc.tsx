import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import type { MoonPhase } from '../../core/moon';
import { brand } from '../../theme/colors';

/** Full-moon photo texture (NASA LRO mosaic, projected by scripts/generate-moon.js). */
const TEXTURE = require('../../../assets/moon/moon.png');
/** Default diameter in dp = the texture's @1x size (BASE_SIZE in generate-moon.js), so every
 * density draws it pixel for pixel. */
export const MOON_SIZE = 96;

const DEG = Math.PI / 180;
/** Night-side tint. At the night side's 90% (last TERMINATOR_SHADING entry) a trace of the texture
 * survives, like earthshine. */
const NIGHT_COLOR = '#0A0822';
/**
 * How the light fades into the night side: [degrees from the terminator toward the sunlit side
 * (negative = into the night side), darkness reached past that line]. Each step is one translucent
 * shadow whose terminator is moved by that angle; stacked, they dim the lit side toward the
 * terminator the way the low sun there does on the real Moon, instead of a cut-out edge.
 * The last entry is the night side.
 */
const TERMINATOR_SHADING: ReadonlyArray<readonly [number, number]> = [
  [30, 0.03],
  [22, 0.07],
  [16, 0.12],
  [11, 0.19],
  [7.5, 0.27],
  [5, 0.36],
  [3, 0.46],
  [1.5, 0.57],
  [0, 0.7],
  [-1.5, 0.82],
  [-3, 0.9],
];
/** Per-layer opacity so the stack reaches each darkness: 1 - (1 - d) / (1 - d_previous). */
const SHADE_LAYERS = TERMINATOR_SHADING.map(([offset, darkness], i) => ({
  offset,
  opacity: 1 - (1 - darkness) / (1 - (i === 0 ? 0 : TERMINATOR_SHADING[i - 1][1])),
}));
/** Shadows overhang the limb by about a device pixel so they cover the texture's anti-aliased
 * edge (otherwise the night side shows a bright rim). Kept tiny: the overhang darkens the sky. */
const LIMB_OVERHANG = 0.35;

/** Space the view keeps around the disc for the glow (each side), in dp. A negative margin of this
 * much lines the disc itself up with neighbouring text. */
export const moonGlowMargin = (size: number) => Math.round(size * 0.1);

const clamp = (deg: number) => Math.min(180, Math.max(0, deg));
const f = (n: number) => n.toFixed(2);

/**
 * Night side of a disc centred at (c, c) with radius r, for a terminator `lit` degrees from new
 * (0 = all dark, 180 = all lit). The terminator is a half-ellipse through both poles whose
 * horizontal semi-axis is r·|cos lit|; waxing moons are lit on the right. Null when fully lit.
 */
function nightPath(c: number, r: number, lit: number, waxing: boolean): string | null {
  if (lit >= 180) return null;
  const cos = Math.cos(lit * DEG);
  const rx = Math.max(Math.abs(cos) * r, 0.01);
  // Top → bottom along the terminator: clockwise when it bulges to the right of centre.
  const terminatorSweep = (waxing ? cos : -cos) > 0 ? 1 : 0;
  const outer = r + LIMB_OVERHANG;
  // Bottom → top around the dark limb: the left one (clockwise) when waxing.
  const limbSweep = waxing ? 1 : 0;
  return (
    `M${f(c)} ${f(c - r)} A${f(rx)} ${f(r)} 0 0 ${terminatorSweep} ${f(c)} ${f(c + r)} ` +
    `L${f(c)} ${f(c + outer)} A${f(outer)} ${f(outer)} 0 0 ${limbSweep} ${f(c)} ${f(c - outer)} Z`
  );
}

interface Props {
  phase: MoonPhase;
  /** Moon diameter in dp; the view adds `moonGlowMargin(size)` each side for the glow. */
  size?: number;
  /** Gradient id, unique among moons on screen at once. */
  id?: string;
}

/**
 * The Moon as it looks on a given day — a real full-moon photo with the night side shaded at the
 * exact phase, so consecutive days always differ (not one of 8 phase icons). Drawn the way the
 * Moon is usually shown from the northern hemisphere: north up, waxing lit on the right. The soft
 * glow scales with brightness, so it's only noticeable near full. Meant for a dark (night-sky)
 * background; decorative for screen readers — callers describe the phase in text.
 */
export function MoonDisc({ phase, size = MOON_SIZE, id = 'moonGlow' }: Props) {
  const margin = moonGlowMargin(size);
  const box = size + margin * 2;
  const c = box / 2;
  const r = size / 2;
  const lit = phase.waxing ? phase.elongation : 360 - phase.elongation;
  const glow = 0.26 * phase.illumination * phase.illumination;

  return (
    <View
      style={{ width: box, height: box }}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Svg width={box} height={box} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={id} cx={c} cy={c} r={c} gradientUnits="userSpaceOnUse">
            <Stop offset={r / c} stopColor={brand.moonlight} stopOpacity={glow} />
            <Stop offset={1} stopColor={brand.moonlight} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill={`url(#${id})`} />
      </Svg>
      {/* fadeDuration 0: Android otherwise fades the photo in under already-drawn shadows. */}
      <Image
        source={TEXTURE}
        fadeDuration={0}
        style={{ position: 'absolute', left: margin, top: margin, width: size, height: size }}
      />
      <Svg width={box} height={box} style={StyleSheet.absoluteFill}>
        {SHADE_LAYERS.map(({ offset, opacity }) => {
          const d = nightPath(c, r, clamp(lit - offset), phase.waxing);
          return d && <Path key={offset} d={d} fill={NIGHT_COLOR} fillOpacity={opacity} />;
        })}
      </Svg>
    </View>
  );
}
