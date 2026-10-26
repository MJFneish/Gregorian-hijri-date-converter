import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Info, MoonStar } from 'lucide-react-native';

import { SourceBadge } from '../../components/badges';
import { Card } from '../../components/ui/Card';
import { PageScreen } from '../../components/ui/PageScreen';
import { PressableScale } from '../../components/ui/PressableScale';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { jdnToGregorian, todayJdn, weekdayOfJdn } from '../../core/calendar';
import { monthStartForecast, type CrescentReport, type MonthStartForecast, type Visibility } from '../../core/crescent';
import { formatGregorian, formatTime, localizeDigits } from '../../core/format';
import { hijriMonthName, hijriOfJdn, weekdayName } from '../../core/hijri';
import { useConversionOptions } from '../../hooks/useConversionOptions';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing, TOUCH_TARGET } from '../../theme/spacing';
import { typography } from '../../theme/typography';

/** How many month starts ahead the stepper goes. */
const MAX_AHEAD = 11;

const addMonths = ({ year, month }: { year: number; month: number }, n: number) => {
  const index = year * 12 + (month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

/**
 * Tools → Crescent forecast: can the new crescent be seen on the evenings of the 29th and 30th,
 * from Beirut (Fadlallah's reference), Najaf (Sistani) and Iran (best of the 6 cities the Iran
 * prediction uses)? Odeh's criterion, run on the phone (core/crescent.ts — the same rule the
 * month tables are built with), plus each office's expected 1st of the new month.
 */
export default function CrescentScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang, isRTL } = useDirection();
  const opts = useConversionOptions();
  const current = useMemo(() => hijriOfJdn(todayJdn(), opts), [opts]);
  const [ahead, setAhead] = useState(0);
  const ending = addMonths(current, ahead);
  const [forecast, setForecast] = useState<MonthStartForecast | null>(null);

  // Astronomy takes a few hundred ms: compute after the frame so the page (and the stepper)
  // respond at once.
  useEffect(() => {
    setForecast(null);
    const id = setTimeout(() => setForecast(monthStartForecast(ending, opts)), 16);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending.year, ending.month, opts]);

  const starting = addMonths(ending, 1);
  const monthTitle = (m: { year: number; month: number }) => `${hijriMonthName(m.month, lang)} ${localizeDigits(m.year, lang)}`;
  const dateOf = (jdn: number) => `${weekdayName(weekdayOfJdn(jdn), lang)} ${formatGregorian(jdnToGregorian(jdn), lang)}`;
  const Prev = isRTL ? ChevronRight : ChevronLeft;
  const Next = isRTL ? ChevronLeft : ChevronRight;

  const chip = (visibility: Visibility) => {
    const style =
      visibility === 'nakedEye'
        ? { color: colors.celebration, backgroundColor: colors.celebrationSoft }
        : visibility === 'opticalMaybeEye'
          ? { color: colors.primary, backgroundColor: colors.primarySoft }
          : visibility === 'opticalOnly'
            ? { color: colors.accent, backgroundColor: colors.accentSoft }
            : { color: colors.textMuted, backgroundColor: colors.surfaceAlt };
    return (
      <Text style={[typography.caption, styles.chip, isRTL ? styles.alignEnd : styles.alignStart, style]}>
        {t(`crescent.visibility.${visibility}`)}
      </Text>
    );
  };

  const details = (r: CrescentReport) => {
    if (r.visibility === 'notBorn' || r.ageHours === null) return null;
    const age = t('crescent.hours', { n: localizeDigits(Math.round(r.ageHours), lang) });
    const text =
      r.lagMinutes === null
        ? t('crescent.age', { age })
        : r.lagMinutes <= 0
          ? t('crescent.ageSetsFirst', { age })
          : t('crescent.ageLag', { age, lag: t('crescent.minutes', { n: localizeDigits(Math.round(r.lagMinutes), lang) }) });
    return <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{text}</Text>;
  };

  const place = (name: string, hint: string, report: CrescentReport, divider: boolean) => (
    <View key={name}>
      {divider && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
      <View style={styles.place}>
        <Text style={[typography.bodyStrong, { color: colors.text, textAlign }]}>{name}</Text>
        {chip(report.visibility)}
        {details(report)}
        <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{hint}</Text>
      </View>
    </View>
  );

  return (
    <PageScreen title={t('tools.crescent.title')} subtitle={t('tools.crescent.description')}>
      <View style={[styles.stepper, { flexDirection: rowDirection }]}>
        <PressableScale
          onPress={() => setAhead(a => Math.max(0, a - 1))}
          disabled={ahead === 0}
          style={[styles.stepButton, { backgroundColor: colors.surfaceAlt }]}
          accessibilityRole="button"
          accessibilityLabel={t('crescent.previous')}
        >
          <Prev size={22} color={colors.text} />
        </PressableScale>
        <View style={styles.flex}>
          <Text style={[typography.title, styles.center, { color: colors.text }]} accessibilityRole="header">
            {t('crescent.startOf', { month: monthTitle(starting) })}
          </Text>
          <Text style={[typography.caption, styles.center, { color: colors.textMuted }]}>
            {t('crescent.endOf', { month: monthTitle(ending) })}
          </Text>
        </View>
        <PressableScale
          onPress={() => setAhead(a => Math.min(MAX_AHEAD, a + 1))}
          disabled={ahead === MAX_AHEAD}
          style={[styles.stepButton, { backgroundColor: colors.surfaceAlt }]}
          accessibilityRole="button"
          accessibilityLabel={t('crescent.next')}
        >
          <Next size={22} color={colors.text} />
        </PressableScale>
      </View>

      {!forecast ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textMuted }]}>{t('crescent.calculating')}</Text>
        </View>
      ) : (
        <>
          {forecast.conjunction && (
            <View style={[styles.conjunction, { backgroundColor: colors.primarySoft, flexDirection: rowDirection }]}>
              <MoonStar size={20} color={colors.primary} />
              <View style={styles.flex}>
                <Text style={[typography.caption, { color: colors.primary, textAlign }]}>{t('crescent.conjunction')}</Text>
                <Text style={[typography.bodyStrong, { color: colors.text, textAlign }]}>
                  {t('crescent.conjunctionAt', {
                    date: `${weekdayName(forecast.conjunction.getDay(), lang)} ${formatGregorian(
                      { year: forecast.conjunction.getFullYear(), month: forecast.conjunction.getMonth() + 1, day: forecast.conjunction.getDate() },
                      lang,
                    )}`,
                    time: formatTime(forecast.conjunction, lang),
                  })}
                </Text>
              </View>
            </View>
          )}

          {forecast.evenings.map(evening => (
            <View key={evening.jdn}>
              <SectionLabel>
                {t('crescent.evening', {
                  day: localizeDigits(evening.monthDay, lang),
                  month: hijriMonthName(ending.month, lang),
                  date: dateOf(evening.jdn),
                })}
              </SectionLabel>
              <Card style={styles.list}>
                {place(t('crescent.place.beirut'), t('crescent.hint.beirut'), evening.beirut, false)}
                {place(t('crescent.place.najaf'), t('crescent.hint.najaf'), evening.najaf, true)}
                {place(
                  t('crescent.place.iran', { city: t(`crescent.city.${evening.iran.key}`) }),
                  t('crescent.hint.iran'),
                  evening.iran.report,
                  true,
                )}
              </Card>
            </View>
          ))}

          <SectionLabel>{t('crescent.expected', { month: hijriMonthName(starting.month, lang) })}</SectionLabel>
          <Card style={styles.list}>
            {forecast.starts.map((s, index) => (
              <View key={s.method}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <View style={[styles.startRow, { flexDirection: rowDirection }]}>
                  <View style={styles.flex}>
                    <Text style={[typography.bodyStrong, { color: colors.text, textAlign }]}>{t(`methods.${s.method}.short`)}</Text>
                    <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{dateOf(s.jdn)}</Text>
                  </View>
                  <SourceBadge source={s.source} />
                </View>
              </View>
            ))}
          </Card>

          <View style={[styles.note, { flexDirection: rowDirection }]}>
            <Info size={16} color={colors.textMuted} />
            <Text style={[typography.caption, styles.flex, { color: colors.textMuted, textAlign }]}>{t('crescent.how')}</Text>
          </View>
        </>
      )}
    </PageScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  alignStart: { alignSelf: 'flex-start' },
  alignEnd: { alignSelf: 'flex-end' },
  stepper: { alignItems: 'center', gap: spacing.sm },
  stepButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  conjunction: { alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
  list: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  divider: { height: StyleSheet.hairlineWidth },
  place: { paddingVertical: spacing.md, gap: 4 },
  chip: { paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  startRow: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  note: { alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.lg },
});
