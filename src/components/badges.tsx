import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Calculator, CircleDashed, Flower2, HeartCrack, Star } from 'lucide-react-native';

import type { DateSource } from '../core/hijri';
import type { Occasion } from '../core/occasions';
import { useDirection } from '../hooks/useDirection';
import { useTheme } from '../theme/useTheme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

/** "Official" / "Calculated" / "Approximate" chip under a converted Hijri date. Text + icon, not
 * color alone, carries the meaning. */
export function SourceBadge({ source, onDark = false }: { source: DateSource; onDark?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, isRTL } = useDirection();
  const Icon = source === 'official' ? BadgeCheck : source === 'calculated' ? Calculator : CircleDashed;
  const fg = onDark ? colors.onHero : source === 'approximate' ? colors.accent : colors.primary;
  const bg = onDark ? 'rgba(255,255,255,0.14)' : source === 'approximate' ? colors.accentSoft : colors.primarySoft;
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: bg, flexDirection: rowDirection, alignSelf: isRTL ? 'flex-end' : 'flex-start' },
      ]}
    >
      <Icon size={14} color={fg} />
      <Text style={[typography.caption, { color: fg }]}>{t(`source.${source}`)}</Text>
    </View>
  );
}

export function OccasionBadge({ occasion, onDark = false }: { occasion: Occasion; onDark?: boolean }) {
  const { colors } = useTheme();
  const { rowDirection, textAlign, isRTL } = useDirection();
  const Icon = occasion.kind === 'mourning' ? HeartCrack : occasion.kind === 'celebration' ? Flower2 : Star;
  const fg = onDark
    ? colors.heroGold
    : occasion.kind === 'mourning'
      ? colors.mourning
      : occasion.kind === 'celebration'
        ? colors.celebration
        : colors.primary;
  const bg = onDark
    ? 'rgba(242, 196, 104, 0.16)'
    : occasion.kind === 'mourning'
      ? colors.mourningSoft
      : occasion.kind === 'celebration'
        ? colors.celebrationSoft
        : colors.primarySoft;
  return (
    <View style={[styles.occasion, { backgroundColor: bg, flexDirection: rowDirection }]}>
      <Icon size={16} color={fg} />
      <Text style={[typography.bodyStrong, { color: fg, flex: 1, textAlign, fontSize: 15 }]}>
        {isRTL ? occasion.nameAr : occasion.nameEn}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  occasion: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
});
