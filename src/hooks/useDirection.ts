import { useTranslation } from 'react-i18next';

import type { Language } from '../i18n/language';

/** Manual RTL awareness driven by the active i18n language (not native I18nManager), so
 * switching languages flips layout instantly without an app restart — the same hook as
 * prayer-times-lb and lexitoon. Every direction-sensitive layout mirrors itself through this. */
export function useDirection() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  return {
    isRTL,
    lang: (isRTL ? 'ar' : 'en') as Language,
    rowDirection: isRTL ? ('row-reverse' as const) : ('row' as const),
    textAlign: isRTL ? ('right' as const) : ('left' as const),
    /** Use on Text so punctuation/numbers lay out correctly in mixed-direction strings. */
    writingDirection: isRTL ? ('rtl' as const) : ('ltr' as const),
  };
}
