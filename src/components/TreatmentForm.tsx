import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { differenceInCalendarDays } from 'date-fns';
import type { Treatment, TreatmentInput } from '@/src/db/repos/treatmentsRepo';
import { TREATMENT_PRODUCTS, type TreatmentProduct } from '@/src/db/schema';
import { formatDate } from '@/src/i18n/formatDate';
import type { RuleSettings } from '@/src/logic/rules';
import {
  findCustomProduct,
  isUsableName,
  type CustomProduct,
} from '@/src/logic/treatmentProducts';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';
import { ChipPicker } from './ChipPicker';
import { DayCountStepper } from './DayCountStepper';
import { FormField } from './FormField';
import { NotifyToggle } from './NotifyToggle';
import { daysAgoIso, PastDayPicker } from './PastDayPicker';
import { PrimaryButton } from './PrimaryButton';
import { ToggleRow } from './ToggleRow';

/** Whole days between an ISO timestamp and now, never negative. */
const daysAgoOf = (iso: string) => Math.max(0, differenceInCalendarDays(new Date(), new Date(iso)));

/** The usual answers, so the common case is one tap rather than 42 of them. */
const DURATION_PRESETS = [1, 7, 14, 21, 28, 42];
const WITHDRAWAL_PRESETS = [0, 7, 14, 28, 42];

/**
 * Shared create/edit form for a treatment. On the edit screen (`showEnded`)
 * it also carries the "still on the hive?" question, so a treatment can be
 * ended with the right date rather than only "today".
 *
 * M6c added the three fields that make a treatment self-describing: a typed
 * name for "Other" products, how long it stays on, and the honey withdrawal
 * period. All three are stored on the treatment row, not looked up later —
 * changing a default next season must not re-date a past harvest window.
 */
export function TreatmentForm({
  initial,
  showEnded = false,
  ruleSettings,
  customProducts,
  onForgetCustomProduct,
  onSubmit,
}: {
  initial?: Treatment;
  showEnded?: boolean;
  /** Supplies the per-product duration and withdrawal defaults. */
  ruleSettings: RuleSettings;
  /** "Other" products used before, most recent first. */
  customProducts: CustomProduct[];
  /** Forget a remembered name — history keeps its own copy. */
  onForgetCustomProduct: (name: string) => void;
  onSubmit: (input: TreatmentInput) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [product, setProduct] = useState<TreatmentProduct>(initial?.product ?? 'formic_acid');
  const [customName, setCustomName] = useState(initial?.customProduct ?? '');
  const [dose, setDose] = useState(initial?.dose ?? '');
  const [startDaysAgo, setStartDaysAgo] = useState(initial ? daysAgoOf(initial.startedAt) : 0);
  const [startTouched, setStartTouched] = useState(initial == null);
  const [onHive, setOnHive] = useState(initial ? initial.endedAt == null : true);
  const [endDaysAgo, setEndDaysAgo] = useState(initial?.endedAt ? daysAgoOf(initial.endedAt) : 0);
  const [endTouched, setEndTouched] = useState(initial?.endedAt == null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [notify, setNotify] = useState(initial?.notify ?? true);

  const [durationDays, setDurationDays] = useState<number | null>(
    initial?.durationDays ?? ruleSettings.treatmentDurationDays[initial?.product ?? 'formic_acid']
  );
  const [withdrawalDays, setWithdrawalDays] = useState<number | null>(
    initial?.withdrawalDays ??
      ruleSettings.treatmentWithdrawalDays[initial?.product ?? 'formic_acid']
  );

  /**
   * Switching product re-fills both day counts from that product's defaults.
   * Editing them afterwards is the point of the fields; but a beekeeper who
   * picks thymol after amitraz must not silently keep amitraz's six weeks.
   */
  const pickProduct = (next: TreatmentProduct) => {
    setProduct(next);
    if (next === 'other') {
      const known = findCustomProduct(customProducts, customName);
      setDurationDays(known?.durationDays ?? null);
      setWithdrawalDays(known?.withdrawalDays ?? null);
    } else {
      setDurationDays(ruleSettings.treatmentDurationDays[next]);
      setWithdrawalDays(ruleSettings.treatmentWithdrawalDays[next]);
    }
  };

  /**
   * Tapping a remembered name fills its numbers too — that is the payoff.
   * (Not named `useRemembered`: a `use` prefix makes React's lint rules treat
   * a plain function as a hook, and it is called inside a render callback.)
   */
  const applyRemembered = (entry: CustomProduct) => {
    setCustomName(entry.name);
    setDurationDays(entry.durationDays);
    setWithdrawalDays(entry.withdrawalDays);
  };

  const isOther = product === 'other';
  const nameMissing = isOther && !isUsableName(customName);

  const handleSave = () => {
    if (nameMissing) return; // the button is disabled too; this is the guard
    const startedAt = startTouched ? daysAgoIso(startDaysAgo) : initial!.startedAt;
    let endedAt: string | null = null;
    if (showEnded && !onHive) {
      endedAt = endTouched ? daysAgoIso(endDaysAgo) : (initial?.endedAt ?? daysAgoIso(0));
    }
    onSubmit({
      product,
      customProduct: isOther ? customName : null,
      dose: dose || null,
      startedAt,
      endedAt,
      durationDays,
      withdrawalDays,
      notify,
      notes: notes || null,
    });
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
            if (v !== null) pickProduct(v); // product is required — no clearing
          }}
          getLabel={(v) => t(`treatmentProduct.${v}`)}
        />

        {isOther ? (
          <View style={styles.customBlock}>
            {customProducts.length > 0 ? (
              <>
                <Text style={[styles.subLabel, { color: tokens.textMuted }]}>
                  {t('treatments.customRecent')}
                </Text>
                <View style={styles.customChips}>
                  {customProducts.map((entry) => {
                    const selected =
                      isUsableName(customName) &&
                      findCustomProduct([entry], customName) !== null;
                    return (
                      <View
                        key={entry.name}
                        style={[
                          styles.customChip,
                          {
                            backgroundColor: selected ? tokens.primary : tokens.surface,
                            borderColor: selected ? tokens.primary : tokens.border,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => applyRemembered(entry)}
                          style={styles.customChipLabel}
                        >
                          <Text
                            style={[
                              styles.customChipText,
                              { color: selected ? tokens.onPrimary : tokens.text },
                            ]}
                          >
                            {entry.name}
                          </Text>
                        </TouchableOpacity>
                        {/* Forgetting a name never touches past treatments —
                            each one stores its own copy of what it was. */}
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={t('treatments.customForget', { name: entry.name })}
                          onPress={() => onForgetCustomProduct(entry.name)}
                          hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
                          style={styles.customChipClose}
                        >
                          <MaterialCommunityIcons
                            name="close"
                            size={20}
                            color={selected ? tokens.onPrimary : tokens.textMuted}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}
            <FormField
              label={t('treatments.customName')}
              value={customName}
              onChangeText={setCustomName}
              placeholder={t('treatments.customNamePlaceholder')}
            />
            {nameMissing ? (
              <Text style={[styles.error, { color: tokens.danger }]}>
                {t('treatments.customNameRequired')}
              </Text>
            ) : null}
          </View>
        ) : null}

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

        <DayCountStepper
          label={t('treatments.duration')}
          hint={t('treatments.durationHint')}
          value={durationDays}
          onChange={setDurationDays}
          presets={DURATION_PRESETS}
        />

        <DayCountStepper
          label={t('treatments.withdrawal')}
          hint={t('treatments.withdrawalHint')}
          value={withdrawalDays}
          onChange={setWithdrawalDays}
          presets={WITHDRAWAL_PRESETS}
        />

        {/* Sits under the two day counts because it is the question they
            raise: those dates become reminders — should they ring? */}
        <NotifyToggle
          value={notify}
          onChange={setNotify}
          hint={t('notify.treatmentHint')}
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
                fixedLabel={endTouched || !initial?.endedAt ? null : formatDate(initial.endedAt)}
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
      <PrimaryButton
        label={t('common.save')}
        icon="check"
        disabled={nameMissing}
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
  subLabel: { fontSize: sizes.fontLabel, fontWeight: '600' },
  customBlock: { marginTop: sp(4), gap: sp(2) },
  customChips: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(2) },
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    paddingRight: sp(2),
  },
  customChipLabel: { justifyContent: 'center', minHeight: sizes.tapMin, paddingHorizontal: sp(3) },
  customChipText: { fontSize: sizes.fontLabel, fontWeight: '600' },
  customChipClose: { paddingLeft: sp(1) },
  error: { fontSize: sizes.fontLabel },
});
