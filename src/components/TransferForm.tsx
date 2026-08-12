import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { differenceInCalendarDays } from 'date-fns';
import { apiariesRepo, type ApiaryWithHiveCount } from '@/src/db/repos/apiariesRepo';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import type { Transfer, TransferInput } from '@/src/db/repos/transfersRepo';
import { TRANSFER_ITEMS, type TransferItem } from '@/src/db/schema';
import { formatDate } from '@/src/i18n/formatDate';
import {
  directionFor,
  endsFor,
  isValidTransfer,
  otherHiveIdOf,
  type TransferDirection,
} from '@/src/logic/transfers';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';
import { ChipPicker } from './ChipPicker';
import { FormField } from './FormField';
import { daysAgoIso, PastDayPicker } from './PastDayPicker';
import { PrimaryButton } from './PrimaryButton';
import { QuantityStepper } from './QuantityStepper';
import { SegmentPicker } from './SegmentPicker';

const DIRECTIONS = ['gave', 'received'] as const;

const DIRECTION_ICONS: Record<TransferDirection, 'export' | 'import'> = {
  gave: 'export',
  received: 'import',
};

/** Whole days between an ISO timestamp and now, never negative. */
const daysAgoOf = (iso: string) => Math.max(0, differenceInCalendarDays(new Date(), new Date(iso)));

/**
 * Create/edit one hive-to-hive move (M5b).
 *
 * The beekeeper is standing at ONE hive, so the form asks the question that
 * way round — "this hive gave" or "this hive received" — and builds the two
 * ends from the answer (src/logic/transfers.ts). The other hive is picked
 * apiary-first, defaulting to this hive's own apiary, because most frames
 * travel a few metres between neighbours.
 */
export function TransferForm({
  hive,
  initial,
  onSubmit,
}: {
  /** The hive whose screen we came from — "this hive". */
  hive: Hive;
  initial?: Transfer;
  onSubmit: (input: TransferInput) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const [direction, setDirection] = useState<TransferDirection>(
    (initial && directionFor(initial, hive.id)) ?? 'gave'
  );
  const [apiaries, setApiaries] = useState<ApiaryWithHiveCount[]>([]);
  const [otherApiaryId, setOtherApiaryId] = useState<string | null>(null);
  const [otherHives, setOtherHives] = useState<Hive[]>([]);
  const [otherHiveId, setOtherHiveId] = useState<string | null>(null);
  const [item, setItem] = useState<TransferItem>(initial?.item ?? 'brood_frame');
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [daysAgo, setDaysAgo] = useState(initial ? daysAgoOf(initial.transferredAt) : 0);
  const [dateTouched, setDateTouched] = useState(initial == null);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  // Where to start: editing opens on the hive already recorded (and its
  // apiary, which may not be this hive's); adding starts in this apiary.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await apiariesRepo.listActive();
      if (cancelled) return;
      setApiaries(list);
      const existingOtherId = initial ? otherHiveIdOf(initial, hive.id) : null;
      if (!existingOtherId) {
        setOtherApiaryId(hive.apiaryId);
        return;
      }
      const other = await hivesRepo.getById(existingOtherId);
      if (cancelled) return;
      setOtherApiaryId(other?.apiaryId ?? hive.apiaryId);
      setOtherHiveId(existingOtherId);
    })();
    return () => {
      cancelled = true;
    };
  }, [hive.apiaryId, hive.id, initial]);

  // A hive can't move frames to itself, so it never appears in its own list.
  useEffect(() => {
    if (!otherApiaryId) {
      setOtherHives([]);
      return;
    }
    hivesRepo
      .listActiveByApiary(otherApiaryId)
      .then((list) => setOtherHives(list.filter((h) => h.id !== hive.id)));
  }, [otherApiaryId, hive.id]);

  const handleSave = () => {
    if (!isValidTransfer(hive.id, otherHiveId)) {
      Alert.alert(t('transfers.pickHive'));
      return;
    }
    const ends = endsFor(hive.id, direction, otherHiveId!);
    onSubmit({
      ...ends,
      item,
      quantity,
      transferredAt: dateTouched ? daysAgoIso(daysAgo) : initial!.transferredAt,
      notes: notes || null,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <SegmentPicker<TransferDirection>
          label={t('transfers.direction')}
          options={DIRECTIONS}
          value={direction}
          onChange={setDirection}
          // The hive's own label rides in the segment, not the heading: it is
          // the word that stops you recording the move backwards.
          getLabel={(d) => t(`transfers.direction_${d}`, { hive: hive.label })}
          getIcon={(d) => DIRECTION_ICONS[d]}
        />

        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
          {t(`transfers.otherHive_${direction}`)}
        </Text>
        {apiaries.length > 0 ? (
          <ChipPicker<string>
            options={apiaries.map((a) => a.id)}
            value={otherApiaryId}
            onChange={(id) => {
              // Picking a different apiary invalidates the chosen hive.
              setOtherApiaryId(id);
              setOtherHiveId(null);
            }}
            getLabel={(id) => apiaries.find((a) => a.id === id)?.name ?? '?'}
          />
        ) : null}
        <View style={styles.hiveChips}>
          {otherHives.length > 0 ? (
            <ChipPicker<string>
              options={otherHives.map((h) => h.id)}
              value={otherHiveId}
              onChange={setOtherHiveId}
              getLabel={(id) => otherHives.find((h) => h.id === id)?.label ?? '?'}
            />
          ) : (
            <Text style={[styles.hint, { color: tokens.textMuted }]}>
              {t('transfers.noOtherHives')}
            </Text>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
          {t('transfers.item')}
        </Text>
        <ChipPicker<TransferItem>
          options={TRANSFER_ITEMS}
          value={item}
          onChange={(v) => {
            if (v !== null) setItem(v); // the item is required — no clearing
          }}
          getLabel={(v) => t(`transferItem.${v}`)}
        />

        <QuantityStepper
          label={t('transfers.quantity')}
          value={quantity}
          onChange={setQuantity}
        />

        <PastDayPicker
          label={t('transfers.date')}
          daysAgo={daysAgo}
          onChange={(d) => {
            setDateTouched(true);
            setDaysAgo(d);
          }}
          fixedLabel={dateTouched ? null : formatDate(initial!.transferredAt)}
        />

        <FormField
          label={t('transfers.notes')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('transfers.notesPlaceholder')}
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
  hiveChips: { marginTop: sp(2) },
  hint: { fontSize: sizes.fontLabel, lineHeight: 21 },
});
