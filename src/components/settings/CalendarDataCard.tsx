import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CloudDownload, RefreshCw } from 'lucide-react-native';

import { formatGregorian, formatTime } from '../../core/format';
import { useDirection } from '../../hooks/useDirection';
import { useTableStore } from '../../store/useTableStore';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Card } from '../ui/Card';
import { PressableScale } from '../ui/PressableScale';

const localDate = (d: Date) => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });

/**
 * Settings → Calendar data: which month tables are in use (bundled with the app, or downloaded
 * from the repo), when the app last checked, and a "Check for updates" button (useTableStore).
 */
export function CalendarDataCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection, textAlign, lang } = useDirection();
  const source = useTableStore(s => s.source);
  const generated = useTableStore(s => s.generated);
  const lastCheck = useTableStore(s => s.lastCheck);
  const status = useTableStore(s => s.status);
  const check = useTableStore(s => s.check);
  const checking = status === 'checking';

  const dataDate = formatGregorian(localDate(new Date(generated)), lang);
  const checkedText =
    lastCheck === null
      ? t('settings.calendarData.neverChecked')
      : t('settings.calendarData.lastCheck', {
          date: `${formatGregorian(localDate(new Date(lastCheck)), lang)} ${formatTime(new Date(lastCheck), lang)}`,
        });
  const statusColor = status === 'failed' ? colors.mourning : status === 'updated' ? colors.celebration : colors.textMuted;

  return (
    <Card>
      <View style={[styles.row, { flexDirection: rowDirection }]}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <CloudDownload size={20} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={[typography.bodyStrong, { color: colors.text, textAlign }]}>
            {t(source === 'downloaded' ? 'settings.calendarData.downloaded' : 'settings.calendarData.builtIn', { date: dataDate })}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, textAlign }]}>{checkedText}</Text>
        </View>
      </View>
      <Text style={[typography.caption, { color: colors.textMuted, textAlign, marginTop: spacing.md }]}>
        {t('settings.calendarData.hint')}
      </Text>
      <PressableScale
        onPress={() => check(true)}
        disabled={checking}
        dimWhenDisabled={false}
        containerStyle={styles.buttonBox}
        style={[styles.button, { borderColor: colors.border, flexDirection: rowDirection }]}
        accessibilityRole="button"
        accessibilityLabel={t('settings.calendarData.check')}
        accessibilityState={{ disabled: checking, busy: checking }}
      >
        {checking ? <ActivityIndicator size="small" color={colors.primary} /> : <RefreshCw size={18} color={colors.primary} />}
        <Text style={[typography.bodyStrong, { color: colors.primary }]}>
          {checking ? t('settings.calendarData.checking') : t('settings.calendarData.check')}
        </Text>
      </PressableScale>
      {(status === 'updated' || status === 'upToDate' || status === 'failed') && (
        <Text style={[typography.caption, { color: statusColor, textAlign, marginTop: spacing.sm }]} accessibilityLiveRegion="polite">
          {t(`settings.calendarData.status.${status}`)}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  buttonBox: { marginTop: spacing.md },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
