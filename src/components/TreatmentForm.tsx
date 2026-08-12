import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { differenceInCalendarDays } from 'date-fns';
import type { Treatment, TreatmentInput } from '@/src/db/repos/treatmentsRepo';
import { TREATMENT_PRODUCTS, type TreatmentProduct } from '@/src/db/schema';
import { formatDate } from '@/src/i18n/formatDate';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';
import { ChipPicker } from './ChipPicker';
import { FormField } from './FormField';
import { daysAgoIso, PastDayPicker } from './PastDayPicker';
import { PrimaryButton } from './PrimaryButton';
import { ToggleRow } from './ToggleRow';

/** Whole days between an ISO timestamp and now, never negative. */
const daysAgoOf = (iso: string) => Math.max(0, differenceInCalendarDays(new Date(), new Date(iso)));

/**
 * Shared create/edit form for a treatment. On the edit screen (`showEnded`)
 * it also carries the "still on the hive?" question, so a treatment can be
 * ended with the right date rather than only "today".
 */
export function TreatmentForm({
  initial,
  showEnded = false,
  onSubmit,
}: {
  initial?: Treatment;
  showEnded?: boolean;
  onSubmit: (input: TreatmentInput) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [product, setProduct] = useState<TreatmentProduct>(initial?.product ?? 'formic_acid');
  const [dose, setDose] = useState(initial?.dose ?? '');
  const [startDaysAgo, setStartDaysAgo] = useState(initial ? daysAgoOf(initial.startedAt) : 0);
  const [startTouched, setStartTouched] = useState(initial == null);
  const [onHive, setOnHive] = useState(initial ? initial.endedAt == null : true);
  const [endDaysAgo, setEndDaysAgo] = useState(
    initial?.endedAt ? daysAgoOf(initial.endedAt) : 0
  );
  const [endTouched, setEndTouched] = useState(initial?.endedAt == null);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSave = () => {
    const startedAt = startTouched ? daysAgoIso(startDaysAgo) : initial!.startedAt;
    let endedAt: string | null = null;
    if (showEnded && !onHive) {
      endedAt = endTouched ? daysAgoIso(endDaysAgo) : (initial?.endedAt ?? daysAgoIso(0));
    }
    onSubmit({ product, dose: dose || null, startedAt, endedAt, notes: notes || null });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
          {t('treatments.product')}
        </Text>
        <ChipPicker<TreatmentProduct>
          options={TREATMENT_PRODUCTS}
          value={product}
          onChange={(v) => {
            if (v !== null) setProduct(v); // product is required — no clearing
          }}
          getLabel={(v) => t(`treatmentProduct.${v}`)}
        />

        <FormField
          label={t('treatments.dose')}
          value={dose}
          onChangeText={setDose}
          placeholder={t('treatments.dosePlaceholder')}
        />

        <PastDayPicker
          label={t('treatments.started')}
          daysAgo={startDaysAgo}
          onChange={(d) => {
            setStartTouched(true);
            setStartDaysAgo(d);
          }}
          fixedLabel={startTouched ? null : formatDate(initial!.startedAt)}
        />

        {showEnded ? (
          <>
            <ToggleRow label={t('treatments.stillOnHive')} value={onHive} onChange={setOnHive} />
            {!onHive ? (
              <PastDayPicker
                label={t('treatments.ended')}
                daysAgo={endDaysAgo}
                onChange={(d) => {
                  setEndTouched(true);
                  setEndDaysAgo(d);
                }}
                fixedLabel={
                  endTouched || !initial?.endedAt ? null : formatDate(initial.endedAt)
                }
              />
            ) : null}
          </>
        ) : null}

        <FormField
          label={t('treatments.notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </ScrollView>
      <PrimaryButton label={t('common.save')} icon="check" onPress={handleSave} />
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
