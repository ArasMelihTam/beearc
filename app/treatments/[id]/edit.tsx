import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { TreatmentForm } from '@/src/components/TreatmentForm';
import { treatmentsRepo, type Treatment } from '@/src/db/repos/treatmentsRepo';
import { applyTreatmentEnded } from '@/src/logic/status';

/**
 * Edit a treatment — fix a product or a date, or end it on the day it
 * actually came off rather than today. Ending it here runs R2 exactly as the
 * one-tap "end treatment" button does.
 */
export default function EditTreatmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [treatment, setTreatment] = useState<Treatment | null>(null);

  useEffect(() => {
    if (!id) return;
    treatmentsRepo.getById(id).then(setTreatment);
  }, [id]);

  if (!treatment) return null;

  return (
    <Screen title={t('treatments.edit')} onBack={() => router.back()}>
      <TreatmentForm
        initial={treatment}
        showEnded
        onSubmit={async (input) => {
          await treatmentsRepo.update(treatment.id, input);
          // Only when it ends HERE for the first time: re-running R2 on an
          // already-ended treatment would book a second recount.
          if (input.endedAt && !treatment.endedAt) {
            await applyTreatmentEnded({ ...treatment, endedAt: input.endedAt });
          }
          router.back();
        }}
      />
    </Screen>
  );
}
