import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { INSPECTION_FACTORS, InspectionForm } from '@/src/components/InspectionForm';
import { inspectionsRepo, type Inspection } from '@/src/db/repos/inspectionsRepo';
import { syncInspectionRules } from '@/src/logic/status';

/**
 * Correct a saved inspection (M5c). Every section is shown, not just the
 * ones ticked on the day: editing is usually where you add the thing you
 * forgot to record. The date is not editable — it is when you stood at the
 * hive, and both the rules and the condition score date their evidence by it.
 */
export default function EditInspectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(null);

  useEffect(() => {
    if (!id) return;
    inspectionsRepo.getById(id).then(setInspection);
  }, [id]);

  if (!inspection) return null;

  return (
    <Screen title={t('inspections.edit')} onBack={() => router.back()}>
      <InspectionForm
        factors={INSPECTION_FACTORS}
        initial={inspection}
        submitLabel={t('common.save')}
        onSubmit={async (input) => {
          await inspectionsRepo.update(inspection.id, input);
          // A correction can RETRACT an alert: fixing a mistyped "no queen"
          // clears the recheck task and the hive's color with it.
          await syncInspectionRules(inspection.hiveId);
          router.back();
        }}
      />
    </Screen>
  );
}
