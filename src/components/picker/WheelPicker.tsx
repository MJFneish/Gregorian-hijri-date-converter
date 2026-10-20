import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
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

/**
 * iOS-style scroll wheel. Native date pickers can't show Hijri months, so the converter uses
 * three of these per calendar.
 *
 * Deliberately a plain virtualized FlatList with a static selection band + fade overlays rather
 * than per-row animated styles: the year wheel has ~195 rows, and a Reanimated style per row
 * would recompute all of them every scroll frame. Only the centered row's emphasis is React state,
 * updated when the centered index changes (not every pixel).
 *
 * The padding trick: rows report `offset = index * height` from getItemLayout while the content
 * has `PAD` padding on top, so scroll offset `i * height` puts row `i` exactly in the middle — and
 * `initialScrollIndex` / `scrollToOffset` work without extra math.
 */
export function WheelPicker({ items, selectedIndex, onChange, accessibilityLabel, fadeColor }: Props) {
  const { colors } = useTheme();
  const listRef = useRef<FlatList<string>>(null);
  const lastReported = useRef(selectedIndex);
  const scrollY = useRef(selectedIndex * WHEEL_ITEM_HEIGHT);
  const centerRef = useRef(selectedIndex);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [centerIndex, setCenterIndex] = useState(selectedIndex);
  const maxIndex = items.length - 1;

  const setCenter = useCallback((i: number) => {
    if (i !== centerRef.current) {
      centerRef.current = i;
      setCenterIndex(i);
    }
  }, []);

  // Follow changes made from outside (Today button, day clamped by a shorter month, etc.).
  useEffect(() => {
    if (selectedIndex !== lastReported.current) {
      lastReported.current = selectedIndex;
      setCenter(selectedIndex);
      listRef.current?.scrollToOffset({ offset: selectedIndex * WHEEL_ITEM_HEIGHT, animated: true });
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
      if (scroll) listRef.current?.scrollToOffset({ offset: i * WHEEL_ITEM_HEIGHT, animated: true });
      setCenter(i);
      if (i !== lastReported.current) {
        lastReported.current = i;
        onChange(i);
      }
    },
    [maxIndex, onChange, setCenter],
  );

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

  const gradientId = `wheelFade-${accessibilityLabel}`;

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
      <FlatList
        ref={listRef}
        data={items as string[]}
        keyExtractor={(_, i) => String(i)}
        extraData={centerIndex}
        getItemLayout={(_, index) => ({ length: WHEEL_ITEM_HEIGHT, offset: WHEEL_ITEM_HEIGHT * index, index })}
        initialScrollIndex={clamp(selectedIndex, maxIndex)}
        initialNumToRender={15}
        windowSize={7}
        contentContainerStyle={{ paddingVertical: PAD }}
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
        renderItem={({ item, index }) => {
          const centered = index === centerIndex;
          return (
            <Pressable style={styles.item} onPress={() => commit(index, true)} importantForAccessibility="no">
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[
                  typography.body,
                  styles.itemText,
                  centered
                    ? { color: colors.text, fontWeight: '700', fontSize: 18 }
                    : { color: colors.textMuted, opacity: Math.abs(index - centerIndex) > 1 ? 0.55 : 0.85 },
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        }}
      />
      <Svg pointerEvents="none" style={styles.fadeTop} width="100%" height={PAD}>
        <Defs>
          <LinearGradient id={`${gradientId}-t`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fadeColor} stopOpacity={0.95} />
            <Stop offset="1" stopColor={fadeColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={PAD} fill={`url(#${gradientId}-t)`} />
      </Svg>
      <Svg pointerEvents="none" style={styles.fadeBottom} width="100%" height={PAD}>
        <Defs>
          <LinearGradient id={`${gradientId}-b`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fadeColor} stopOpacity={0} />
            <Stop offset="1" stopColor={fadeColor} stopOpacity={0.95} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={PAD} fill={`url(#${gradientId}-b)`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: WHEEL_ITEM_HEIGHT * VISIBLE_ROWS,
    overflow: 'hidden',
  },
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
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  fadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
