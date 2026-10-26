import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { CalendarRange, LayoutGrid, Settings2, type LucideIcon } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ToolsScreen from '../screens/ToolsScreen';
import { useDirection } from '../hooks/useDirection';
import { useTheme } from '../theme/useTheme';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { TabPagerContext } from './TabPagerContext';

const PAGES: Array<{ key: string; Component: React.ComponentType; Icon: LucideIcon; labelKey: string }> = [
  { key: 'home', Component: HomeScreen, Icon: CalendarRange, labelKey: 'tabs.home' },
  { key: 'tools', Component: ToolsScreen, Icon: LayoutGrid, labelKey: 'tabs.tools' },
  { key: 'settings', Component: SettingsScreen, Icon: Settings2, labelKey: 'tabs.settings' },
]; // order must match TAB_INDEX (TabPagerContext)

const FLING_VELOCITY = 600;
const SNAP_DURATION = 240;

/**
 * WhatsApp-style bottom tabs, same design as prayer-times-lb's tabs layout: every screen is laid
 * out side by side in one row, and a drag live-translates that row 1:1 with the finger — released
 * past halfway or with a fast flick it snaps to the neighbouring page, otherwise it springs back.
 * React Navigation's bottom-tabs swaps screens outright and has no live-drag concept, so this
 * replaces it; tabs are reached through `useTabPager().goToTab()`.
 *
 * Unlike prayer-times-lb, the row AND the tab bar mirror in Arabic (first tab on the right, swipe
 * right to go forward). Lexitoon showed that mirroring only one of the two feels inconsistent, so
 * both flip together here.
 */
export default function MainTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isRTL, rowDirection } = useDirection();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const count = PAGES.length;
  // Start on page 0's offset directly (in RTL that's not 0) so the first frame isn't the wrong page.
  const translateX = useSharedValue(isRTL ? -(count - 1) * width : 0);
  const dragStartX = useSharedValue(0);

  // Row offset that shows page `i`. In RTL the row is `row-reverse`, so page 0 sits at the far
  // right of the row and later pages extend leftward.
  const offsetFor = (i: number) => {
    'worklet';
    return isRTL ? -(count - 1 - i) * width : -i * width;
  };
  const indexFor = (tx: number) => {
    'worklet';
    return isRTL ? count - 1 + tx / width : -tx / width;
  };

  // Keep the visible page in place when the language flips direction or the window resizes.
  useEffect(() => {
    translateX.value = offsetFor(activeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRTL, width]);

  const goToTab = (index: number) => {
    const clamped = Math.min(Math.max(index, 0), count - 1);
    translateX.value = withTiming(offsetFor(clamped), { duration: SNAP_DURATION });
    setActiveIndex(clamped);
  };

  const minOffset = -(count - 1) * width;

  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12]) // vertical drags (scrolling, date wheels) never start a tab swipe
    .onStart(() => {
      dragStartX.value = translateX.value;
    })
    .onUpdate(e => {
      const next = dragStartX.value + e.translationX;
      // Rubber-band past the first/last page instead of hard-stopping the drag.
      if (next > 0) translateX.value = next * 0.3;
      else if (next < minOffset) translateX.value = minOffset + (next - minOffset) * 0.3;
      else translateX.value = next;
    })
    .onEnd(e => {
      const current = Math.round(indexFor(dragStartX.value));
      let target = Math.round(indexFor(dragStartX.value + e.translationX));
      if (Math.abs(e.velocityX) > FLING_VELOCITY) {
        // Moving the row leftward (negative velocity) means "next" in LTR, "previous" in RTL.
        const step = (e.velocityX < 0 ? 1 : -1) * (isRTL ? -1 : 1);
        target = current + step;
      }
      const clamped = Math.min(Math.max(target, 0), count - 1);
      translateX.value = withTiming(offsetFor(clamped), { duration: SNAP_DURATION });
      scheduleOnRN(setActiveIndex, clamped);
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  const contextValue = useMemo(
    () => ({ pagerPanGesture: panGesture, goToTab, activeIndex }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIndex, isRTL, width],
  );

  return (
    <TabPagerContext.Provider value={contextValue}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.row, { width: width * count, flexDirection: rowDirection }, rowStyle]}>
            {PAGES.map(({ key, Component }, index) => (
              <View
                key={key}
                style={{ width }}
                // Off-screen pages are hidden from screen readers.
                importantForAccessibility={index === activeIndex ? 'auto' : 'no-hide-descendants'}
                accessibilityElementsHidden={index !== activeIndex}
              >
                <Component />
              </View>
            ))}
          </Animated.View>
        </GestureDetector>

        <SafeAreaView
          edges={['bottom']}
          style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border, flexDirection: rowDirection }]}
          accessibilityRole="tablist"
        >
          {PAGES.map(({ key, Icon, labelKey }, index) => {
            const active = index === activeIndex;
            const color = active ? colors.primary : colors.textMuted;
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [styles.tabButton, pressed && styles.tabPressed]}
                onPress={() => goToTab(index)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t(labelKey)}
              >
                <View style={styles.iconPill}>
                  {/* The highlight is always painted and only its opacity toggles. Toggling the pill's
                      own backgroundColor after mount (inside a ripple Pressable) rendered it as a
                      square on Android/Fabric — seen on the emulator; opacity never touches the
                      rounded background drawable. */}
                  <View
                    pointerEvents="none"
                    style={[styles.pillHighlight, { backgroundColor: colors.primarySoft, opacity: active ? 1 : 0 }]}
                  />
                  <Icon size={22} color={color} strokeWidth={active ? 2.4 : 2} />
                </View>
                <Text style={[typography.caption, { color, fontWeight: active ? '700' : '500' }]}>{t(labelKey)}</Text>
              </Pressable>
            );
          })}
        </SafeAreaView>
      </View>
    </TabPagerContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  row: { flex: 1 },
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: 2,
  },
  tabPressed: { opacity: 0.6 },
  iconPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  pillHighlight: {
    ...StyleSheet.absoluteFill,
    // Half the 30dp pill height.
    borderRadius: 15,
  },
});
