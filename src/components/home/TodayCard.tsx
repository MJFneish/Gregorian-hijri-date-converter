import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarClock, ChevronLeft, ChevronRight, Moon, MoonStar, Sunset } from 'lucide-react-native';

import { formatGregorian, formatHijri, formatPercent, formatTime } from '../../core/format';
import { weekdayName } from '../../core/hijri';
import { illuminationPercent, moonPhaseOnDay } from '../../core/moon';
import { todaySummary } from '../../core/today';
import { MoonDisc, moonGlowMargin } from '../moon/MoonDisc';
import { useConversionOptions } from '../../hooks/useConversionOptions';
import { useDirection } from '../../hooks/useDirection';
import { useNow } from '../../hooks/useNow';
import { countPhrase } from '../../i18n/plural';
import { useTheme } from '../../theme/useTheme';
import { elevation } from '../../theme/elevation';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { OccasionBadge, SourceBadge } from '../badges';
import { GradientFill } from '../ui/GradientFill';

const HERO_STARS = [
  [0.12, 0.08, 1.6, 0.7],
  [0.3, 0.04, 1.1, 0.5],
  [0.58, 0.06, 1.3, 0.6],
  [0.92, 0.6, 1.2, 0.5],
] as const;

/** Tonight's moon, beside the Gregorian date (the big Hijri date keeps the full width). */
const TODAY_MOON = 64;
const TODAY_MOON_GLOW = moonGlowMargin(TODAY_MOON);

interface Props {
  /** Opens Settings (the method chip). */
  onPressMethod: () => void;
}

/**
 * Hero card: today in both calendars, tonight's real moon (same disc as the converter result —
 * it replaced a decorative crescent watermark), today's occasion, the Maghrib "eve" hint (the
 * user chose midnight as the day change, with an "eve of …" note after Maghrib — see
 * core/maghrib.ts), and the next upcoming occasion.
 */
export function TodayCard({ onPressMethod }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang, isRTL } = useDirection();
  const opts = useConversionOptions();
  const now = useNow();
  const summary = useMemo(() => todaySummary(now, opts), [now, opts]);
  const { today, eve, maghrib, next } = summary;
  const moon = useMemo(() => moonPhaseOnDay(today.jdn), [today.jdn]);
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <View style={[styles.card, { backgroundColor: colors.heroFrom }, elevation(colors.cardShadow, 2)]}>
      <GradientFill id="todayHero" from={colors.heroFrom} to={colors.heroTo} stars={HERO_STARS} />

      <View style={[styles.topRow, { flexDirection: rowDirection }]}>
        <Text style={[typography.label, styles.topLabel, { color: colors.onHeroMuted, letterSpacing: isRTL ? 0 : 1 }]}>
          {t('home.today')} · {weekdayName(today.weekday, lang)}
        </Text>
        <Pressable
          onPress={onPressMethod}
          style={[styles.methodChip, { flexDirection: rowDirection }]}
          accessibilityRole="button"
          accessibilityLabel={t('home.changeMethod', { method: t(`methods.${opts.method}.short`) })}
          hitSlop={8}
        >
          <Text style={[typography.caption, { color: colors.onHero }]}>{t(`methods.${opts.method}.short`)}</Text>
          <Chevron size={14} color={colors.onHero} />
        </Pressable>
      </View>

      <Text style={[typography.displayLarge, styles.hijri, { color: colors.onHero, textAlign }]} accessibilityRole="header">
        {formatHijri(today.hijri, lang)}
      </Text>
      <View style={[styles.dateRow, { flexDirection: rowDirection }]}>
        <View style={styles.dateText}>
          <Text style={[typography.subtitle, { color: colors.onHeroMuted, textAlign, marginBottom: spacing.md }]}>
            {formatGregorian(today.gregorian, lang)}
          </Text>
          <SourceBadge source={today.source} onDark />
        </View>
        {/* Negative margin: the glow spills over; the disc lines up with the card's padding. */}
        <View style={styles.moonGlowBox}>
          <MoonDisc phase={moon} size={TODAY_MOON} id="todayMoonGlow" />
        </View>
      </View>

      {today.occasions.length > 0 && (
        <View style={styles.occasions}>
          {today.occasions.map(o => (
            <OccasionBadge key={o.nameEn} occasion={o} onDark />
          ))}
        </View>
      )}

      <View style={styles.divider} />

      <View style={[styles.infoRow, { flexDirection: rowDirection }]}>
        <Moon size={18} color={colors.heroGold} />
        <Text style={[typography.caption, styles.infoText, { color: colors.onHeroMuted, textAlign }]}>
          {t('home.tonightMoon', {
            phase: t(`moon.phase.${moon.name}`),
            percent: formatPercent(illuminationPercent(moon), lang),
          })}
        </Text>
      </View>

      {eve ? (
        <View style={[styles.infoRow, { flexDirection: rowDirection }]}>
          <MoonStar size={18} color={colors.heroGold} />
          <View style={styles.infoText}>
            <Text style={[typography.bodyStrong, { color: colors.onHero, textAlign }]}>
              {t('home.eveOf', { date: formatHijri(eve.hijri, lang) })}
            </Text>
            {eve.occasions.length > 0 && (
              <Text style={[typography.caption, { color: colors.heroGold, textAlign }]}>
                {eve.occasions.map(o => (isRTL ? o.nameAr : o.nameEn)).join(' · ')}
              </Text>
            )}
            <Text style={[typography.caption, { color: colors.onHeroMuted, textAlign }]}>{t('home.eveHint')}</Text>
          </View>
        </View>
      ) : (
        maghrib && (
          <View style={[styles.infoRow, { flexDirection: rowDirection }]}>
            <Sunset size={18} color={colors.heroGold} />
            <Text style={[typography.caption, styles.infoText, { color: colors.onHeroMuted, textAlign }]}>
              {t('home.maghribAt', { time: formatTime(maghrib, lang) })}
            </Text>
          </View>
        )
      )}

      {next && (
        <View style={[styles.infoRow, { flexDirection: rowDirection }]}>
          <CalendarClock size={18} color={colors.heroGold} />
          <Text style={[typography.caption, styles.infoText, { color: colors.onHeroMuted, textAlign }]}>
            {t('home.nextOccasion', {
              name: next.day.occasions.map(o => (isRTL ? o.nameAr : o.nameEn)).join(' · '),
              when: next.inDays === 1 ? t('home.tomorrow') : t('home.inDays', { days: countPhrase('day', next.inDays, lang, true) }),
            })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  topRow: { justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  topLabel: { flexShrink: 1 },
  methodChip: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    minHeight: 32,
  },
  hijri: { marginBottom: 2 },
  dateRow: { alignItems: 'center', gap: spacing.md },
  dateText: { flex: 1 },
  moonGlowBox: { margin: -TODAY_MOON_GLOW },
  occasions: { marginTop: spacing.md, gap: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.lg, backgroundColor: 'rgba(255,255,255,0.16)' },
  infoRow: { alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xs },
  infoText: { flex: 1, gap: 2 },
});
