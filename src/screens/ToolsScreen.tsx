import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarHeart, ChevronLeft, ChevronRight, Hourglass, Scale, type LucideIcon } from 'lucide-react-native';

import { Card } from '../components/ui/Card';
import { PressableScale } from '../components/ui/PressableScale';
import { useDirection } from '../hooks/useDirection';
import type { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/useTheme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type ToolRoute = Exclude<keyof RootStackParamList, 'Main' | 'Onboarding'>;

/** Every page reachable from the Tools tab, in display order. A new tool = a screen in
 * src/screens/tools/, a route in navigation/types.ts + RootNavigator, and an entry here. */
const TOOLS: ReadonlyArray<{ route: ToolRoute; Icon: LucideIcon; key: string }> = [
  { route: 'CompareOffices', Icon: Scale, key: 'compare' },
  { route: 'Occasions', Icon: CalendarHeart, key: 'occasions' },
  { route: 'DaysBetween', Icon: Hourglass, key: 'daysBetween' },
];

/**
 * The Tools tab: everything beyond the converter, one row per page, so Home stays just the
 * Today card and the converter (user request, 2026-10-26 — the app is a converter, not a calendar).
 */
export default function ToolsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, isRTL } = useDirection();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[typography.displayMedium, { color: colors.text, textAlign }]} accessibilityRole="header">
          {t('tools.title')}
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, textAlign, marginBottom: spacing.lg }]}>
          {t('tools.subtitle')}
        </Text>

        <Card style={styles.list}>
          {TOOLS.map(({ route, Icon, key }, index) => (
            <View key={route}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <PressableScale
                onPress={() => navigation.navigate(route)}
                style={[styles.row, { flexDirection: rowDirection }]}
                accessibilityRole="button"
                accessibilityLabel={t(`tools.${key}.title`)}
                accessibilityHint={t(`tools.${key}.description`)}
              >
                <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft }]}>
                  <Icon size={22} color={colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[typography.bodyStrong, { color: colors.text, textAlign }]}>{t(`tools.${key}.title`)}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>
                    {t(`tools.${key}.description`)}
                  </Text>
                </View>
                <Chevron size={20} color={colors.textMuted} />
              </PressableScale>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  list: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  row: { alignItems: 'center', gap: spacing.md, minHeight: 72, paddingVertical: spacing.md },
  rowText: { flex: 1, gap: 2 },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth },
});
