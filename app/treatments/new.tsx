import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Screen } from '@/src/components/Screen';
import { TreatmentForm } from '@/src/components/TreatmentForm';
import { apiariesRepo } from '@/src/db/repos/apiariesRepo';
import { hivesRepo } from '@/src/db/repos/hivesRepo';
import { SETTING_KEYS, settingsRepo } from '@/src/db/repos/settingsRepo';
import { tasksRepo } from '@/src/db/repos/tasksRepo';
import {
  treatmentProductLabel,
  treatmentsRepo,
  type Treatment,
} from '@/src/db/repos/treatmentsRepo';
import { formatAgo, formatDate } from '@/src/i18n/formatDate';
import { defaultRuleSettings, type RuleSettings } from '@/src/logic/rules';
import { applyTreatmentStarted, getRuleSettings, setTaskDone } from '@/src/logic/status';
import {
  forgetCustomProduct,
  parseCustomProducts,
  rememberCustomProduct,
  serializeCustomProducts,
  type CustomProduct,
} from '@/src/logic/treatmentProducts';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Add a treatment. Two things happen around the plain form:
 *
 * 1. The hive's LAST treatment is shown first, always (§6) — this screen
 *    exists as much to prevent an overdose as to record one.
 * 2. `fromTaskId` arrives when you reached here by checking off the
 *    assistant's "Plan varroa treatment" task (R4): saving the treatment is
 *    what completes that task, so the two can never drift apart.
 */
export default function NewTreatmentScreen() {
  const { hiveId, fromTaskId } = useLocalSearchParams<{
    hiveId: string;
    fromTaskId?: string;
  }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [last, setLast] = useState<Treatment | null>(null);
  const [ruleSettings, setRuleSettings] = useState<RuleSettings>(defaultRuleSettings());
  const [customProducts, setCustomProducts] = useState<CustomProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hiveId) return;
    void (async () => {
      // The apiary's latitude decides the season windows, same as elsewhere.
      const hive = await hivesRepo.getById(hiveId);
      const apiary = hive ? await apiariesRepo.getById(hive.apiaryId) : null;
      const [tr, settings, customJson] = await Promise.all([
        treatmentsRepo.latestByHive(hiveId),
        getRuleSettings(apiary?.latitude),
        settingsRepo.get(SETTING_KEYS.customTreatmentProducts),
      ]);
      setLast(tr);
      setRuleSettings(settings);
      setCustomProducts(parseCustomProducts(customJson));
      setLoaded(true);
    })();
  }, [hiveId]);

  /** Forget a remembered name. Past treatments keep their own copy. */
  const forget = async (name: string) => {
    const next = forgetCustomProduct(customProducts, name);
    setCustomProducts(next);
    await settingsRepo.set(SETTING_KEYS.customTreatmentProducts, serializeCustomProducts(next));
  };

  if (!hiveId || !loaded) return null;

  return (
    <Screen title={t('treatments.new')} onBack={() => router.back()}>
      {last ? (
        <View
          style={[
            styles.warning,
            { backgroundColor: tokens.surface, borderColor: tokens.statusWarning },
          ]}
        >
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={26}
            color={tokens.statusWarning}
          />
          <View style={styles.warningText}>
            <Text style={[styles.warningTitle, { color: tokens.statusWarning }]}>
              {t('treatments.lastWarningTitle')}
            </Text>
            <Text style={[styles.warningBody, { color: tokens.text }]}>
              {t('treatments.lastWarningBody', {
                product: treatmentProductLabel(last, t),
                date: formatDate(last.startedAt),
                ago: formatAgo(last.startedAt),
              })}
            </Text>
          </View>
        </View>
      ) : null}
      <TreatmentForm
        ruleSettings={ruleSettings}
        customProducts={customProducts}
        onForgetCustomProduct={(name) => void forget(name)}
        onSubmit={async (input) => {
          const saved = await treatmentsRepo.create(hiveId, input);
          // Remember a custom product (and its day counts) for next time.
          if (input.product === 'other' && input.customProduct) {
            const next = rememberCustomProduct(customProducts, {
              name: input.customProduct,
              durationDays: input.durationDays ?? null,
              withdrawalDays: input.withdrawalDays ?? null,
            });
            await settingsRepo.set(
              SETTING_KEYS.customTreatmentProducts,
              serializeCustomProducts(next)
            );
          }
          // R2: book the reminder to take this product off again.
          await applyTreatmentStarted(saved);
          // Came from the assistant's R4 task? It's answered now.
          if (fromTaskId) {
            const task = await tasksRepo.getById(fromTaskId);
            if (task && !task.doneAt) await setTaskDone(task, true);
          }
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp(3),
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    padding: sp(3),
    marginTop: sp(3),
  },
  warningText: { flex: 1, gap: sp(1) },
  warningTitle: { fontSize: sizes.fontLabel, fontWeight: '700' },
  warningBody: { fontSize: sizes.fontLabel, lineHeight: 21 },
});
