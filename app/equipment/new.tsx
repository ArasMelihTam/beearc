import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EquipmentForm } from '@/src/components/EquipmentForm';
import { Screen } from '@/src/components/Screen';
import { equipmentRepo } from '@/src/db/repos/equipmentRepo';
import { applyEquipmentAdded } from '@/src/logic/status';

/**
 * Put something on a hive (M5b). Adding a super is what fires R1 — the
 * assistant books a "check super fill progress" reminder ten days out, so
 * nobody has to remember to look inside a box they can't see into.
 */
export default function NewEquipmentScreen() {
  const { hiveId } = useLocalSearchParams<{ hiveId: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  if (!hiveId) return null;

  return (
    <Screen title={t('equipment.new')} onBack={() => router.back()}>
      <EquipmentForm
        onSubmit={async (input) => {
          const saved = await equipmentRepo.add(hiveId, input);
          // R1 — supers only; the trigger function decides.
          await applyEquipmentAdded(saved);
          router.back();
        }}
      />
    </Screen>
  );
}
