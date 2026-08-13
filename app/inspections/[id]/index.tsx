import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PhotoStrip } from '@/src/components/PhotoStrip';
import { Screen } from '@/src/components/Screen';
import { inspectionPhotosRepo } from '@/src/db/repos/inspectionPhotosRepo';
import { inspectionsRepo, type Inspection } from '@/src/db/repos/inspectionsRepo';
import { formatDateTime } from '@/src/i18n/formatDate';
import { formatElapsed } from '@/src/i18n/formatElapsed';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * One inspection in full (M5c, user request: "no way to check out prior
 * inspections"). The timeline card only has room for the headline facts;
 * this shows everything that was recorded — and, just as importantly, says
 * plainly what was NOT checked instead of implying a zero.
 */
export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      inspectionsRepo.getById(id).then((row) => {
        // Deleted from the timeline while we were away? Leave quietly.
        if (!row || row.deletedAt) {
          router.back();
          return;
        }
        setInspection(row);
      });
      // Refetched on focus, not just on mount: coming back from the edit
      // screen is exactly when the photo list has changed.
      inspectionPhotosRepo.fileNamesByInspection(id).then(setPhotos);
    }, [id, router])
  );

  if (!inspection) return null;

  const Row = ({
    icon,
    label,
    value,
    tone,
  }: {
    icon: IconName;
    label: string;
    value: string;
    tone?: string;
  }) => (
    <View style={[styles.row, { borderColor: tokens.border }]}>
      <MaterialCommunityIcons name={icon} size={22} color={tokens.textMuted} />
      <Text style={[styles.rowLabel, { color: tokens.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: tone ?? tokens.text }]}>{value}</Text>
    </View>
  );

  /** A 0–5 rating, or an honest "not recorded". */
  const rating = (value: number | null, anchors: string) =>
    value === null ? t('inspections.notRecorded') : `${value}/5 · ${t(`rating.${anchors}.${value}`)}`;

  /** null = never looked, false = looked and clear, true = found. */
  const finding = (value: boolean | null) =>
    value === null ? t('inspections.notChecked') : value ? t('inspections.yes') : t('inspections.no');

  const findingTone = (value: boolean | null) =>
    value === null ? tokens.textMuted : value ? tokens.statusWarning : tokens.statusHealthy;

  return (
    <Screen title={t('inspections.detailTitle')} onBack={() => router.back()}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.date, { color: tokens.text }]}>
          {formatDateTime(inspection.inspectedAt)}
        </Text>
        <Text style={[styles.ago, { color: tokens.textMuted }]}>
          {t('inspections.inspectedAgo', { ago: formatElapsed(t, inspection.inspectedAt) })}
        </Text>

        <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
          {t('inspections.sectionQueen')}
        </Text>
        <Row
          icon="crown-outline"
          label={t('inspections.queenSeen')}
          value={inspection.queenSeen ? t('inspections.yes') : t('inspections.no')}
          tone={inspection.queenSeen ? tokens.statusHealthy : tokens.statusWarning}
        />
        <Row
          icon="egg-outline"
          label={t('inspections.eggsSeen')}
          value={inspection.eggsSeen ? t('inspections.yes') : t('inspections.no')}
          tone={inspection.eggsSeen ? tokens.statusHealthy : tokens.statusWarning}
        />

        <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
          {t('inspections.factorBrood')}
        </Text>
        <Row
          icon="baby-face-outline"
          label={t('inspections.larvae')}
          value={rating(inspection.larvaeCondition, 'quality')}
        />
        <Row
          icon="grid"
          label={t('inspections.brood')}
          value={rating(inspection.broodPattern, 'quality')}
        />

        <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
          {t('inspections.factorStores')}
        </Text>
        <Row
          icon="beehive-outline"
          label={t('inspections.honey')}
          value={rating(inspection.honeyStores, 'stores')}
        />
        <Row
          icon="flower-outline"
          label={t('inspections.pollen')}
          value={rating(inspection.pollenStores, 'stores')}
        />

        <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
          {t('inspections.factorCondition')}
        </Text>
        <Row
          icon="bee"
          label={t('inspections.beeDensity')}
          value={rating(inspection.beeDensity, 'density')}
        />
        <Row
          icon="water-outline"
          label={t('inspections.moisture')}
          value={rating(inspection.moisture, 'moisture')}
        />
        <Row
          icon="emoticon-outline"
          label={t('inspections.temperament')}
          value={rating(inspection.temperament, 'temperament')}
        />

        <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
          {t('inspections.factorVarroa')}
        </Text>
        <Row
          icon="bug-outline"
          label={t('inspections.varroaCount')}
          value={
            inspection.varroaCount === null
              ? t('inspections.notRecorded')
              : `${inspection.varroaCount}${
                  inspection.varroaMethod
                    ? ` · ${t(`varroaMethod.${inspection.varroaMethod}`)}`
                    : ''
                }`
          }
        />

        <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
          {t('inspections.factorPests')}
        </Text>
        <Row
          icon="ladybug"
          label={t('inspections.beetlesSeen')}
          value={finding(inspection.beetlesSeen)}
          tone={findingTone(inspection.beetlesSeen)}
        />
        <Row
          icon="butterfly-outline"
          label={t('inspections.waxMothSeen')}
          value={finding(inspection.waxMothSeen)}
          tone={findingTone(inspection.waxMothSeen)}
        />
        <Row
          icon="spider"
          label={t('inspections.otherInsectsSeen')}
          value={finding(inspection.otherInsectsSeen)}
          tone={findingTone(inspection.otherInsectsSeen)}
        />
        <Row
          icon="alert-circle-outline"
          label={t('inspections.diseaseSignsSeen')}
          value={finding(inspection.diseaseSignsSeen)}
          tone={findingTone(inspection.diseaseSignsSeen)}
        />

        {photos.length > 0 ? (
          <>
            <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
              {t('photos.section')}
            </Text>
            <PhotoStrip fileNames={photos} />
          </>
        ) : null}

        {inspection.noteText ? (
          <>
            <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
              {t('inspections.note')}
            </Text>
            <Text style={[styles.note, { color: tokens.text }]}>{inspection.noteText}</Text>
          </>
        ) : null}

        <Text style={[styles.editHint, { color: tokens.textMuted }]}>
          {t('inspections.editHint')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: sp(3), paddingBottom: sp(6) },
  date: { fontSize: sizes.fontBody, fontWeight: '700' },
  ago: { fontSize: sizes.fontLabel, marginTop: sp(1) },
  sectionHeader: {
    fontSize: sizes.fontLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(5),
    marginBottom: sp(1),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(2),
    paddingVertical: sp(2),
    borderBottomWidth: 1,
  },
  rowLabel: { fontSize: sizes.fontLabel, flex: 1 },
  rowValue: { fontSize: sizes.fontLabel, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  note: { fontSize: sizes.fontBody, lineHeight: 24, marginTop: sp(2) },
  editHint: { fontSize: sizes.fontLabel, lineHeight: 20, marginTop: sp(5) },
});
