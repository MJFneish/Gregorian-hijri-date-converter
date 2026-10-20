import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ArrowLeft, ArrowRight, Check, Languages } from 'lucide-react-native';

import { ConvertArt, MethodsArt, OccasionsArt, WelcomeArt } from '../components/onboarding/Illustrations';
import { PressableScale } from '../components/ui/PressableScale';
import { useDirection } from '../hooks/useDirection';
import type { Language } from '../i18n/language';
import type { RootStackParamList } from '../navigation/types';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTheme } from '../theme/useTheme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const SLIDES = [
  { key: 'welcome', Art: WelcomeArt },
  { key: 'convert', Art: ConvertArt },
  { key: 'methods', Art: MethodsArt },
  { key: 'occasions', Art: OccasionsArt },
] as const;

type Slide = (typeof SLIDES)[number];

function Dot({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 24 : 8, { duration: 220 }),
    opacity: withTiming(active ? 1 : 0.35, { duration: 220 }),
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, style]} />;
}

/**
 * First-run introduction (4 slides with original animated artwork). Also reachable from Settings
 * → "Show introduction again" (route param `replay`), in which case finishing just goes back.
 * Horizontal FlatList pager, `inverted` in Arabic so the next slide comes from the left — RTL is
 * JS-driven in this app (see useDirection), so native RTL scrolling isn't in effect.
 */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isRTL, rowDirection, lang } = useDirection();
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Onboarding'>>();
  const replay = route.params?.replay ?? false;
  const completeOnboarding = useSettingsStore(s => s.completeOnboarding);
  const setLanguage = useSettingsStore(s => s.setLanguage);

  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const artSize = Math.min(width - spacing.xl * 2, 340, height * 0.42);

  // After a language flip the list remounts (key={lang}); keep the same slide.
  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToIndex({ index, animated: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const finish = () => {
    completeOnboarding();
    if (replay && navigation.canGoBack()) navigation.goBack();
    else navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const next = () => {
    if (isLast) finish();
    else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    }
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const otherLanguage: Language = lang === 'ar' ? 'en' : 'ar';
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.topBar, { flexDirection: rowDirection }]}>
        <Pressable
          onPress={() => setLanguage(otherLanguage)}
          style={[styles.langChip, { backgroundColor: colors.surfaceAlt, flexDirection: rowDirection }]}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.switchLanguage')}
          hitSlop={6}
        >
          <Languages size={16} color={colors.primary} />
          <Text style={[typography.bodyStrong, { color: colors.primary }]}>{otherLanguage === 'ar' ? 'العربية' : 'English'}</Text>
        </Pressable>
        {!isLast && (
          <Pressable onPress={finish} hitSlop={10} style={styles.skip} accessibilityRole="button">
            <Text style={[typography.bodyStrong, { color: colors.textMuted }]}>{t('onboarding.skip')}</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        key={lang}
        ref={listRef}
        data={SLIDES as unknown as Slide[]}
        keyExtractor={s => s.key}
        horizontal
        inverted={isRTL}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.sky, { width: width - spacing.xl * 2 }]}>
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                  <LinearGradient id={`sky-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={colors.heroFrom} />
                    <Stop offset="1" stopColor={colors.heroTo} />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill={`url(#sky-${item.key})`} />
              </Svg>
              <item.Art size={artSize} lang={lang} />
            </View>
            <Animated.View entering={FadeIn.duration(300)} style={styles.copy}>
              <Text style={[typography.displayMedium, { color: colors.text, textAlign: 'center' }]} accessibilityRole="header">
                {t(`onboarding.${item.key}.title`)}
              </Text>
              <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md }]}>
                {t(`onboarding.${item.key}.body`)}
              </Text>
            </Animated.View>
          </View>
        )}
      />

      <View style={[styles.bottomBar, { flexDirection: rowDirection }]}>
        <View
          style={[styles.dots, { flexDirection: rowDirection }]}
          accessible
          accessibilityLabel={t('onboarding.progress', { current: index + 1, total: SLIDES.length })}
        >
          {SLIDES.map((s, i) => (
            <Dot key={s.key} active={i === index} />
          ))}
        </View>
        <PressableScale
          onPress={next}
          style={[styles.nextButton, { backgroundColor: colors.primary, flexDirection: rowDirection }]}
          accessibilityRole="button"
        >
          <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>
            {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
          </Text>
          {isLast ? <Check size={18} color={colors.onPrimary} /> : <Arrow size={18} color={colors.onPrimary} />}
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  langChip: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radius.pill,
  },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  slide: { alignItems: 'center', paddingTop: spacing.sm },
  sky: {
    flex: 1,
    maxHeight: 420,
    borderRadius: radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg, maxWidth: 520 },
  bottomBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  dots: { gap: spacing.sm, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  nextButton: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    gap: spacing.sm,
  },
});
