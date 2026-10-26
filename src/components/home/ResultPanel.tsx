import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatDecimal, formatPercent } from '../../core/format';
import { illuminationPercent, type MoonPhase } from '../../core/moon';
import { useDirection } from '../../hooks/useDirection';
import { brand } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { MOON_SIZE, MoonDisc, moonGlowMargin } from '../moon/MoonDisc';
import { GradientFill } from '../ui/GradientFill';

const MOON_GLOW = moonGlowMargin(MOON_SIZE);
/** Faint stars on the night panel, kept off the moon's side of the moon row. */
const SKY_STARS = [
  [0.9, 0.08, 1.2, 0.6],
  [0.72, 0.16, 0.9, 0.4],
  [0.95, 0.34, 1, 0.45],
  [0.56, 0.05, 0.8, 0.35],
  [0.86, 0.62, 0.9, 0.4],
] as const;

interface Props {
  /** "Hijri date" / "Gregorian date". */
  label: string;
  /** The converted date, set large. */
  date: string;
  /** Weekday and the input date: "Friday · 22 March 2002". */
  detail: string;
  moon: MoonPhase;
  /** Prefix for this panel's SVG ids. */
  id: string;
  /** The on-screen panel: the date is selectable and announced. Off for the share image. */
  interactive?: boolean;
}

/**
 * The converted date, large, over the Moon as it looks that evening — the heart of the result
 * card, and the same component the share image is drawn from (ShareCard), so what's shared is
 * exactly what's on screen. Always dark, in both themes: the moon only reads as real on a night sky.
 */
export function ResultPanel({ label, date, detail, moon, id, interactive = false }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang, isRTL } = useDirection();
  const moonName = t(`moon.phase.${moon.name}`);
  const moonIllumination = t('moon.illumination', { percent: formatPercent(illuminationPercent(moon), lang) });
  const moonAge = t('moon.age', { days: formatDecimal(moon.age, lang) });

  return (
    <View style={[styles.sky, { backgroundColor: brand.night }]}>
      <GradientFill id={`${id}Sky`} from={brand.night} to={colors.heroFrom} stars={SKY_STARS} />
      {/* Letter spacing breaks Arabic joining, so only the Latin label gets it. */}
      <Text style={[typography.label, !isRTL && styles.labelLatin, { color: colors.onHeroMuted, textAlign }]}>
        {label}
      </Text>
      <Text
        style={[typography.displayLarge, { color: colors.onHero, textAlign, marginTop: spacing.xs }]}
        accessibilityLiveRegion={interactive ? 'polite' : undefined}
        selectable={interactive}
      >
        {date}
      </Text>
      <Text style={[typography.body, { color: colors.onHeroMuted, textAlign }]}>{detail}</Text>
      <View style={styles.divider} />
      <View
        style={[styles.moonRow, { flexDirection: rowDirection }]}
        accessible
        accessibilityLabel={`${moonName}, ${moonIllumination}, ${moonAge}`}
      >
        {/* Negative margin: the glow spills into the padding; the disc itself lines up with the
            text above and sets the row's height. */}
        <View style={styles.moonGlowBox}>
          <MoonDisc phase={moon} size={MOON_SIZE} id={`${id}MoonGlow`} />
        </View>
        <View style={styles.moonText}>
          <Text style={[typography.subtitle, { color: colors.heroGold, textAlign }]}>{moonName}</Text>
          <Text style={[typography.body, { color: colors.onHero, textAlign }]}>{moonIllumination}</Text>
          <Text style={[typography.caption, { color: colors.onHeroMuted, textAlign }]}>{moonAge}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelLatin: { letterSpacing: 1 },
  sky: {
    borderRadius: radius.md,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginVertical: spacing.md,
  },
  moonRow: { alignItems: 'center', gap: spacing.lg },
  moonGlowBox: { margin: -MOON_GLOW },
  moonText: { flex: 1, gap: 2 },
});
