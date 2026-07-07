import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { ApiaryForm } from '@/src/components/ApiaryForm';
import { apiariesRepo } from '@/src/db/repos/apiariesRepo';

export default function NewApiaryScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen title={t('apiaries.new')} onBack={() => router.back()}>
      <ApiaryForm
        onSubmit={async (input) => {
          await apiariesRepo.create(input);
          router.back();
        }}
      />
    </Screen>
  );
}
