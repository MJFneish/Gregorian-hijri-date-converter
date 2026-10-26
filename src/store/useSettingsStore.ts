import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import i18n, { deviceLanguage } from '../i18n';
import type { Language } from '../i18n/language';
import { DEFAULT_METHOD, isMethodId, MAX_ADJUSTMENT, type MethodId } from '../core/hijri/methods';

export type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsState {
  language: Language;
  themeMode: ThemeMode;
  /** Which authority's calendar to follow (Settings → Calculation method). */
  method: MethodId;
  /** Manual Hijri shift in days, −MAX_ADJUSTMENT…+MAX_ADJUSTMENT. */
  adjustment: number;
  onboardingDone: boolean;
  /** Tools → Hijri birthday: the user's birth date as a JDN (stored on the phone only), or null. */
  birthJdn: number | null;
  /** Not persisted — flips true once AsyncStorage has been read, gating the first render. */
  hasHydrated: boolean;
  setLanguage: (language: Language) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  setMethod: (method: MethodId) => void;
  setAdjustment: (adjustment: number) => void;
  completeOnboarding: () => void;
  setBirthJdn: (jdn: number | null) => void;
  setHasHydrated: (value: boolean) => void;
}

const clampAdjustment = (value: number) => Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, Math.round(value)));

/** Same pattern as prayer-times-lb: zustand + persist over AsyncStorage. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      language: deviceLanguage,
      themeMode: 'system',
      method: DEFAULT_METHOD,
      adjustment: 0,
      onboardingDone: false,
      birthJdn: null,
      hasHydrated: false,
      setLanguage: language => {
        i18n.changeLanguage(language);
        set({ language });
      },
      setThemeMode: themeMode => set({ themeMode }),
      setMethod: method => set({ method }),
      setAdjustment: adjustment => set({ adjustment: clampAdjustment(adjustment) }),
      completeOnboarding: () => set({ onboardingDone: true }),
      setBirthJdn: birthJdn => set({ birthJdn }),
      setHasHydrated: value => set({ hasHydrated: value }),
    }),
    {
      name: 'hijri-converter-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ language, themeMode, method, adjustment, onboardingDone, birthJdn }) => ({
        language,
        themeMode,
        method,
        adjustment,
        onboardingDone,
        birthJdn,
      }),
      // Guards against a stored value from a future/older build that this one doesn't know.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          ...p,
          method: isMethodId(p.method) ? p.method : current.method,
          adjustment: clampAdjustment(typeof p.adjustment === 'number' ? p.adjustment : current.adjustment),
          birthJdn: Number.isInteger(p.birthJdn) ? (p.birthJdn as number) : null,
        };
      },
      onRehydrateStorage: () => state => {
        if (state) {
          i18n.changeLanguage(state.language);
          state.setHasHydrated(true);
        } else {
          // Storage read failed: still let the app start, with defaults.
          useSettingsStore.setState({ hasHydrated: true });
        }
      },
    },
  ),
);
