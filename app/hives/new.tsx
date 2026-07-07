import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { HiveForm } from '@/src/components/HiveForm';
import { hivesRepo } from '@/src/db/repos/hivesRepo';

export default function NewHiveScreen() {
  const { apiaryId } = useLocalSearchParams<{ apiaryId: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  if (!apiaryId) return null;

  return (
    <Screen title={t('hives.new')} onBack={() => router.back()}>
      <HiveForm
        onSubmit={async (input) => {
          await hivesRepo.create(apiaryId, input);
          router.back();
        }}
      />
    </Screen>
  );
}
