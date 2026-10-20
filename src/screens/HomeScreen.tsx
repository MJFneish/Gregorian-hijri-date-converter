import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppLogo } from '../components/brand/AppLogo';
import { ConverterSection } from '../components/home/ConverterSection';
import { DaysBetweenCard } from '../components/home/DaysBetweenCard';
import { TodayCard } from '../components/home/TodayCard';
import { useDirection } from '../hooks/useDirection';
import { useTabPager } from '../navigation/TabPagerContext';
import { useTheme } from '../theme/useTheme';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const SETTINGS_TAB = 1;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign } = useDirection();
  const { goToTab } = useTabPager();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
      </ScrollView>
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
