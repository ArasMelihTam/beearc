import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { QueenForm } from '@/src/components/QueenForm';
import { queensRepo, type Queen } from '@/src/db/repos/queensRepo';

/** Edit a queen — most often to update her star rating as the season shows. */
export default function EditQueenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [queen, setQueen] = useState<Queen | null>(null);

  useEffect(() => {
    if (!id) return;
    queensRepo.getById(id).then(setQueen);
  }, [id]);

  if (!queen) return null;

  return (
    <Screen title={t('queens.edit')} onBack={() => router.back()}>
      <QueenForm
        initial={queen}
        onSubmit={async (input) => {
          await queensRepo.update(queen.id, input);
          router.back();
        }}
      />
    </Screen>
  );
}
