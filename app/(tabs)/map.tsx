import { useTranslation } from 'react-i18next';
import { EmptyState, Screen } from '@/src/components/Screen';

export default function MapScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('map.title')}>
      <EmptyState message={t('map.empty')} />
    </Screen>
  );
}
