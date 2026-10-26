import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Flower2, HeartCrack, Share2, Star } from 'lucide-react-native';

import { ShareCard } from '../../components/home/ShareCard';
import { useShareImage } from '../../components/share/ShareHost';
import { Card } from '../../components/ui/Card';
import { PageScreen } from '../../components/ui/PageScreen';
import { PressableScale } from '../../components/ui/PressableScale';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { todayJdn } from '../../core/calendar';
import { formatGregorian, formatHijri, isoDate, localizeDigits } from '../../core/format';
import { hijriMonthName, weekdayName } from '../../core/hijri';
import { moonPhaseOnDay } from '../../core/moon';
import type { OccasionKind } from '../../core/occasions';
import { upcomingOccasions, type UpcomingOccasion } from '../../core/today';
import { useConversionOptions } from '../../hooks/useConversionOptions';
import { useDirection } from '../../hooks/useDirection';
import { countPhrase } from '../../i18n/plural';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing, TOUCH_TARGET } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Filter = 'all' | 'mourning' | 'celebration';

/**
 * Tools → Occasions: every occasion in the coming Hijri year under the user's method, grouped by
 * Hijri month, with a countdown — and each one shareable as an image (the same card as the
 * converter's share, led by that occasion).
 */
export default function OccasionsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang, isRTL } = useDirection();
  const opts = useConversionOptions();
  const { share, busy } = useShareImage();
  const [filter, setFilter] = useState<Filter>('all');
  const [sharingKey, setSharingKey] = useState<string | null>(null);

  const all = useMemo(() => upcomingOccasions(todayJdn(), opts), [opts]);
  const groups = useMemo(() => {
    const list = filter === 'all' ? all : all.filter(u => u.occasion.kind === filter);
    const byMonth: Array<{ key: string; title: string; items: UpcomingOccasion[] }> = [];
    for (const u of list) {
      const { year, month } = u.day.hijri;
      const key = `${year}-${month}`;
      if (byMonth[byMonth.length - 1]?.key !== key) {
        byMonth.push({ key, title: `${hijriMonthName(month, lang)} ${localizeDigits(year, lang)}`, items: [] });
      }
      byMonth[byMonth.length - 1].items.push(u);
    }
    return byMonth;
  }, [all, filter, lang]);

  const countdown = (inDays: number) =>
    inDays === 0
      ? t('occasions.today')
      : inDays === 1
        ? t('occasions.tomorrow')
        : t('occasions.inDays', { days: countPhrase('day', inDays, lang) });

  const shareOccasion = async (u: UpcomingOccasion, key: string) => {
    const name = isRTL ? u.occasion.nameAr : u.occasion.nameEn;
    const weekday = weekdayName(u.day.weekday, lang);
    const hijri = formatHijri(u.day.hijri, lang);
    const gregorian = formatGregorian(u.day.gregorian, lang);
    setSharingKey(key);
    await share({
      card: (
        <ShareCard
          info={u.day}
          label={t('home.resultHijri')}
          date={hijri}
          detail={`${weekday} · ${gregorian}`}
          moon={moonPhaseOnDay(u.day.jdn)}
          method={opts.method}
          highlight={u.occasion}
        />
      ),
      message: `${name}\n${weekday}${lang === 'ar' ? '، ' : ', '}${hijri} = ${gregorian}\n${t('home.shareFooter', {
        method: t(`methods.${opts.method}.name`),
      })}`,
      filename: `HijriConverter-${isoDate(u.day.gregorian)}`,
    });
    setSharingKey(null);
  };

  return (
    <PageScreen title={t('tools.occasions.title')} subtitle={t('tools.occasions.description')}>
      <SegmentedControl<Filter>
        value={filter}
        onChange={setFilter}
        accessibilityLabel={t('occasions.filter')}
        options={[
          { value: 'all', label: t('occasions.all') },
          { value: 'mourning', label: t('occasions.mourning') },
          { value: 'celebration', label: t('occasions.celebration') },
        ]}
      />

      {groups.map(group => (
        <View key={group.key}>
          <SectionLabel>{group.title}</SectionLabel>
          <Card style={styles.list}>
            {group.items.map((u, index) => {
              const key = `${u.day.jdn}-${u.occasion.nameEn}`;
              const name = isRTL ? u.occasion.nameAr : u.occasion.nameEn;
              const { Icon, fg, bg } = kindStyle(u.occasion.kind, colors);
              const soon = u.inDays <= 1;
              return (
                <View key={key}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={[styles.row, { flexDirection: rowDirection }]}>
                    <View style={[styles.icon, { backgroundColor: bg }]}>
                      <Icon size={20} color={fg} />
                    </View>
                    <View style={styles.text}>
                      <Text style={[typography.bodyStrong, { color: colors.text, textAlign }]}>{name}</Text>
                      <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>
                        {`${formatHijri(u.day.hijri, lang)} · ${weekdayName(u.day.weekday, lang)} ${formatGregorian(u.day.gregorian, lang)}`}
                      </Text>
                      <Text
                        style={[
                          typography.caption,
                          styles.countdown,
                          isRTL ? styles.alignEnd : styles.alignStart,
                          soon
                            ? { color: colors.onPrimary, backgroundColor: colors.primary }
                            : { color: colors.primary, backgroundColor: colors.primarySoft },
                        ]}
                      >
                        {countdown(u.inDays)}
                      </Text>
                    </View>
                    <PressableScale
                      onPress={() => shareOccasion(u, key)}
                      disabled={busy}
                      dimWhenDisabled={false}
                      style={[styles.share, { backgroundColor: colors.surfaceAlt }]}
                      accessibilityRole="button"
                      accessibilityLabel={t('occasions.share', { name })}
                      accessibilityState={{ disabled: busy, busy: sharingKey === key }}
                    >
                      {sharingKey === key ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Share2 size={18} color={colors.primary} />
                      )}
                    </PressableScale>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </PageScreen>
  );
}

/** Same icons and colours as OccasionBadge, so a kind reads the same everywhere. */
function kindStyle(kind: OccasionKind, colors: ReturnType<typeof useTheme>['colors']) {
  if (kind === 'mourning') return { Icon: HeartCrack, fg: colors.mourning, bg: colors.mourningSoft };
  if (kind === 'celebration') return { Icon: Flower2, fg: colors.celebration, bg: colors.celebrationSoft };
  return { Icon: Star, fg: colors.primary, bg: colors.primarySoft };
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  divider: { height: StyleSheet.hairlineWidth },
  row: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  countdown: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  alignStart: { alignSelf: 'flex-start' },
  alignEnd: { alignSelf: 'flex-end' },
  share: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
