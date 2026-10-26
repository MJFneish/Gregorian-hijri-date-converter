import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TriangleAlert, BookOpen, Info, Sparkles } from 'lucide-react-native';

import { Card } from '../../components/ui/Card';
import { PageScreen } from '../../components/ui/PageScreen';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { jdnToGregorian, todayJdn } from '../../core/calendar';
import { fastingDays, monthsAhead, SISTANI_ONLY, WHOLE_MONTHS, type FastingDay, type FastReason } from '../../core/fasting';
import { formatGregorian, localizeDigits } from '../../core/format';
import { hijriMonthLength, hijriMonthName, jdnOfHijri, weekdayName } from '../../core/hijri';
import { useConversionOptions } from '../../hooks/useConversionOptions';
import { useDirection } from '../../hooks/useDirection';
import { countPhrase } from '../../i18n/plural';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

/** Shown by default: this Hijri month and the next two; "Show the whole year" extends to 12. */
const SHORT_MONTHS = 3;
const YEAR_MONTHS = 12;

interface MonthGroup {
  key: string;
  year: number;
  month: number;
  title: string;
  days: FastingDay[];
}

/**
 * Tools → Fasting days: the recommended (mustahab) fasts coming up, grouped by Hijri month under
 * the user's method, with countdowns. A list only — no reminders (user's choice, 2026-10-26).
 * Rules and sources: core/fasting.ts.
 */
export default function FastingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang } = useDirection();
  const opts = useConversionOptions();
  const [wholeYear, setWholeYear] = useState(false);

  const groups = useMemo(() => {
    const today = todayJdn();
    const end = monthsAhead(today, wholeYear ? YEAR_MONTHS : SHORT_MONTHS, opts);
    const byMonth: MonthGroup[] = [];
    for (const f of fastingDays(today, end, opts)) {
      const { year, month } = f.day.hijri;
      const key = `${year}-${month}`;
      if (byMonth[byMonth.length - 1]?.key !== key) {
        byMonth.push({ key, year, month, title: `${hijriMonthName(month, lang)} ${localizeDigits(year, lang)}`, days: [] });
      }
      byMonth[byMonth.length - 1].days.push(f);
    }
    return byMonth;
  }, [opts, wholeYear, lang]);

  const reasonText = (r: FastReason) => t(`fasting.reason.${r}`);
  const countdown = (inDays: number) =>
    inDays === 0
      ? t('occasions.today')
      : inDays === 1
        ? t('occasions.tomorrow')
        : t('occasions.inDays', { days: countPhrase('day', inDays, lang, true) });
  const gregorianOf = (jdn: number) => formatGregorian(jdnToGregorian(jdn), lang);

  return (
    <PageScreen title={t('tools.fasting.title')} subtitle={t('tools.fasting.description')}>
      {groups.map(group => (
        <View key={group.key}>
          <SectionLabel>{group.title}</SectionLabel>
          {WHOLE_MONTHS.includes(group.month) && (
            <View style={[styles.wholeMonth, { backgroundColor: colors.celebrationSoft, flexDirection: rowDirection }]}>
              <Sparkles size={18} color={colors.celebration} />
              <View style={styles.flex}>
                <Text style={[typography.bodyStrong, { color: colors.celebration, textAlign }]}>
                  {t(group.month === 7 ? 'fasting.rajab' : 'fasting.shaban')}
                </Text>
                <Text style={[typography.caption, { color: colors.celebration, textAlign }]}>
                  {t('fasting.range', {
                    from: gregorianOf(jdnOfHijri({ year: group.year, month: group.month, day: 1 }, opts)),
                    to: gregorianOf(
                      jdnOfHijri(
                        { year: group.year, month: group.month, day: hijriMonthLength(group.year, group.month, opts.method) },
                        opts,
                      ),
                    ),
                  })}
                </Text>
              </View>
            </View>
          )}
          <Card style={styles.list}>
            {group.days.map((f, index) => {
              const abstain = f.reasons.includes('ashuraAbstain');
              const arafahCaution = f.reasons.includes('arafah') && f.day.source !== 'official';
              return (
                <View key={f.day.jdn}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={[styles.row, { flexDirection: rowDirection }]}>
                    <View style={[styles.dateBadge, { backgroundColor: abstain ? colors.mourningSoft : colors.primarySoft }]}>
                      <Text style={[typography.title, { color: abstain ? colors.mourning : colors.primary }]}>
                        {localizeDigits(f.day.hijri.day, lang)}
                      </Text>
                      <Text style={[typography.caption, { color: abstain ? colors.mourning : colors.primary }]} numberOfLines={1}>
                        {weekdayName(f.day.weekday, lang)}
                      </Text>
                    </View>
                    <View style={styles.flex}>
                      {f.reasons.map(r => (
                        <View key={r} style={[styles.reason, { flexDirection: rowDirection }]}>
                          <Text style={[typography.bodyStrong, styles.reasonText, { color: abstain ? colors.mourning : colors.text, textAlign }]}>
                            {reasonText(r)}
                          </Text>
                          {SISTANI_ONLY.has(r) && (
                            <Text style={[typography.caption, styles.tag, { color: colors.textMuted, backgroundColor: colors.surfaceAlt }]}>
                              {t('fasting.sistani')}
                            </Text>
                          )}
                        </View>
                      ))}
                      <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{gregorianOf(f.day.jdn)}</Text>
                      {arafahCaution && (
                        <View style={[styles.caution, { flexDirection: rowDirection }]}>
                          <TriangleAlert size={14} color={colors.accent} />
                          <Text style={[typography.caption, styles.flex, { color: colors.accent, textAlign }]}>
                            {t('fasting.arafahCaution')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        typography.caption,
                        styles.tag,
                        f.inDays <= 1
                          ? { color: colors.onPrimary, backgroundColor: colors.primary }
                          : { color: colors.primary, backgroundColor: colors.primarySoft },
                      ]}
                    >
                      {countdown(f.inDays)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      ))}

      {!wholeYear && (
        <Pressable onPress={() => setWholeYear(true)} style={styles.more} accessibilityRole="button" hitSlop={8}>
          <Text style={[typography.bodyStrong, styles.center, { color: colors.primary }]}>{t('fasting.showYear')}</Text>
        </Pressable>
      )}

      <SectionLabel>{t('fasting.notesTitle')}</SectionLabel>
      <Card style={styles.notes}>
        {(['forbidden', 'ashura', 'conditions'] as const).map(key => (
          <View key={key} style={[styles.note, { flexDirection: rowDirection }]}>
            <Info size={16} color={colors.textMuted} />
            <Text style={[typography.caption, styles.flex, { color: colors.text, textAlign }]}>{t(`fasting.note.${key}`)}</Text>
          </View>
        ))}
        <View style={[styles.note, { flexDirection: rowDirection }]}>
          <BookOpen size={16} color={colors.textMuted} />
          <Text style={[typography.caption, styles.flex, { color: colors.textMuted, textAlign }]}>{t('fasting.note.sources')}</Text>
        </View>
      </Card>
    </PageScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  wholeMonth: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  list: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  divider: { height: StyleSheet.hairlineWidth },
  row: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  dateBadge: { width: 84, paddingVertical: spacing.xs, borderRadius: radius.md, alignItems: 'center' },
  reason: { alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  reasonText: { flexShrink: 1 },
  tag: { paddingHorizontal: spacing.sm + 2, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  caution: { alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.xs },
  more: { minHeight: 48, justifyContent: 'center', marginTop: spacing.md },
  notes: { gap: spacing.md },
  note: { alignItems: 'flex-start', gap: spacing.sm },
});
