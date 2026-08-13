import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Inspection, InspectionInput } from '@/src/db/repos/inspectionsRepo';
import { VARROA_METHODS, type VarroaMethod } from '@/src/db/schema';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';
import { ChipPicker } from './ChipPicker';
import { FormField } from './FormField';
import { PhotoPicker } from './PhotoPicker';
import { PrimaryButton } from './PrimaryButton';
import { RatingRow } from './RatingRow';
import { ToggleRow } from './ToggleRow';

/**
 * Which optional sections the beekeeper chose on the factor-picker step
 * (user decision: most skip varroa counting — it's slow). Queen/eggs and
 * the note are always shown.
 */
export const INSPECTION_FACTORS = [
  'brood',
  'stores',
  'condition',
  'varroa',
  'pests',
  'temperament',
] as const;
export type InspectionFactor = (typeof INSPECTION_FACTORS)[number];

/**
 * The rapid-entry inspection form — the heart of the app (M3).
 * Field order mirrors a real frame-by-frame inspection (user decision):
 * queen → brood → stores → varroa → temperament → note.
 * Only the sections in `factors` are rendered; within them, skipping a
 * rating is still allowed (null = "not recorded").
 */
export function InspectionForm({
  factors,
  initial,
  initialPhotos,
  submitLabel,
  onSubmit,
}: {
  factors: readonly InspectionFactor[];
  /** Editing an existing record (M5c) instead of entering a fresh one. */
  initial?: Inspection;
  /** Photo file names already attached (M6) — empty for a new inspection. */
  initialPhotos?: string[];
  submitLabel?: string;
  onSubmit: (input: InspectionInput, photoFileNames: string[]) => void;
}) {
  const has = (f: InspectionFactor) => factors.includes(f);
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const [queenSeen, setQueenSeen] = useState(initial?.queenSeen ?? false);
  const [eggsSeen, setEggsSeen] = useState(initial?.eggsSeen ?? false);
  const [larvaeCondition, setLarvaeCondition] = useState<number | null>(
    initial?.larvaeCondition ?? null
  );
  const [broodPattern, setBroodPattern] = useState<number | null>(initial?.broodPattern ?? null);
  const [honeyStores, setHoneyStores] = useState<number | null>(initial?.honeyStores ?? null);
  const [pollenStores, setPollenStores] = useState<number | null>(initial?.pollenStores ?? null);
  const [varroaCountText, setVarroaCountText] = useState(
    initial?.varroaCount != null ? String(initial.varroaCount) : ''
  );
  const [varroaMethod, setVarroaMethod] = useState<VarroaMethod | null>(
    initial?.varroaMethod ?? null
  );
  const [temperament, setTemperament] = useState<number | null>(initial?.temperament ?? null);
  const [beeDensity, setBeeDensity] = useState<number | null>(initial?.beeDensity ?? null);
  const [moisture, setMoisture] = useState<number | null>(initial?.moisture ?? null);
  const [beetlesSeen, setBeetlesSeen] = useState(initial?.beetlesSeen ?? false);
  const [waxMothSeen, setWaxMothSeen] = useState(initial?.waxMothSeen ?? false);
  const [otherInsectsSeen, setOtherInsectsSeen] = useState(initial?.otherInsectsSeen ?? false);
  const [diseaseSignsSeen, setDiseaseSignsSeen] = useState(initial?.diseaseSignsSeen ?? false);
  const [note, setNote] = useState(initial?.noteText ?? '');
  const [photos, setPhotos] = useState<string[]>(initialPhotos ?? []);

  const handleSave = () => {
    let varroaCount: number | null = null;
    if (varroaCountText.trim() !== '') {
      const n = Number(varroaCountText.trim());
      if (!Number.isInteger(n) || n < 0) {
        Alert.alert(t('inspections.varroaInvalid'));
        return;
      }
      varroaCount = n;
    }
    onSubmit({
      queenSeen,
      eggsSeen,
      larvaeCondition,
      broodPattern,
      honeyStores,
      pollenStores,
      varroaCount,
      varroaMethod,
      temperament,
      beeDensity,
      moisture,
      // Unchecked factor → null ("didn't look"), never false ("looked, clear").
      beetlesSeen: has('pests') ? beetlesSeen : null,
      waxMothSeen: has('pests') ? waxMothSeen : null,
      otherInsectsSeen: has('pests') ? otherInsectsSeen : null,
      diseaseSignsSeen: has('pests') ? diseaseSignsSeen : null,
      noteText: note || null,
    }, photos);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <ToggleRow label={t('inspections.queenSeen')} value={queenSeen} onChange={setQueenSeen} />
        <ToggleRow label={t('inspections.eggsSeen')} value={eggsSeen} onChange={setEggsSeen} />

        {has('brood') ? (
          <>
            <RatingRow
              label={t('inspections.larvae')}
              value={larvaeCondition}
              onChange={setLarvaeCondition}
              anchors="quality"
            />
            <RatingRow
              label={t('inspections.brood')}
              value={broodPattern}
              onChange={setBroodPattern}
              anchors="quality"
            />
          </>
        ) : null}

        {has('stores') ? (
          <>
            <RatingRow
              label={t('inspections.honey')}
              value={honeyStores}
              onChange={setHoneyStores}
              anchors="stores"
            />
            <RatingRow
              label={t('inspections.pollen')}
              value={pollenStores}
              onChange={setPollenStores}
              anchors="stores"
            />
          </>
        ) : null}

        {has('condition') ? (
          <>
            <RatingRow
              label={t('inspections.beeDensity')}
              value={beeDensity}
              onChange={setBeeDensity}
              anchors="density"
            />
            <RatingRow
              label={t('inspections.moisture')}
              value={moisture}
              onChange={setMoisture}
              anchors="moisture"
            />
          </>
        ) : null}

        {has('varroa') ? (
          <>
            <FormField
              label={t('inspections.varroaCount')}
              value={varroaCountText}
              onChangeText={setVarroaCountText}
              placeholder={t('inspections.varroaCountPlaceholder')}
              keyboardType="number-pad"
            />
            <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
              {t('inspections.varroaMethod')}
            </Text>
            <ChipPicker
              options={VARROA_METHODS}
              value={varroaMethod}
              onChange={setVarroaMethod}
              getLabel={(m) => t(`varroaMethod.${m}`)}
            />
          </>
        ) : null}

        {has('pests') ? (
          <>
            <ToggleRow
              label={t('inspections.beetlesSeen')}
              value={beetlesSeen}
              onChange={setBeetlesSeen}
            />
            <ToggleRow
              label={t('inspections.waxMothSeen')}
              value={waxMothSeen}
              onChange={setWaxMothSeen}
            />
            <ToggleRow
              label={t('inspections.otherInsectsSeen')}
              value={otherInsectsSeen}
              onChange={setOtherInsectsSeen}
            />
            <ToggleRow
              label={t('inspections.diseaseSignsSeen')}
              value={diseaseSignsSeen}
              onChange={setDiseaseSignsSeen}
            />
          </>
        ) : null}

        {has('temperament') ? (
          <RatingRow
            label={t('inspections.temperament')}
            value={temperament}
            onChange={setTemperament}
            anchors="temperament"
          />
        ) : null}

        <FormField
          label={t('inspections.note')}
          value={note}
          onChangeText={setNote}
          placeholder={t('inspections.notePlaceholder')}
          multiline
        />

        {/* Last, after the note: photos are the thing you reach for when
            words are not enough, and they cost a moment of standing still. */}
        <PhotoPicker fileNames={photos} onChange={setPhotos} />
      </ScrollView>
      <PrimaryButton
        label={submitLabel ?? t('inspections.save')}
        icon="check"
        onPress={handleSave}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: sp(4) },
  sectionLabel: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(4),
    marginBottom: sp(2),
  },
});
