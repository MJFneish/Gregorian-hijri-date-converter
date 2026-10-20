import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { CalendarClock, ChevronLeft, ChevronRight, MoonStar, Sunset } from 'lucide-react-native';

import { formatGregorian, formatHijri, formatTime } from '../../core/format';
import { weekdayName } from '../../core/hijri';
import { todaySummary } from '../../core/today';
import { CRESCENT_PATH } from '../brand/AppLogo';
import { useConversionOptions } from '../../hooks/useConversionOptions';
import { useDirection } from '../../hooks/useDirection';
import { useNow } from '../../hooks/useNow';
import { countPhrase } from '../../i18n/plural';
import { useTheme } from '../../theme/useTheme';
import { elevation } from '../../theme/elevation';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { OccasionBadge, SourceBadge } from '../badges';

interface Props {
  /** Opens Settings (the method chip). */
  onPressMethod: () => void;
}

/**
 * Hero card: today in both calendars, today's occasion, the Maghrib "eve" hint (the user chose
 * midnight as the day change, with an "eve of …" note after Maghrib — see core/maghrib.ts), and
 * the next upcoming occasion.
 */
export function TodayCard({ onPressMethod }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang, isRTL } = useDirection();
  const opts = useConversionOptions();
  const now = useNow();
  const summary = useMemo(() => todaySummary(now, opts), [now, opts]);
  const { today, eve, maghrib, next } = summary;
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <View style={[styles.card, elevation(colors.cardShadow, 2)]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="todayHero" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.heroFrom} />
            <Stop offset="1" stopColor={colors.heroTo} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#todayHero)" />
        <Circle cx="12%" cy="18%" r="1.6" fill="#FFFFFF" opacity={0.7} />
        <Circle cx="30%" cy="8%" r="1.1" fill="#FFFFFF" opacity={0.5} />
        <Circle cx="58%" cy="12%" r="1.3" fill="#FFFFFF" opacity={0.6} />
        <Circle cx="92%" cy="60%" r="1.2" fill="#FFFFFF" opacity={0.5} />
      </Svg>
      {/* Crescent watermark in the trailing corner. */}
      <Svg
        pointerEvents="none"
        width={170}
        height={170}
        viewBox="0 0 100 100"
        style={[styles.watermark, isRTL ? { left: -36 } : { right: -36 }]}
      >
        <Path d={CRESCENT_PATH} fill={colors.heroGold} opacity={0.16} />
      </Svg>

      <View style={[styles.topRow, { flexDirection: rowDirection }]}>
        <Text style={[typography.label, { color: colors.onHeroMuted, letterSpacing: isRTL ? 0 : 1 }]}>
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
      <Text style={[typography.subtitle, { color: colors.onHeroMuted, textAlign, marginBottom: spacing.md }]}>
        {formatGregorian(today.gregorian, lang)}
      </Text>
      <SourceBadge source={today.source} onDark />

      {today.occasions.length > 0 && (
        <View style={styles.occasions}>
          {today.occasions.map(o => (
            <OccasionBadge key={o.nameEn} occasion={o} onDark />
          ))}
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.16)' }]} />

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
              when: next.inDays === 1 ? t('home.tomorrow') : t('home.inDays', { days: countPhrase('day', next.inDays, lang) }),
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
  watermark: { position: 'absolute', top: -30 },
  topRow: { justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
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
  occasions: { marginTop: spacing.md, gap: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.lg },
  infoRow: { alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xs },
  infoText: { flex: 1, gap: 2 },
});
