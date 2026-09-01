import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/Screen';
import { TreatmentForm } from '@/src/components/TreatmentForm';
import { apiariesRepo } from '@/src/db/repos/apiariesRepo';
import { hivesRepo } from '@/src/db/repos/hivesRepo';
import { SETTING_KEYS, settingsRepo } from '@/src/db/repos/settingsRepo';
import { treatmentsRepo, type Treatment } from '@/src/db/repos/treatmentsRepo';
import { defaultRuleSettings, type RuleSettings } from '@/src/logic/rules';
import { applyTreatmentEnded, getRuleSettings } from '@/src/logic/status';
import {
  forgetCustomProduct,
  parseCustomProducts,
  rememberCustomProduct,
  serializeCustomProducts,
  type CustomProduct,
} from '@/src/logic/treatmentProducts';

/**
 * Edit a treatment — fix a product or a date, or end it on the day it
 * actually came off rather than today. Ending it here runs R2 exactly as the
 * one-tap "end treatment" button does, and R7 (honey withdrawal) with it.
 */
export default function EditTreatmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [ruleSettings, setRuleSettings] = useState<RuleSettings>(defaultRuleSettings());
  const [customProducts, setCustomProducts] = useState<CustomProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const tr = await treatmentsRepo.getById(id);
      const hive = tr ? await hivesRepo.getById(tr.hiveId) : null;
      const apiary = hive ? await apiariesRepo.getById(hive.apiaryId) : null;
      const [settings, customJson] = await Promise.all([
        getRuleSettings(apiary?.latitude),
        settingsRepo.get(SETTING_KEYS.customTreatmentProducts),
      ]);
      setTreatment(tr);
      setRuleSettings(settings);
      setCustomProducts(parseCustomProducts(customJson));
      setLoaded(true);
    })();
  }, [id]);

  const saveCustomProducts = async (next: CustomProduct[]) => {
    setCustomProducts(next);
    await settingsRepo.set(SETTING_KEYS.customTreatmentProducts, serializeCustomProducts(next));
  };

  if (!loaded || !treatment) return null;

  return (
    <Screen title={t('treatments.edit')} onBack={() => router.back()}>
      <TreatmentForm
        initial={treatment}
        showEnded
        ruleSettings={ruleSettings}
        customProducts={customProducts}
        onForgetCustomProduct={(name) =>
          void saveCustomProducts(forgetCustomProduct(customProducts, name))
        }
        onSubmit={async (input) => {
          await treatmentsRepo.update(treatment.id, input);
          if (input.product === 'other' && input.customProduct) {
            await saveCustomProducts(
              rememberCustomProduct(customProducts, {
                name: input.customProduct,
                durationDays: input.durationDays ?? null,
                withdrawalDays: input.withdrawalDays ?? null,
              })
            );
          }
          // Only when it ends HERE for the first time: re-running R2 on an
          // already-ended treatment would book a second recount.
          if (input.endedAt && !treatment.endedAt) {
            // The EDITED withdrawal period is what R7 must use — spreading the
            // stale row here would date the harvest window off the old number.
            await applyTreatmentEnded({
              ...treatment,
              endedAt: input.endedAt,
              withdrawalDays: input.withdrawalDays ?? null,
            });
          }
          router.back();
        }}
      />
    </Screen>
  );
}
