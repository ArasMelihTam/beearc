import { useTranslation } from 'react-i18next';
import { EmptyState, Screen } from '@/src/components/Screen';

export default function HivesScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('hives.title')}>
      <EmptyState message={t('hives.empty')} />
    </Screen>
  );
}
