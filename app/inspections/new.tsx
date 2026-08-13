import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Screen } from '@/src/components/Screen';
import {
  INSPECTION_FACTORS,
  InspectionForm,
  type InspectionFactor,
} from '@/src/components/InspectionForm';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { inspectionPhotosRepo } from '@/src/db/repos/inspectionPhotosRepo';
import { inspectionsRepo } from '@/src/db/repos/inspectionsRepo';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { SETTING_KEYS, settingsRepo } from '@/src/db/repos/settingsRepo';
import { applyInspectionRules } from '@/src/logic/status';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/** First-time default (user decision): most beekeepers skip varroa counting. */
const DEFAULT_FACTORS: InspectionFactor[] = ['brood', 'stores', 'temperament'];

const FACTOR_LABEL_KEYS: Record<InspectionFactor, string> = {
  brood: 'inspections.factorBrood',
  stores: 'inspections.factorStores',
  condition: 'inspections.factorCondition',
  varroa: 'inspections.factorVarroa',
  pests: 'inspections.factorPests',
  temperament: 'inspections.factorTemperament',
};

/** Plain-language description under each factor (user request). */
const FACTOR_DESC_KEYS: Record<InspectionFactor, string> = {
  brood: 'inspections.factorBroodDesc',
  stores: 'inspections.factorStoresDesc',
  condition: 'inspections.factorConditionDesc',
  varroa: 'inspections.factorVarroaDesc',
  pests: 'inspections.factorPestsDesc',
  temperament: 'inspections.factorTemperamentDesc',
};

/** Saved JSON → valid factor list (ignores junk if the setting is corrupt). */
function parseFactors(json: string | null): InspectionFactor[] | null {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return INSPECTION_FACTORS.filter((f) => parsed.includes(f));
  } catch {
    return null;
  }
}

/**
 * Rapid entry in two steps (user decision): first tick what you actually
 * checked today, then fill only those values. The selection is saved and
 * pre-ticked next time, so a routine inspection costs one extra tap.
 */
export default function NewInspectionScreen() {
  const { hiveId } = useLocalSearchParams<{ hiveId: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [hive, setHive] = useState<Hive | null>(null);
  const [factors, setFactors] = useState<InspectionFactor[] | null>(null);
  const [step, setStep] = useState<'factors' | 'form'>('factors');

  useEffect(() => {
    if (!hiveId) return;
    hivesRepo.getById(hiveId).then(setHive);
    settingsRepo
      .get(SETTING_KEYS.inspectionFactors)
      .then((json) => setFactors(parseFactors(json) ?? DEFAULT_FACTORS));
  }, [hiveId]);

  if (!hiveId || !hive || factors === null) return null;

  const toggle = (f: InspectionFactor) =>
    setFactors((prev) =>
      prev!.includes(f) ? prev!.filter((x) => x !== f) : [...prev!, f]
    );

  const handleContinue = async () => {
    // Remember for next time — this is what keeps routine entries fast.
    await settingsRepo.set(SETTING_KEYS.inspectionFactors, JSON.stringify(factors));
    setStep('form');
  };

  if (step === 'factors') {
    return (
      <Screen title={`${t('inspections.new')} — ${hive.label}`} onBack={() => router.back()}>
        <ScrollView contentContainerStyle={styles.checklistScroll}>
          <Text style={[styles.hint, { color: tokens.textMuted }]}>
            {t('inspections.factorsHint')}
          </Text>
          <View style={styles.checklist}>
          {INSPECTION_FACTORS.map((f) => {
            const checked = factors.includes(f);
            return (
              <TouchableOpacity
                key={f}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggle(f)}
                style={[
                  styles.checkRow,
                  {
                    backgroundColor: tokens.surface,
                    borderColor: checked ? tokens.primary : tokens.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={28}
                  color={checked ? tokens.primary : tokens.textMuted}
                />
                <View style={styles.checkTextCol}>
                  <Text style={[styles.checkLabel, { color: tokens.text }]}>
                    {t(FACTOR_LABEL_KEYS[f])}
                  </Text>
                  <Text style={[styles.checkDesc, { color: tokens.textMuted }]}>
                    {t(FACTOR_DESC_KEYS[f])}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          </View>
        </ScrollView>
        <PrimaryButton
          label={t('inspections.continue')}
          icon="arrow-right"
          onPress={handleContinue}
        />
      </Screen>
    );
  }

  return (
    <Screen title={`${t('inspections.new')} — ${hive.label}`} onBack={() => setStep('factors')}>
      <InspectionForm
        factors={factors}
        onSubmit={async (input, photoFileNames) => {
          const saved = await inspectionsRepo.create(hiveId, input);
          // Photos are already resized and stored on disk; this is only the
          // row that ties them to the inspection that now exists (M6).
          await inspectionPhotosRepo.setForInspection(saved.id, photoFileNames);
          // M4: the assistant reads the fresh inspection — it may create
          // tasks (R3/R4/R5) and recolor the hive before we're back.
          await applyInspectionRules(saved);
          // No success popup: back to the hive, where the new entry is visible.
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  checklistScroll: { paddingBottom: sp(3) },
  hint: { fontSize: sizes.fontLabel, lineHeight: 21, marginTop: sp(3) },
  checklist: { marginTop: sp(4), gap: sp(2) },
  checkRow: {
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(3),
    paddingHorizontal: sp(3),
    paddingVertical: sp(2),
  },
  checkTextCol: { flex: 1, gap: 2 },
  checkLabel: { fontSize: sizes.fontBody, fontWeight: '600' },
  checkDesc: { fontSize: sizes.fontLabel, lineHeight: 20 },
});
