import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { TransferForm } from '@/src/components/TransferForm';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { transfersRepo } from '@/src/db/repos/transfersRepo';

/**
 * Record a move between two hives (M5b). No rules fire here on purpose: a
 * transfer is a fact about where things went, and what it means for either
 * colony is the beekeeper's call — the next inspection is what judges them.
 */
export default function NewTransferScreen() {
  const { hiveId } = useLocalSearchParams<{ hiveId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [hive, setHive] = useState<Hive | null>(null);

  useEffect(() => {
    if (!hiveId) return;
    hivesRepo.getById(hiveId).then(setHive);
  }, [hiveId]);

  if (!hive) return null;

  return (
    <Screen title={t('transfers.new')} onBack={() => router.back()}>
      <TransferForm
        hive={hive}
        onSubmit={async (input) => {
          await transfersRepo.create(input);
          router.back();
        }}
      />
    </Screen>
  );
}
