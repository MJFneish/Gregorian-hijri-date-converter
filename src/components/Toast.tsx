import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { create } from 'zustand';
import { CircleCheck } from 'lucide-react-native';

import { useTheme } from '../theme/useTheme';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface ToastState {
  message: string | null;
  id: number;
  show: (message: string) => void;
  hide: () => void;
}

const useToastStore = create<ToastState>(set => ({
  message: null,
  id: 0,
  show: message => set(s => ({ message, id: s.id + 1 })),
  hide: () => set({ message: null }),
}));

/** Brief confirmation ("Copied") — call from anywhere. */
export const showToast = (message: string) => useToastStore.getState().show(message);

const VISIBLE_MS = 1800;

/** Mounted once in App.tsx, above the navigator. */
export function ToastHost() {
  const { message, id, hide } = useToastStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, id, hide]);

  if (!message) return null;
  return (
    <Animated.View
      key={id}
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="none"
      style={[styles.toast, { bottom: insets.bottom + 88, backgroundColor: colors.text }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <CircleCheck size={18} color={colors.background} />
      <Text style={[typography.bodyStrong, { color: colors.background }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    zIndex: 50,
  },
});
