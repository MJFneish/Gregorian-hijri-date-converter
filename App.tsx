/**
 * Hijri Converter — Gregorian ↔ Hijri date converter following Shia calendar authorities.
 * @format
 */
import './src/i18n';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import BootSplash from 'react-native-bootsplash';

import { LoadingScreen } from './src/components/LoadingScreen';
import { ToastHost } from './src/components/Toast';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useSettingsStore } from './src/store/useSettingsStore';
import { useTheme } from './src/theme/useTheme';

// The loading screen stays up at least this long even when hydration is instant — a flash reads
// as a glitch, not as speed (same reasoning and value as lexitoon's App.tsx).
const MIN_LOADING_VISIBLE_MS = 1200;

function AppContent() {
  const hasHydrated = useSettingsStore(s => s.hasHydrated);
  const { colors, isDark } = useTheme();
  const [showLoading, setShowLoading] = useState(true);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (!hasHydrated) return;
    const remaining = MIN_LOADING_VISIBLE_MS - (Date.now() - mountedAt.current);
    const id = setTimeout(() => setShowLoading(false), Math.max(0, remaining));
    return () => clearTimeout(id);
  }, [hasHydrated]);

  // The JS loading screen's first frame matches the native splash, so swap them without a fade.
  const hideNativeSplash = useCallback(() => {
    BootSplash.hide({ fade: false }).catch(() => {});
  }, []);

  const navTheme = useMemo<Theme>(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [isDark, colors]);

  return (
    <>
      {/* Edge-to-edge (RN 0.87 default): only the icon style is ours to set. */}
      <StatusBar barStyle={showLoading || isDark ? 'light-content' : 'dark-content'} />
      {hasHydrated && (
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      )}
      <ToastHost />
      {showLoading && <LoadingScreen onReady={hideNativeSplash} />}
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
