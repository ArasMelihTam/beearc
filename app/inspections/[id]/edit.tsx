import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { INSPECTION_FACTORS, InspectionForm } from '@/src/components/InspectionForm';
import { inspectionPhotosRepo } from '@/src/db/repos/inspectionPhotosRepo';
import { inspectionsRepo, type Inspection } from '@/src/db/repos/inspectionsRepo';
import { syncInspectionRules } from '@/src/logic/status';

/**
 * Correct a saved inspection (M5c). Every section is shown, not just the
 * ones ticked on the day: editing is usually where you add the thing you
 * forgot to record. The date is not editable — it is when you stood at the
 * hive, and the rules date their evidence by it.
 */
export default function EditInspectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [photos, setPhotos] = useState<string[] | null>(null);

  useEffect(() => {
    if (!id) return;
    inspectionsRepo.getById(id).then(setInspection);
    inspectionPhotosRepo.fileNamesByInspection(id).then(setPhotos);
  }, [id]);

  // Both loads must land before the form mounts: it seeds its state once,
  // so a late photo list would arrive after the fields were already built.
  if (!inspection || photos === null) return null;

  return (
    <Screen title={t('inspections.edit')} onBack={() => router.back()}>
      <InspectionForm
        factors={INSPECTION_FACTORS}
        initial={inspection}
        initialPhotos={photos}
        submitLabel={t('common.save')}
        onSubmit={async (input, photoFileNames) => {
          await inspectionsRepo.update(inspection.id, input);
          await inspectionPhotosRepo.setForInspection(inspection.id, photoFileNames);
          // A correction can RETRACT an alert: fixing a mistyped "no queen"
          // clears the recheck task and the hive's color with it.
          await syncInspectionRules(inspection.hiveId);
          router.back();
        }}
      />
    </Screen>
  );
}
