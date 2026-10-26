import React, { useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ConverterSection } from '../components/home/ConverterSection';
import { HomeScrollContext, type ViewRef } from '../components/home/HomeScrollContext';
import { TodayCard } from '../components/home/TodayCard';
import { TAB_INDEX, useTabPager } from '../navigation/TabPagerContext';
import { useTheme } from '../theme/useTheme';
import { spacing } from '../theme/spacing';

/** Breathing room left above a section we scroll to. */
const SCROLL_TOP_MARGIN = spacing.md;

/**
 * Home = the Today card and the converter, nothing else (user request, 2026-10-26: no app
 * name/icon header, and every other feature lives on its own page under the Tools tab).
 */
export default function HomeScreen() {
  const { colors } = useTheme();
  const { goToTab } = useTabPager();

  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // Every section lives inside this one view (which carries the screen padding), so a section's
  // offset measured against it is exactly the scroll position that brings it to the top.
  const contentRef = useRef<ViewRef>(null);

  const scrollToView = useCallback((target: ViewRef | null) => {
    const content = contentRef.current;
    if (!target || !content) return;
    target.measureLayout(content, (_x, y) => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - SCROLL_TOP_MARGIN), animated: true });
    });
  }, []);
  const scrollContext = useMemo(() => ({ scrollToView }), [scrollToView]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <HomeScrollContext.Provider value={scrollContext}>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
          <View ref={contentRef} style={styles.content}>
            <Animated.View entering={FadeInDown.duration(420)}>
              <TodayCard onPressMethod={() => goToTab(TAB_INDEX.settings)} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(420)}>
              <ConverterSection />
            </Animated.View>
          </View>
        </ScrollView>
      </HomeScrollContext.Provider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});
