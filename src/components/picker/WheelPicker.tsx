import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '../../theme/useTheme';
import { radius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const WHEEL_ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const PAD = WHEEL_ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);
const SETTLE_DELAY_MS = 120;

interface Props {
  items: readonly string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  /** Screen-reader name, e.g. "Month". */
  accessibilityLabel: string;
  /** Background behind the wheel — the top/bottom fades blend into it. */
  fadeColor: string;
}

const clamp = (i: number, max: number) => Math.min(Math.max(i, 0), max);

// ASCII-only ids for the SVG fade gradients — `url(#…)` lookups in react-native-svg shouldn't
// depend on a (possibly Arabic) label.
let nextGradientId = 0;

/** 0 = centered row, 1 = its neighbours, 2 = further out. */
type Emphasis = 0 | 1 | 2;

/** Memoized so a change of the centered row only re-renders the 3–5 rows whose emphasis changed,
 * not every row of the year wheel. */
const WheelRow = memo(function WheelRow({
  label,
  index,
  emphasis,
  onPressRow,
}: {
  label: string;
  index: number;
  emphasis: Emphasis;
  onPressRow: (index: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable style={styles.item} onPress={() => onPressRow(index)} importantForAccessibility="no">
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={[
          typography.body,
          styles.itemText,
          emphasis === 0
            ? [styles.centered, { color: colors.text }]
            : { color: colors.textMuted, opacity: emphasis === 1 ? 0.85 : 0.55 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

/**
 * iOS-style scroll wheel. Native date pickers can't show Hijri months, so the converter uses
 * three of these per calendar.
 *
 * A plain ScrollView, deliberately not a FlatList: the wheels live inside the Home screen's
 * vertical ScrollView, and a same-direction VirtualizedList nested in a ScrollView breaks
 * windowing (React Native warns about it). The lists are small (≤ ~200 years) and every row is
 * a memoized one-line Text, so virtualization isn't needed. A static selection band + fade
 * overlays replace per-row animated styles; only the centered index is React state, updated when
 * it changes (not every pixel).
 *
 * Geometry: the content has `PAD` (2 rows) of padding top and bottom, so scroll offset
 * `i * height` puts row `i` exactly in the middle.
 */
export function WheelPicker({ items, selectedIndex, onChange, accessibilityLabel, fadeColor }: Props) {
  const { colors } = useTheme();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const lastReported = useRef(selectedIndex);
  const scrollY = useRef(selectedIndex * WHEEL_ITEM_HEIGHT);
  const centerRef = useRef(selectedIndex);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positioned = useRef({ layout: false, content: false, done: false });
  const [centerIndex, setCenterIndex] = useState(selectedIndex);
  const maxIndex = items.length - 1;

  const setCenter = useCallback((i: number) => {
    if (i !== centerRef.current) {
      centerRef.current = i;
      setCenterIndex(i);
    }
  }, []);

  // Initial position: scroll once both the ScrollView and its content have been laid out
  // (Android ignores scrollTo before that; `contentOffset` covers iOS's first frame).
  const positionInitially = (part: 'layout' | 'content') => {
    const p = positioned.current;
    p[part] = true;
    if (p.layout && p.content && !p.done) {
      p.done = true;
      scrollRef.current?.scrollTo({ y: lastReported.current * WHEEL_ITEM_HEIGHT, animated: false });
    }
  };

  // Follow changes made from outside (Today button, day clamped by a shorter month, etc.).
  useEffect(() => {
    if (selectedIndex !== lastReported.current) {
      lastReported.current = selectedIndex;
      setCenter(selectedIndex);
      scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: true });
    }
  }, [selectedIndex, setCenter]);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  const commit = useCallback(
    (index: number, scroll: boolean) => {
      const i = clamp(index, maxIndex);
      if (scroll) scrollRef.current?.scrollTo({ y: i * WHEEL_ITEM_HEIGHT, animated: true });
      setCenter(i);
      if (i !== lastReported.current) {
        lastReported.current = i;
        onChange(i);
      }
    },
    [maxIndex, onChange, setCenter],
  );

  const onPressRow = useCallback((index: number) => commit(index, true), [commit]);

  const settle = useCallback(
    (y: number) => {
      const i = clamp(Math.round(y / WHEEL_ITEM_HEIGHT), maxIndex);
      commit(i, Math.abs(i * WHEEL_ITEM_HEIGHT - y) > 1);
    },
    [commit, maxIndex],
  );

  const cancelSettle = () => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollY.current = y;
    setCenter(clamp(Math.round(y / WHEEL_ITEM_HEIGHT), maxIndex));
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') commit(lastReported.current + 1, true);
    if (e.nativeEvent.actionName === 'decrement') commit(lastReported.current - 1, true);
  };

  const gradientId = useRef(`wheelFade${nextGradientId++}`).current;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: items[selectedIndex] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
    >
      <View pointerEvents="none" style={[styles.band, { backgroundColor: colors.primarySoft }]} />
      <ScrollView
        ref={scrollRef}
        contentOffset={{ x: 0, y: selectedIndex * WHEEL_ITEM_HEIGHT }}
        onLayout={() => positionInitially('layout')}
        onContentSizeChange={() => positionInitially('content')}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.985}
        nestedScrollEnabled
        overScrollMode="never"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={cancelSettle}
        onScrollEndDrag={() => {
          cancelSettle();
          settleTimer.current = setTimeout(() => settle(scrollY.current), SETTLE_DELAY_MS);
        }}
        onMomentumScrollBegin={cancelSettle}
        onMomentumScrollEnd={e => settle(e.nativeEvent.contentOffset.y)}
      >
        {items.map((label, index) => (
          <WheelRow
            key={index}
            label={label}
            index={index}
            emphasis={Math.min(Math.abs(index - centerIndex), 2) as Emphasis}
            onPressRow={onPressRow}
          />
        ))}
      </ScrollView>
      <Svg pointerEvents="none" style={styles.fadeTop} width="100%" height={PAD}>
        <Defs>
          <LinearGradient id={`${gradientId}t`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fadeColor} stopOpacity={0.95} />
            <Stop offset="1" stopColor={fadeColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={PAD} fill={`url(#${gradientId}t)`} />
      </Svg>
      <Svg pointerEvents="none" style={styles.fadeBottom} width="100%" height={PAD}>
        <Defs>
          <LinearGradient id={`${gradientId}b`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fadeColor} stopOpacity={0} />
            <Stop offset="1" stopColor={fadeColor} stopOpacity={0.95} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={PAD} fill={`url(#${gradientId}b)`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: WHEEL_ITEM_HEIGHT * VISIBLE_ROWS,
    overflow: 'hidden',
  },
  content: { paddingVertical: PAD },
  band: {
    position: 'absolute',
    top: PAD,
    left: 2,
    right: 2,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: radius.md,
  },
  item: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  itemText: { textAlign: 'center' },
  centered: { fontWeight: '700', fontSize: 18 },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  fadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
