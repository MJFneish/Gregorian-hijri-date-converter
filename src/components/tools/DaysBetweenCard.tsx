import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowDownUp, CalendarDays, CalendarCheck2 } from 'lucide-react-native';

import { gregorianMonthLength, gregorianToJdn, jdnToGregorian, spanBetween, todayJdn } from '../../core/calendar';
import { formatGregorian, formatHijri } from '../../core/format';
import { hijriMonthLength, hijriOfJdn, jdnFromHijri, jdnOfHijri } from '../../core/hijri';
import { useConversionOptions } from '../../hooks/useConversionOptions';
import { useDirection } from '../../hooks/useDirection';
import { countPhrase, formatNumber, joinParts } from '../../i18n/plural';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { DatePickerSheet } from '../picker/DatePickerSheet';
import type { CalendarKind, Ymd } from '../picker/DateWheels';
import { Card } from '../ui/Card';
import { PressableScale } from '../ui/PressableScale';
import { SegmentedControl } from '../ui/SegmentedControl';

type Field = 'from' | 'to';

/** Days between two dates, plus the same span in years/months/days of the chosen calendar —
 * handy for ages in Hijri years. Defaults to "since 1 Muharram of this Hijri year". Lives on its
 * own page (Tools → Days between) since Home was slimmed down. */
export function DaysBetweenCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang } = useDirection();
  const opts = useConversionOptions();

  const [calendar, setCalendar] = useState<CalendarKind>('hijri');
  const [toJdn, setToJdn] = useState(() => todayJdn());
  const [fromJdn, setFromJdn] = useState(() => {
    const h = hijriOfJdn(todayJdn(), opts);
    return jdnOfHijri({ year: h.year, month: 1, day: 1 }, opts);
  });
  const [editing, setEditing] = useState<Field | null>(null);

  const toYmd = (jdn: number): Ymd => (calendar === 'hijri' ? hijriOfJdn(jdn, opts) : jdnToGregorian(jdn));
  const fromYmd = (value: Ymd): number => (calendar === 'hijri' ? jdnOfHijri(value, opts) : gregorianToJdn(value));
  const format = (jdn: number) =>
    calendar === 'hijri' ? formatHijri(hijriOfJdn(jdn, opts), lang) : formatGregorian(jdnToGregorian(jdn), lang);

  const result = useMemo(() => {
    const [a, b] = fromJdn <= toJdn ? [fromJdn, toJdn] : [toJdn, fromJdn];
    const days = b - a;
    const span =
      calendar === 'hijri'
        ? spanBetween(
            hijriOfJdn(a, opts),
            hijriOfJdn(b, opts),
            (y, m) => hijriMonthLength(y, m, opts.method),
            d => jdnFromHijri(d, opts.method),
          )
        : spanBetween(jdnToGregorian(a), jdnToGregorian(b), gregorianMonthLength, gregorianToJdn);
    const spanParts = [
      span.years > 0 ? countPhrase('year', span.years, lang) : null,
      span.months > 0 ? countPhrase('month', span.months, lang) : null,
      span.days > 0 ? countPhrase('day', span.days, lang) : null,
    ].filter((p): p is string => p !== null);
    const weeks = Math.floor(days / 7);
    const rest = days % 7;
    const weekParts = [
      weeks > 0 ? countPhrase('week', weeks, lang) : null,
      rest > 0 ? countPhrase('day', rest, lang) : null,
    ].filter((p): p is string => p !== null);
    return {
      days,
      span: spanParts.length > 0 ? joinParts(spanParts, lang) : countPhrase('day', 0, lang),
      weeks: weeks > 0 ? joinParts(weekParts, lang) : null,
      reversed: fromJdn > toJdn,
    };
  }, [fromJdn, toJdn, calendar, opts, lang]);

  const rows: Array<{ field: Field; label: string; jdn: number }> = [
    { field: 'from', label: t('between.from'), jdn: fromJdn },
    { field: 'to', label: t('between.to'), jdn: toJdn },
  ];

  return (
    <>
      <Card>
        <SegmentedControl<CalendarKind>
          value={calendar}
          onChange={setCalendar}
          accessibilityLabel={t('between.calendar')}
          options={[
            { value: 'hijri', label: t('common.hijri') },
            { value: 'gregorian', label: t('common.gregorian') },
          ]}
        />

        <View style={styles.fields}>
          {rows.map(({ field, label, jdn }, index) => (
            <React.Fragment key={field}>
              <Pressable
                onPress={() => setEditing(field)}
                style={[styles.field, { backgroundColor: colors.surfaceAlt, flexDirection: rowDirection }]}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${format(jdn)}`}
                accessibilityHint={t('between.tapToChange')}
              >
                <CalendarDays size={20} color={colors.primary} />
                <View style={styles.fieldText}>
                  <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{label}</Text>
                  <Text style={[typography.bodyStrong, { color: colors.text, textAlign }]}>{format(jdn)}</Text>
                </View>
                {field === 'to' && jdn !== todayJdn() && (
                  <Pressable
                    onPress={() => setToJdn(todayJdn())}
                    hitSlop={10}
                    style={[styles.todayChip, { backgroundColor: colors.primarySoft, flexDirection: rowDirection }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('between.setToday')}
                  >
                    <CalendarCheck2 size={14} color={colors.primary} />
                    <Text style={[typography.caption, { color: colors.primary }]}>{t('home.today')}</Text>
                  </Pressable>
                )}
              </Pressable>
              {index === 0 && (
                <View style={[styles.swapRow, { flexDirection: rowDirection }]}>
                  <PressableScale
                    onPress={() => {
                      setFromJdn(toJdn);
                      setToJdn(fromJdn);
                    }}
                    style={[styles.swap, { backgroundColor: colors.card, borderColor: colors.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('between.swap')}
                  >
                    <ArrowDownUp size={16} color={colors.primary} />
                  </PressableScale>
                </View>
              )}
            </React.Fragment>
          ))}
        </View>

        <View style={[styles.result, { backgroundColor: colors.primarySoft }]} accessibilityLiveRegion="polite">
          <Text style={[typography.displayMedium, { color: colors.primary, textAlign: 'center' }]}>
            {formatNumber(result.days, lang)}
          </Text>
          <Text style={[typography.bodyStrong, { color: colors.text, textAlign: 'center' }]}>
            {t('between.daysLabel')}
          </Text>
          <Text style={[typography.body, { color: colors.text, textAlign: 'center', marginTop: spacing.sm }]}>
            {result.span}
          </Text>
          {result.weeks && (
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>≈ {result.weeks}</Text>
          )}
          {result.reversed && (
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs }]}>
              {t('between.reversed')}
            </Text>
          )}
        </View>
      </Card>

      <DatePickerSheet
        visible={editing !== null}
        title={editing === 'to' ? t('between.to') : t('between.from')}
        calendar={calendar}
        initial={toYmd(editing === 'to' ? toJdn : fromJdn)}
        method={opts.method}
        onConfirm={value => (editing === 'to' ? setToJdn(fromYmd(value)) : setFromJdn(fromYmd(value)))}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fields: { marginTop: spacing.lg },
  field: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minHeight: 56,
  },
  fieldText: { flex: 1, gap: 2 },
  todayChip: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  swapRow: { justifyContent: 'center', marginVertical: -10, zIndex: 2 },
  swap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  result: {
    marginTop: spacing.lg,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});
