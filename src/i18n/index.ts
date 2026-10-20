import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';

import en from './locales/en.json';
import ar from './locales/ar.json';
import type { Language } from './language';

export type { Language } from './language';

function detectDeviceLanguage(): Language {
  try {
    return getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

/** First-launch default, before the user picks one in Settings. */
export const deviceLanguage: Language = detectDeviceLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
