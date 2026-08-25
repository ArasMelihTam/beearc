import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EmptyState, Screen } from '@/src/components/Screen';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { SummaryRow } from '@/src/components/SummaryRow';
import { equipmentRepo, type Equipment } from '@/src/db/repos/equipmentRepo';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { inspectionPhotosRepo } from '@/src/db/repos/inspectionPhotosRepo';
import { inspectionsRepo, type Inspection } from '@/src/db/repos/inspectionsRepo';
import { queensRepo, type Queen } from '@/src/db/repos/queensRepo';
import { transfersRepo, type TransferWithHives } from '@/src/db/repos/transfersRepo';
import { treatmentsRepo, type Treatment } from '@/src/db/repos/treatmentsRepo';
import { RecencyLine } from '@/src/components/RecencyLine';
import { SwipeableRow } from '@/src/components/SwipeableRow';
import { formatAgo, formatDateTime } from '@/src/i18n/formatDate';
import { formatQueenAge } from '@/src/i18n/formatQueen';
import { isQueenAging, queenAgeMonths } from '@/src/logic/queens';
import { directionFor } from '@/src/logic/transfers';
import { getHiveRecency, syncInspectionRules } from '@/src/logic/status';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Hive detail (M3, extended in M5a/M5c): type and when it was last inspected,
 * then the queen and last treatment at a glance, then the timeline.
 *
 * There is deliberately no computed "health score" here (decision 2026-08-12):
 * the app states the facts and the beekeeper judges the colony.
 *
 * Timeline rows carry the app's standard gesture (`SwipeableRow`): swipe
 * right to edit, swipe left to delete. Tapping opens the full record —
 * unlike a task row, that is a harmless read, so a stray glove tap costs
 * nothing.
 */
export default function HiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [hive, setHive] = useState<Hive | null>(null);
  const [timeline, setTimeline] = useState<Inspection[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [queen, setQueen] = useState<Queen | null>(null);
  const [lastTreatment, setLastTreatment] = useState<Treatment | null>(null);
  const [onHiveEquipment, setOnHiveEquipment] = useState<Equipment[]>([]);
  const [lastTransfer, setLastTransfer] = useState<TransferWithHives | null>(null);
  const [overdueDays, setOverdueDays] = useState(21);

  const load = useCallback(async () => {
    if (!id) return;
    const h = await hivesRepo.getById(id);
    // Deleted from the edit screen while we were away? Leave quietly.
    if (!h || h.archivedAt) {
      router.back();
      return;
    }
    setHive(h);
    const [inspections, currentQueen, treatment, gear, transfer, recency] = await Promise.all([
      inspectionsRepo.listByHive(id),
      queensRepo.current(id),
      treatmentsRepo.latestByHive(id),
      equipmentRepo.onHiveByHive(id),
      transfersRepo.latestByHive(id),
      getHiveRecency([h]),
    ]);
    setTimeline(inspections);
    // One grouped query for the whole timeline, not one per card (M6).
    setPhotoCounts(await inspectionPhotosRepo.countsByInspections(inspections.map((i) => i.id)));
    setQueen(currentQueen);
    setLastTreatment(treatment);
    setOnHiveEquipment(gear);
    setLastTransfer(transfer);
    setOverdueDays(recency.overdueDays);
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!hive) return null;

  /** "2 × Deep super · 1 × Feeder" — what is physically on the box today. */
  const equipmentValue =
    onHiveEquipment.length === 0
      ? t('equipment.noneShort')
      : onHiveEquipment
          .map((e) => `${e.quantity} × ${t(`equipmentItem.${e.item}`)}`)
          .join(' · ');

  const transferValue = (() => {
    if (!lastTransfer) return t('transfers.noneShort');
    const gave = directionFor(lastTransfer, hive.id) === 'gave';
    const what = `${lastTransfer.quantity} × ${t(`transferItem.${lastTransfer.item}`)}`;
    const where = gave
      ? t('transfers.gaveTo', { hive: lastTransfer.toLabel })
      : t('transfers.receivedFrom', { hive: lastTransfer.fromLabel });
    return `${what} · ${where}`;
  })();

  const removeInspection = (inspection: Inspection) => {
    Alert.alert(t('inspections.deleteTitle'), t('inspections.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('inspections.delete'),
        style: 'destructive',
        onPress: async () => {
          await inspectionsRepo.softDelete(inspection.id);
          // Removing the newest inspection can retract its alerts and moves
          // the neglect clock back to the one before it.
          await syncInspectionRules(inspection.hiveId);
          await load();
        },
      },
    ]);
  };

  return (
    <Screen
      title={hive.label}
      onBack={() => router.back()}
      right={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('hives.edit')}
          onPress={() => router.push(`/hives/${hive.id}/edit`)}
          style={styles.editButton}
        >
          <MaterialCommunityIcons name="pencil" size={24} color={tokens.text} />
        </TouchableOpacity>
      }
    >
      <FlatList
        data={timeline}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={[styles.typeText, { color: tokens.textMuted }]}>
              {t(`hiveType.${hive.hiveType}.label`)}
            </Text>
            <View style={styles.recencyWrap}>
              <RecencyLine
                inspectedAt={timeline[0]?.inspectedAt ?? null}
                overdueDays={overdueDays}
              />
            </View>

            {/* The queen and the last treatment are the two facts you want
                before opening a hive, so they read at a glance and open
                their own histories. */}
            <View style={styles.summaries}>
              <SummaryRow
                icon="crown-outline"
                label={t('queens.title')}
                value={queen ? formatQueenAge(t, queen.introducedAt) : t('queens.noneShort')}
                valueColor={
                  queen &&
                  isQueenAging(queenAgeMonths(queen.introducedAt, new Date().toISOString()))
                    ? tokens.statusWarning
                    : undefined
                }
                onPress={() => router.push(`/hives/${hive.id}/queens`)}
              />
              <SummaryRow
                icon="medical-bag"
                label={t('treatments.title')}
                value={
                  lastTreatment
                    ? `${t(`treatmentProduct.${lastTreatment.product}`)} · ${
                        lastTreatment.endedAt === null
                          ? t('treatments.ongoing')
                          : formatAgo(lastTreatment.startedAt)
                      }`
                    : t('treatments.noneShort')
                }
                onPress={() => router.push(`/hives/${hive.id}/treatments`)}
              />
              <SummaryRow
                icon="toolbox-outline"
                label={t('equipment.title')}
                value={equipmentValue}
                onPress={() => router.push(`/hives/${hive.id}/equipment`)}
              />
              <SummaryRow
                icon="swap-horizontal"
                label={t('transfers.title')}
                value={transferValue}
                onPress={() => router.push(`/hives/${hive.id}/transfers`)}
              />
            </View>

            <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
              {t('inspections.timeline')}
            </Text>
            {timeline.length === 0 ? (
              <EmptyState message={t('inspections.timelineEmpty')} />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <InspectionRow
            item={item}
            photoCount={photoCounts[item.id] ?? 0}
            overdueDays={overdueDays}
            onOpen={() => router.push(`/inspections/${item.id}`)}
            onEdit={() => router.push(`/inspections/${item.id}/edit`)}
            onRemove={() => removeInspection(item)}
          />
        )}
      />

      <PrimaryButton
        label={t('inspections.add')}
        icon="plus"
        onPress={() => router.push(`/inspections/new?hiveId=${hive.id}`)}
      />
    </Screen>
  );
}

/**
 * One timeline row. Gestures come from `SwipeableRow`, the same component
 * the task rows use, so the two feel identical in the hand. Tap opens the
 * inspection — unlike a task row that is a harmless read (M5c).
 */
function InspectionRow({
  item,
  photoCount,
  overdueDays,
  onOpen,
  onEdit,
  onRemove,
}: {
  item: Inspection;
  photoCount: number;
  overdueDays: number;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  /** color + icon + label, never color alone (§5 rule 3). */
  const Fact = ({
    icon,
    ok,
    label,
    showAnswer = true,
  }: {
    icon: IconName;
    ok: boolean;
    label: string;
    showAnswer?: boolean;
  }) => (
    <View style={styles.fact}>
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={ok ? tokens.statusHealthy : tokens.statusWarning}
      />
      <Text style={[styles.factText, { color: ok ? tokens.statusHealthy : tokens.statusWarning }]}>
        {label}
        {showAnswer ? ` ${ok ? t('inspections.yes') : t('inspections.no')}` : ''}
      </Text>
    </View>
  );

  return (
    <SwipeableRow
      editLabel={t('common.edit')}
      deleteLabel={t('common.delete')}
      onEdit={onEdit}
      onDelete={onRemove}
    >
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onOpen}
        style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
      >
        <Text style={[styles.cardDate, { color: tokens.text }]}>
          {formatDateTime(item.inspectedAt)}
        </Text>
        <RecencyLine inspectedAt={item.inspectedAt} overdueDays={overdueDays} />
        <View style={styles.factsRow}>
          <Fact icon="crown-outline" ok={item.queenSeen} label={t('inspections.queenSeen')} />
          <Fact icon="egg-outline" ok={item.eggsSeen} label={t('inspections.eggsSeen')} />
          {item.varroaCount !== null ? (
            <View style={styles.fact}>
              <MaterialCommunityIcons name="bug-outline" size={18} color={tokens.text} />
              <Text style={[styles.factText, { color: tokens.text }]}>
                {t('inspections.varroa')}: {item.varroaCount}
              </Text>
            </View>
          ) : null}
          {/* Pests & disease: only shown when found — cards stay compact. */}
          {item.beetlesSeen ? (
            <Fact icon="ladybug" ok={false} showAnswer={false} label={t('inspections.beetlesSeen')} />
          ) : null}
          {item.waxMothSeen ? (
            <Fact
              icon="butterfly-outline"
              ok={false}
              showAnswer={false}
              label={t('inspections.waxMothSeen')}
            />
          ) : null}
          {item.otherInsectsSeen ? (
            <Fact
              icon="spider"
              ok={false}
              showAnswer={false}
              label={t('inspections.otherInsectsSeen')}
            />
          ) : null}
          {item.diseaseSignsSeen ? (
            <Fact
              icon="alert-circle-outline"
              ok={false}
              showAnswer={false}
              label={t('inspections.diseaseSignsSeen')}
            />
          ) : null}
          {photoCount > 0 ? (
            <View style={styles.fact}>
              <MaterialCommunityIcons name="camera-outline" size={18} color={tokens.text} />
              <Text style={[styles.factText, { color: tokens.text }]}>
                {t('photos.count', { count: photoCount })}
              </Text>
            </View>
          ) : null}
        </View>
        {item.noteText ? (
          <Text numberOfLines={2} style={[styles.note, { color: tokens.textMuted }]}>
            {item.noteText}
          </Text>
        ) : null}
      </TouchableOpacity>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  editButton: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: { fontSize: sizes.fontLabel, marginTop: sp(2) },
  recencyWrap: { marginTop: sp(2) },
  summaries: { marginTop: sp(3), gap: sp(2) },
  sectionHeader: {
    fontSize: sizes.fontLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(4),
  },
  list: { paddingBottom: sp(3), gap: sp(2) },
  card: {
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    padding: sp(3),
    gap: sp(1),
  },
  cardDate: { fontSize: sizes.fontBody, fontWeight: '700' },
  cardAgo: { fontSize: sizes.fontLabel },
  factsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(3), marginTop: sp(1) },
  fact: { flexDirection: 'row', alignItems: 'center', gap: sp(1) },
  factText: { fontSize: sizes.fontLabel, fontWeight: '600' },
  note: { fontSize: sizes.fontLabel, lineHeight: 20, marginTop: sp(1) },
});
