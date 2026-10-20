import React from 'react';
import { Text } from 'react-native';

import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../theme/useTheme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

/** Uppercase section label — the same shape as prayer-times-lb's Settings section labels. */
export function SectionLabel({ children, first = false }: { children: string; first?: boolean }) {
  const { colors } = useTheme();
  const { textAlign, isRTL } = useDirection();
  return (
    <Text
      accessibilityRole="header"
      style={[
        typography.label,
        {
          color: colors.textMuted,
          textAlign,
          textTransform: isRTL ? 'none' : 'uppercase',
          marginBottom: spacing.sm,
          marginTop: first ? spacing.lg : spacing.xl,
        },
      ]}
    >
      {children}
    </Text>
  );
}
