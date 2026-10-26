import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing, TOUCH_TARGET } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PressableScale } from './PressableScale';

interface Props {
  title: string;
  /** One line under the title saying what the page is for. */
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Scaffold for every page opened from the Tools tab: a back button (mirrored in Arabic), the
 * page title and a scrolling body with the same padding as the tab pages. Native headers are off
 * app-wide (JS-driven RTL), so this is the header. Android's back button/gesture also goes back
 * (native stack).
 */
export function PageScreen({ title, subtitle, children }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, isRTL } = useDirection();
  const navigation = useNavigation();
  const Back = isRTL ? ArrowRight : ArrowLeft;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { flexDirection: rowDirection }]}>
        <PressableScale
          onPress={() => navigation.goBack()}
          style={[styles.back, { backgroundColor: colors.surfaceAlt }]}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={4}
        >
          <Back size={22} color={colors.text} />
        </PressableScale>
        <View style={styles.headerText}>
          <Text style={[typography.title, { color: colors.text, textAlign }]} accessibilityRole="header" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[typography.caption, { color: colors.textMuted, textAlign }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  back: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});
