import React, { useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppLogo } from '../components/brand/AppLogo';
import { ConverterSection } from '../components/home/ConverterSection';
import { DaysBetweenCard } from '../components/home/DaysBetweenCard';
import { HomeScrollContext, type ViewRef } from '../components/home/HomeScrollContext';
import { TodayCard } from '../components/home/TodayCard';
import { useDirection } from '../hooks/useDirection';
import { useTabPager } from '../navigation/TabPagerContext';
import { useTheme } from '../theme/useTheme';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const SETTINGS_TAB = 1;
/** Breathing room left above a section we scroll to. */
const SCROLL_TOP_MARGIN = spacing.md;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign } = useDirection();
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
            <Animated.View entering={FadeInDown.duration(380)} style={[styles.header, { flexDirection: rowDirection }]}>
              <AppLogo size={44} tile />
              <View style={styles.headerText}>
                <Text style={[typography.title, { color: colors.text, textAlign }]} accessibilityRole="header">
                  {t('app.name')}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{t('home.subtitle')}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(60).duration(420)}>
              <TodayCard onPressMethod={() => goToTab(SETTINGS_TAB)} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(420)}>
              <ConverterSection />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(180).duration(420)}>
              <DaysBetweenCard />
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
  header: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: { flex: 1 },
});
