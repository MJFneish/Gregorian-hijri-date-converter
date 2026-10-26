import React from 'react';
import { useTranslation } from 'react-i18next';

import { DaysBetweenCard } from '../../components/tools/DaysBetweenCard';
import { PageScreen } from '../../components/ui/PageScreen';

/** Tools → Days between. */
export default function DaysBetweenScreen() {
  const { t } = useTranslation();
  return (
    <PageScreen title={t('between.title')} subtitle={t('tools.daysBetween.description')}>
      <DaysBetweenCard />
    </PageScreen>
  );
}
