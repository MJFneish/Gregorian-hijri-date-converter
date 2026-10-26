import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarCheck2, CalendarDays } from 'lucide-react-native';

import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Props {
  label: string;
  /** The formatted date. */
  value: string;
  /** Opens the picker (callers render a DatePickerSheet). */
  onPress: () => void;
  /** Shows a "Today" chip that calls this (omit when the date already is today). */
  onToday?: () => void;
}

/** A tappable date row (label + date, calendar icon) — the same look as the Days-between fields. */
export function DateField({ label, value, onPress, onToday }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign } = useDirection();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.field, { backgroundColor: colors.surfaceAlt, flexDirection: rowDirection }]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={t('between.tapToChange')}
    >
      <CalendarDays size={20} color={colors.primary} />
      <View style={styles.text}>
        <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{label}</Text>
        <Text style={[typography.bodyStrong, { color: colors.text, textAlign }]}>{value}</Text>
      </View>
      {onToday && (
        <Pressable
          onPress={onToday}
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
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  text: { flex: 1, gap: 2 },
  todayChip: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
});
