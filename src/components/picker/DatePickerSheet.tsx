import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';

import type { MethodId } from '../../core/hijri';
import { useDirection } from '../../hooks/useDirection';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PressableScale } from '../ui/PressableScale';
import { DateWheels, type CalendarKind, type Ymd } from './DateWheels';

interface Props {
  visible: boolean;
  title: string;
  calendar: CalendarKind;
  initial: Ymd;
  method: MethodId;
  onConfirm: (value: Ymd) => void;
  onClose: () => void;
}

/** Bottom sheet with date wheels; changes apply only on "Done". */
export function DatePickerSheet({ visible, title, calendar, initial, method, onConfirm, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { rowDirection } = useDirection();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Ymd>(initial);

  useEffect(() => {
    if (visible) setDraft(initial);
    // Re-seed only when the sheet opens, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={[styles.scrim, { backgroundColor: colors.scrim }]} onPress={onClose} accessibilityLabel={t('common.close')} />
      <Animated.View
        entering={SlideInDown.duration(260)}
        style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.lg }]}
        accessibilityViewIsModal
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[typography.title, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>{title}</Text>
        <DateWheels calendar={calendar} value={draft} onChange={setDraft} method={method} fadeColor={colors.surface} />
        <View style={[styles.actions, { flexDirection: rowDirection }]}>
          <PressableScale
            containerStyle={styles.actionBox}
            style={[styles.action, { backgroundColor: colors.surfaceAlt }]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={[typography.bodyStrong, { color: colors.text }]}>{t('common.cancel')}</Text>
          </PressableScale>
          <PressableScale
            containerStyle={styles.actionBox}
            style={[styles.action, { backgroundColor: colors.primary }]}
            onPress={() => {
              onConfirm(draft);
              onClose();
            }}
            accessibilityRole="button"
          >
            <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>{t('common.done')}</Text>
          </PressableScale>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.md },
  actions: { gap: spacing.md, marginTop: spacing.lg },
  actionBox: { flex: 1 },
  action: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
