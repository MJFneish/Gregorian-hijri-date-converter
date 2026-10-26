import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CircleCheck, GitCompareArrows, Info } from 'lucide-react-native';

import { SourceBadge } from '../../components/badges';
import { DatePickerSheet } from '../../components/picker/DatePickerSheet';
import { DateField } from '../../components/tools/DateField';
import { Card } from '../../components/ui/Card';
import { PageScreen } from '../../components/ui/PageScreen';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { gregorianToJdn, jdnToGregorian, todayJdn, weekdayOfJdn } from '../../core/calendar';
import { compareOffices, type OfficeDate } from '../../core/compare';
import { formatGregorian, formatHijri } from '../../core/format';
import { hijriMonthName, weekdayName } from '../../core/hijri';
import { useConversionOptions } from '../../hooks/useConversionOptions';
import { useDirection } from '../../hooks/useDirection';
import { countPhrase } from '../../i18n/plural';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'CompareOffices'>;

/**
 * Tools → Compare offices: one day under every office's calendar, measured against the user's
 * chosen one ("a day ahead / behind"), plus when each office started its current month. Lebanese
 * Shia follow different marjas, so the same evening can be the 1st for one and the 30th for
 * another. Opened from the Tools tab (today) or from the converter's result (that day).
 */
export default function CompareOfficesScreen({ route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang } = useDirection();
  const { method: reference, adjustment } = useConversionOptions();
  const [jdn, setJdn] = useState(() => route.params?.jdn ?? todayJdn());
  const [picking, setPicking] = useState(false);

  const rows = useMemo(() => compareOffices(jdn, reference), [jdn, reference]);
  const spread = Math.max(...rows.map(r => r.offset)) - Math.min(...rows.map(r => r.offset));
  const gregorian = jdnToGregorian(jdn);
  const weekday = weekdayName(weekdayOfJdn(jdn), lang);

  const offsetText = (row: OfficeDate) =>
    row.offset === 0
      ? t('compare.same')
      : t(row.offset > 0 ? 'compare.ahead' : 'compare.behind', { days: countPhrase('day', Math.abs(row.offset), lang) });

  return (
    <PageScreen title={t('tools.compare.title')} subtitle={t('tools.compare.description')}>
      <DateField
        label={t('compare.date')}
        value={`${weekday} · ${formatGregorian(gregorian, lang)}`}
        onPress={() => setPicking(true)}
        onToday={jdn !== todayJdn() ? () => setJdn(todayJdn()) : undefined}
      />

      <View
        style={[
          styles.summary,
          { backgroundColor: spread === 0 ? colors.celebrationSoft : colors.accentSoft, flexDirection: rowDirection },
        ]}
      >
        {spread === 0 ? <CircleCheck size={18} color={colors.celebration} /> : <GitCompareArrows size={18} color={colors.accent} />}
        <Text style={[typography.bodyStrong, styles.flex, { color: spread === 0 ? colors.celebration : colors.accent, textAlign }]}>
          {spread === 0 ? t('compare.agree') : t('compare.differ', { days: countPhrase('day', spread, lang) })}
        </Text>
      </View>

      <Card style={styles.list}>
        {rows.map((row, index) => {
          const mine = row.method === reference;
          return (
            <View key={row.method}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={[styles.row, mine && { backgroundColor: colors.primarySoft }]}>
                <View style={[styles.rowHead, { flexDirection: rowDirection }]}>
                  <Text style={[typography.caption, styles.flex, { color: colors.textMuted, textAlign }]}>
                    {t(`methods.${row.method}.name`)}
                  </Text>
                  {mine ? (
                    <Text style={[typography.caption, styles.tag, { color: colors.onPrimary, backgroundColor: colors.primary }]}>
                      {t('compare.yourChoice')}
                    </Text>
                  ) : row.method === 'ummalqura' ? (
                    <Text style={[typography.caption, styles.tag, { color: colors.textMuted, backgroundColor: colors.surfaceAlt }]}>
                      {t('settings.sunniTag')}
                    </Text>
                  ) : null}
                </View>
                <Text style={[typography.title, { color: colors.text, textAlign, marginVertical: spacing.xs }]}>
                  {formatHijri(row.hijri, lang)}
                </Text>
                <View style={[styles.rowFoot, { flexDirection: rowDirection }]}>
                  <SourceBadge source={row.source} />
                  {!mine && (
                    <Text
                      style={[
                        typography.caption,
                        styles.tag,
                        row.offset === 0
                          ? { color: colors.celebration, backgroundColor: colors.celebrationSoft }
                          : { color: colors.accent, backgroundColor: colors.accentSoft },
                      ]}
                    >
                      {offsetText(row)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      <SectionLabel>{t('compare.monthTitle')}</SectionLabel>
      <Card style={styles.list}>
        {rows.map((row, index) => (
          <View key={row.method}>
            {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            <View style={styles.monthRow}>
              <Text style={[typography.bodyStrong, { color: colors.text, textAlign }]}>{t(`methods.${row.method}.short`)}</Text>
              <Text style={[typography.body, { color: colors.textMuted, textAlign }]}>
                {t('compare.monthStarted', {
                  month: hijriMonthName(row.hijri.month, lang),
                  date: `${weekdayName(weekdayOfJdn(row.monthStart), lang)} ${formatGregorian(jdnToGregorian(row.monthStart), lang)}`,
                  length: countPhrase('day', row.monthLength, lang),
                })}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {adjustment !== 0 && (
        <View style={[styles.note, { flexDirection: rowDirection }]}>
          <Info size={16} color={colors.textMuted} />
          <Text style={[typography.caption, styles.flex, { color: colors.textMuted, textAlign }]}>{t('compare.adjustmentNote')}</Text>
        </View>
      )}

      <DatePickerSheet
        visible={picking}
        title={t('compare.date')}
        calendar="gregorian"
        initial={gregorian}
        method={reference}
        onConfirm={value => setJdn(gregorianToJdn(value))}
        onClose={() => setPicking(false)}
      />
    </PageScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginVertical: spacing.lg,
  },
  list: { padding: spacing.xs },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.md },
  row: { padding: spacing.md, borderRadius: radius.md },
  rowHead: { alignItems: 'center', gap: spacing.sm },
  rowFoot: { alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  tag: { paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  monthRow: { padding: spacing.md, gap: 2 },
  note: { alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.lg },
});
