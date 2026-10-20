import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface Props {
  /** ASCII gradient id, unique among gradients rendered at the same time. */
  id: string;
  from: string;
  to: string;
  /** Decorative dots as [x fraction, y fraction, radius, opacity]. */
  stars?: ReadonlyArray<readonly [number, number, number, number]>;
}

/**
 * Diagonal gradient that always covers its parent exactly. Measures the parent with onLayout and
 * draws the SVG at those pixel sizes — `width="100%"` on an absolutely positioned <Svg> was
 * resolved once and didn't follow the parent when its content grew, which left the Today card's
 * text and watermark hanging outside a too-small gradient on Android. Re-measures on every
 * resize (wrapping text, language switch, rotation). Put it first inside a parent with
 * `overflow: 'hidden'` (and the parent's border radius) and give the parent a solid fallback
 * background for the frame before the first measurement.
 */
export function GradientFill({ id, from, to, stars }: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.width - width) > 0.5 || Math.abs(size.height - height) > 0.5) {
      setSize({ width, height });
    }
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {size && size.width > 0 && size.height > 0 && (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${id})`} />
          {stars?.map(([fx, fy, r, opacity], i) => (
            <Circle key={i} cx={fx * size.width} cy={fy * size.height} r={r} fill="#FFFFFF" opacity={opacity} />
          ))}
        </Svg>
      )}
    </View>
  );
}
