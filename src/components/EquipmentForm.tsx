import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { differenceInCalendarDays } from 'date-fns';
import type { Equipment, EquipmentInput } from '@/src/db/repos/equipmentRepo';
import { EQUIPMENT_ITEMS, type EquipmentItem } from '@/src/db/schema';
import { formatDate } from '@/src/i18n/formatDate';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';
import { ChipPicker } from './ChipPicker';
import { FormField } from './FormField';
import { daysAgoIso, PastDayPicker } from './PastDayPicker';
import { PrimaryButton } from './PrimaryButton';
import { QuantityStepper } from './QuantityStepper';
import { ToggleRow } from './ToggleRow';

/** Whole days between an ISO timestamp and now, never negative. */
const daysAgoOf = (iso: string) => Math.max(0, differenceInCalendarDays(new Date(), new Date(iso)));

/**
 * Shared create/edit form for one piece of equipment (M5b), built on the same
 * bones as TreatmentForm — the two records behave alike: something goes on the
 * hive, and later it comes off. `showRemoved` adds the "still on the hive?"
 * question so a super can be taken off on the day it actually came off.
 */
export function EquipmentForm({
  initial,
  showRemoved = false,
  onSubmit,
}: {
  initial?: Equipment;
  showRemoved?: boolean;
  onSubmit: (input: EquipmentInput) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [item, setItem] = useState<EquipmentItem>(initial?.item ?? 'deep_super');
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [addedDaysAgo, setAddedDaysAgo] = useState(initial ? daysAgoOf(initial.addedAt) : 0);
  const [addedTouched, setAddedTouched] = useState(initial == null);
  const [onHive, setOnHive] = useState(initial ? initial.removedAt == null : true);
  const [removedDaysAgo, setRemovedDaysAgo] = useState(
    initial?.removedAt ? daysAgoOf(initial.removedAt) : 0
  );
  const [removedTouched, setRemovedTouched] = useState(initial?.removedAt == null);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSave = () => {
    const addedAt = addedTouched ? daysAgoIso(addedDaysAgo) : initial!.addedAt;
    let removedAt: string | null = null;
    if (showRemoved && !onHive) {
      removedAt = removedTouched ? daysAgoIso(removedDaysAgo) : (initial?.removedAt ?? daysAgoIso(0));
    }
    onSubmit({ item, quantity, addedAt, removedAt, notes: notes || null });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
          {t('equipment.item')}
        </Text>
        <ChipPicker<EquipmentItem>
          options={EQUIPMENT_ITEMS}
          value={item}
          onChange={(v) => {
            if (v !== null) setItem(v); // the item is required — no clearing
          }}
          getLabel={(v) => t(`equipmentItem.${v}`)}
        />

        <QuantityStepper
          label={t('equipment.quantity')}
          value={quantity}
          onChange={setQuantity}
        />

        <PastDayPicker
          label={t('equipment.added')}
          daysAgo={addedDaysAgo}
          onChange={(d) => {
            setAddedTouched(true);
            setAddedDaysAgo(d);
          }}
          fixedLabel={addedTouched ? null : formatDate(initial!.addedAt)}
        />

        {showRemoved ? (
          <>
            <ToggleRow label={t('equipment.stillOnHive')} value={onHive} onChange={setOnHive} />
            {!onHive ? (
              <PastDayPicker
                label={t('equipment.removed')}
                daysAgo={removedDaysAgo}
                onChange={(d) => {
                  setRemovedTouched(true);
                  setRemovedDaysAgo(d);
                }}
                fixedLabel={
                  removedTouched || !initial?.removedAt ? null : formatDate(initial.removedAt)
                }
              />
            ) : null}
          </>
        ) : null}

        <FormField
          label={t('equipment.notes')}
          value={notes}
          onChangeText={setNotes}
          placeholder={item === 'other' ? t('equipment.notesOtherPlaceholder') : undefined}
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
