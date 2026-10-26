import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { MethodId } from '../../core/hijri';
import type { MoonPhase } from '../../core/moon';
import type { DayInfo } from '../../core/today';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { OccasionBadge, SourceBadge } from '../badges';
import { ResultPanel } from './ResultPanel';

/** Width of the shared image in dp (captured at the device's pixel ratio, ~1000 px on most phones). */
const SHARE_WIDTH = 360;

interface Props {
  /** The view to capture. */
  ref?: React.Ref<React.ComponentRef<typeof View>>;
  info: DayInfo;
  label: string;
  date: string;
  detail: string;
  moon: MoonPhase;
  method: MethodId;
}

/**
 * What "Share" turns into an image: the result card as the user sees it (night panel with the
 * moon, source badge, occasions) with the calculation method as a footer — no app name or icon
 * (user request, 2026-10-26). Current theme and language, so the image matches the screen. Never shown — ConverterSection
 * keeps it mounted far off-screen (laid out, its moon photo already loaded) and captures it with
 * react-native-view-shot, which draws the view itself rather than copying screen pixels.
 * No elevation: shadows don't survive the capture's software canvas, so the card has a border.
 */
export function ShareCard({ ref, info, label, date, detail, moon, method }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { textAlign } = useDirection();

  return (
    <View ref={ref} collapsable={false} style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ResultPanel id="share" label={label} date={date} detail={detail} moon={moon} />
        <View style={styles.source}>
          <SourceBadge source={info.source} />
        </View>
        {info.occasions.length > 0 && (
          <View style={styles.occasions}>
            {info.occasions.map(o => (
              <OccasionBadge key={o.nameEn} occasion={o} />
            ))}
          </View>
        )}
      </View>
      <Text style={[typography.caption, styles.footer, { color: colors.textMuted, textAlign }]}>
        {t('home.shareMethod', { method: t(`methods.${method}.name`) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: SHARE_WIDTH, padding: spacing.xl },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg },
  source: { marginTop: spacing.md },
  occasions: { marginTop: spacing.md, gap: spacing.sm },
  footer: { marginTop: spacing.md },
});
