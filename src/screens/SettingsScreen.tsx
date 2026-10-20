import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  Contrast,
  Info,
  Minus,
  Moon,
  Plus,
  Sparkles,
  Sun,
  type LucideIcon,
} from 'lucide-react-native';

import { version } from '../../package.json';
import { AppLogo } from '../components/brand/AppLogo';
import { Card } from '../components/ui/Card';
import { PressableScale } from '../components/ui/PressableScale';
import { SectionLabel } from '../components/ui/SectionLabel';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { todayJdn } from '../core/calendar';
import { formatHijri, localizeDigits } from '../core/format';
import { hijriOfJdn, MAX_ADJUSTMENT, METHOD_IDS, type MethodId } from '../core/hijri';
import { useDirection } from '../hooks/useDirection';
import type { Language } from '../i18n/language';
import type { RootStackParamList } from '../navigation/types';
import { useSettingsStore, type ThemeMode } from '../store/useSettingsStore';
import { useTheme } from '../theme/useTheme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

function IconBadge({ Icon }: { Icon: LucideIcon }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.iconBadge, { backgroundColor: colors.surfaceAlt }]}>
      <Icon size={20} color={colors.primary} />
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { rowDirection, textAlign, lang, isRTL } = useDirection();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const language = useSettingsStore(s => s.language);
  const setLanguage = useSettingsStore(s => s.setLanguage);
  const themeMode = useSettingsStore(s => s.themeMode);
  const setThemeMode = useSettingsStore(s => s.setThemeMode);
  const method = useSettingsStore(s => s.method);
  const setMethod = useSettingsStore(s => s.setMethod);
  const adjustment = useSettingsStore(s => s.adjustment);
  const setAdjustment = useSettingsStore(s => s.setAdjustment);

  const followSystem = themeMode === 'system';
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  const previewToday = useMemo(
    () => formatHijri(hijriOfJdn(todayJdn(), { method, adjustment }), lang),
    [method, adjustment, lang],
  );
  const signedAdjustment = adjustment > 0 ? `+${adjustment}` : String(adjustment);

  const themeOptions: Array<{ mode: Exclude<ThemeMode, 'system'>; labelKey: string; Icon: LucideIcon }> = [
    { mode: 'light', labelKey: 'settings.light', Icon: Sun },
    { mode: 'dark', labelKey: 'settings.dark', Icon: Moon },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[typography.displayMedium, { color: colors.text, textAlign }]} accessibilityRole="header">
          {t('settings.title')}
        </Text>

        {/* Language */}
        <SectionLabel first>{t('settings.language')}</SectionLabel>
        <SegmentedControl<Language>
          value={language}
          onChange={setLanguage}
          accessibilityLabel={t('settings.language')}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ar', label: 'العربية' },
          ]}
        />

        {/* Appearance — same interaction as prayer-times-lb: follow-system switch, tiles otherwise */}
        <SectionLabel>{t('settings.appearance')}</SectionLabel>
        <Card>
          <View style={[styles.row, { flexDirection: rowDirection }]}>
            <IconBadge Icon={Contrast} />
            <View style={styles.rowText}>
              <Text style={[typography.bodyStrong, { color: colors.text, textAlign }]}>{t('settings.followSystem')}</Text>
              <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{t('settings.followSystemHint')}</Text>
            </View>
            <Switch
              value={followSystem}
              onValueChange={value => setThemeMode(value ? 'system' : isDark ? 'dark' : 'light')}
              trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
              thumbColor={followSystem ? colors.onPrimary : colors.switchThumbOff}
              accessibilityLabel={t('settings.followSystem')}
            />
          </View>
          {!followSystem && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              exiting={FadeOutUp.duration(150)}
              style={[styles.themeTiles, { flexDirection: rowDirection }]}
            >
              {themeOptions.map(({ mode, labelKey, Icon }) => {
                const active = themeMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setThemeMode(mode)}
                    style={[
                      styles.themeTile,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primarySoft : 'transparent',
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                  >
                    <Icon size={22} color={active ? colors.primary : colors.textMuted} />
                    <Text style={[typography.bodyStrong, { color: active ? colors.primary : colors.text }]}>{t(labelKey)}</Text>
                  </Pressable>
                );
              })}
            </Animated.View>
          )}
        </Card>

        {/* Calculation method */}
        <SectionLabel>{t('settings.method')}</SectionLabel>
        <Text style={[typography.caption, { color: colors.textMuted, textAlign, marginBottom: spacing.sm }]}>
          {t('settings.methodHint')}
        </Text>
        <View style={styles.methods} accessibilityRole="radiogroup">
          {METHOD_IDS.map((id: MethodId) => {
            const active = id === method;
            return (
              <PressableScale
                key={id}
                onPress={() => setMethod(id)}
                style={[
                  styles.methodCard,
                  {
                    backgroundColor: active ? colors.primarySoft : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    flexDirection: rowDirection,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={t(`methods.${id}.name`)}
                accessibilityHint={t(`methods.${id}.description`)}
              >
                {active ? (
                  <CircleCheck size={22} color={colors.primary} />
                ) : (
                  <Circle size={22} color={colors.textMuted} />
                )}
                <View style={styles.rowText}>
                  <View style={[styles.methodTitle, { flexDirection: rowDirection }]}>
                    <Text style={[typography.bodyStrong, { color: colors.text, textAlign, flexShrink: 1 }]}>
                      {t(`methods.${id}.name`)}
                    </Text>
                    {id === 'iran' && (
                      <Text style={[styles.tag, typography.caption, { color: colors.primary, backgroundColor: colors.surface }]}>
                        {t('settings.defaultTag')}
                      </Text>
                    )}
                    {id === 'ummalqura' && (
                      <Text style={[styles.tag, typography.caption, { color: colors.accent, backgroundColor: colors.accentSoft }]}>
                        {t('settings.sunniTag')}
                      </Text>
                    )}
                  </View>
                  <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{t(`methods.${id}.description`)}</Text>
                </View>
              </PressableScale>
            );
          })}
        </View>

        {/* Manual adjustment */}
        <SectionLabel>{t('settings.adjustment')}</SectionLabel>
        <Card>
          <View style={[styles.row, { flexDirection: rowDirection }]}>
            <PressableScale
              onPress={() => setAdjustment(adjustment - 1)}
              disabled={adjustment <= -MAX_ADJUSTMENT}
              style={[styles.stepper, { backgroundColor: colors.surfaceAlt }]}
              accessibilityRole="button"
              accessibilityLabel={t('settings.adjustmentMinus')}
            >
              <Minus size={20} color={colors.primary} />
            </PressableScale>
            <View style={styles.stepperValue} accessibilityLiveRegion="polite">
              <Text style={[typography.displayMedium, { color: colors.text, textAlign: 'center' }]}>
                {localizeDigits(signedAdjustment, lang)}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
                {t('settings.adjustmentUnit')}
              </Text>
            </View>
            <PressableScale
              onPress={() => setAdjustment(adjustment + 1)}
              disabled={adjustment >= MAX_ADJUSTMENT}
              style={[styles.stepper, { backgroundColor: colors.surfaceAlt }]}
              accessibilityRole="button"
              accessibilityLabel={t('settings.adjustmentPlus')}
            >
              <Plus size={20} color={colors.primary} />
            </PressableScale>
          </View>
          <Text style={[typography.caption, { color: colors.textMuted, textAlign, marginTop: spacing.md }]}>
            {t('settings.adjustmentHint')}
          </Text>
          <Text style={[typography.bodyStrong, { color: colors.primary, textAlign, marginTop: spacing.sm }]}>
            {t('settings.adjustmentPreview', { date: previewToday })}
          </Text>
        </Card>

        {/* Help */}
        <SectionLabel>{t('settings.help')}</SectionLabel>
        <Card style={styles.noPadding}>
          <Pressable
            onPress={() => navigation.navigate('Onboarding', { replay: true })}
            style={[styles.linkRow, { flexDirection: rowDirection }]}
            accessibilityRole="button"
            android_ripple={{ color: colors.primarySoft }}
          >
            <IconBadge Icon={Sparkles} />
            <Text style={[typography.bodyStrong, styles.rowText, { color: colors.text, textAlign }]}>
              {t('settings.showIntro')}
            </Text>
            <Chevron size={20} color={colors.textMuted} />
          </Pressable>
        </Card>

        {/* About */}
        <SectionLabel>{t('settings.about')}</SectionLabel>
        <Card>
          <View style={[styles.row, { flexDirection: rowDirection, marginBottom: spacing.md }]}>
            <AppLogo size={52} tile />
            <View style={styles.rowText}>
              <Text style={[typography.subtitle, { color: colors.text, textAlign }]}>{t('app.name')}</Text>
              <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>
                {t('settings.version', { version: localizeDigits(version, lang) })}
              </Text>
            </View>
          </View>
          <Text style={[typography.body, { color: colors.text, textAlign }]}>{t('settings.aboutBody')}</Text>
          <Text style={[typography.caption, { color: colors.textMuted, textAlign, marginTop: spacing.md }]}>
            {t('settings.credits')}
          </Text>
        </Card>

        <View style={[styles.disclaimer, { flexDirection: rowDirection, borderColor: colors.border }]}>
          <Info size={18} color={colors.textMuted} />
          <Text style={[typography.caption, { color: colors.textMuted, textAlign, flex: 1 }]}>{t('settings.disclaimer')}</Text>
        </View>
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
  row: { alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTiles: { marginTop: spacing.md, gap: spacing.sm },
  themeTile: {
    flex: 1,
    minHeight: 72,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  methods: { gap: spacing.sm },
  methodCard: {
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  methodTitle: { alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  stepper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { flex: 1 },
  noPadding: { padding: 0, overflow: 'hidden' },
  linkRow: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    minHeight: 64,
  },
  disclaimer: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
});
