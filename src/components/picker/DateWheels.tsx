import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { gregorianMonthLength } from '../../core/calendar';
import { localizeDigits } from '../../core/format';
import {
  GREGORIAN_MAX_YEAR,
  GREGORIAN_MIN_YEAR,
  gregorianMonthName,
  HIJRI_MAX_YEAR,
  HIJRI_MIN_YEAR,
  hijriMonthLength,
  hijriMonthName,
  type MethodId,
} from '../../core/hijri';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../theme/useTheme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { WheelPicker } from './WheelPicker';

export type CalendarKind = 'gregorian' | 'hijri';

export interface Ymd {
  year: number;
  month: number;
  day: number;
}

interface Props {
  calendar: CalendarKind;
  value: Ymd;
  onChange: (value: Ymd) => void;
  /** Hijri month lengths (29/30) depend on the chosen authority. */
  method: MethodId;
  fadeColor: string;
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Day / month / year wheels for either calendar. Changing month or year clamps the day to the
 * new month's length (e.g. 30 Safar -> 29 when that Safar has 29 days). Mirrors in RTL. */
export function DateWheels({ calendar, value, onChange, method, fadeColor }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, lang } = useDirection();

  const isHijri = calendar === 'hijri';
  const minYear = isHijri ? HIJRI_MIN_YEAR : GREGORIAN_MIN_YEAR;
  const maxYear = isHijri ? HIJRI_MAX_YEAR : GREGORIAN_MAX_YEAR;
  const monthLength = (y: number, m: number) => (isHijri ? hijriMonthLength(y, m, method) : gregorianMonthLength(y, m));

  const years = useMemo(() => range(minYear, maxYear).map(y => localizeDigits(y, lang)), [minYear, maxYear, lang]);
  const months = useMemo(
    () => range(1, 12).map(m => (isHijri ? hijriMonthName(m, lang) : gregorianMonthName(m, lang))),
    [isHijri, lang],
  );
  const dayCount = monthLength(value.year, value.month);
  const days = useMemo(() => range(1, dayCount).map(d => localizeDigits(d, lang)), [dayCount, lang]);

  const change = (year: number, month: number, day: number) =>
    onChange({ year, month, day: Math.min(day, monthLength(year, month)) });

  const columns = [
    {
      key: 'day',
      flex: 0.8,
      label: t('picker.day'),
      node: (
        <WheelPicker
          key={`day-${calendar}`}
          items={days}
          selectedIndex={Math.min(value.day, dayCount) - 1}
          onChange={i => change(value.year, value.month, i + 1)}
          accessibilityLabel={t('picker.day')}
          fadeColor={fadeColor}
        />
      ),
    },
    {
      key: 'month',
      flex: 1.6,
      label: t('picker.month'),
      node: (
        <WheelPicker
          key={`month-${calendar}`}
          items={months}
          selectedIndex={value.month - 1}
          onChange={i => change(value.year, i + 1, value.day)}
          accessibilityLabel={t('picker.month')}
          fadeColor={fadeColor}
        />
      ),
    },
    {
      key: 'year',
      flex: 1.1,
      label: t('picker.year'),
      node: (
        <WheelPicker
          key={`year-${calendar}`}
          items={years}
          selectedIndex={Math.min(Math.max(value.year, minYear), maxYear) - minYear}
          onChange={i => change(minYear + i, value.month, value.day)}
          accessibilityLabel={t('picker.year')}
          fadeColor={fadeColor}
        />
      ),
    },
  ];

  return (
    <View style={[styles.row, { flexDirection: rowDirection }]}>
      {columns.map(c => (
        <View key={c.key} style={{ flex: c.flex }}>
          <Text style={[typography.caption, styles.columnLabel, { color: colors.textMuted }]}>{c.label}</Text>
          {c.node}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs },
  columnLabel: { textAlign: 'center', marginBottom: spacing.xs },
});
