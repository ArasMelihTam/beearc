import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FormField } from '@/src/components/FormField';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { SETTING_KEYS, settingsRepo } from '@/src/db/repos/settingsRepo';
import { getRuleSettings } from '@/src/logic/status';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/** The four §7 thresholds the beekeeper may tune. Stored as a JSON partial. */
const FIELDS = [
  'varroaSeasonPct',
  'varroaPreWinterPct',
  'stickyBoardPerDay',
  'inspectionOverdueDays',
] as const;
type FieldKey = (typeof FIELDS)[number];

/**
 * Comma decimals welcome (Turkish keyboards) — same convention as the
 * apiary coordinate fields.
 */
const parseNum = (raw: string): number | null => {
  const n = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Settings → Assistant rules (M4): edit the varroa alarm thresholds and the
 * neglect reminder. Season windows are NOT here on purpose — they follow the
 * apiary's location automatically (hemisphere-aware defaults).
 */
export default function RulesSettingsScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldKey, string> | null>(null);

  useEffect(() => {
    getRuleSettings(null).then((s) =>
      setValues({
        varroaSeasonPct: String(s.varroaSeasonPct),
        varroaPreWinterPct: String(s.varroaPreWinterPct),
        stickyBoardPerDay: String(s.stickyBoardPerDay),
        inspectionOverdueDays: String(s.inspectionOverdueDays),
      })
    );
  }, []);

  if (!values) return null;

  const handleSave = async () => {
    const parsed: Partial<Record<FieldKey, number>> = {};
    for (const key of FIELDS) {
      const n = parseNum(values[key]);
      if (n === null) {
        Alert.alert(t('rulesSettings.invalid'));
        return;
      }
      parsed[key] = n;
    }
    // Store ONLY the overrides — defaults (incl. season windows) stay live.
    const json = await settingsRepo.get(SETTING_KEYS.ruleSettings);
    let existing: Record<string, unknown> = {};
    try {
      existing = json ? (JSON.parse(json) as Record<string, unknown>) : {};
    } catch {
      existing = {};
    }
    await settingsRepo.set(
      SETTING_KEYS.ruleSettings,
      JSON.stringify({ ...existing, ...parsed })
    );
    router.back();
  };

  return (
    <Screen title={t('rulesSettings.title')} onBack={() => router.back()}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: tokens.textMuted }]}>
          {t('rulesSettings.hint')}
        </Text>
        {FIELDS.map((key) => (
          <FormField
            key={key}
            label={t(`rulesSettings.${key}`)}
            value={values[key]}
            onChangeText={(v) => setValues((prev) => ({ ...prev!, [key]: v }))}
            keyboardType="decimal-pad"
          />
        ))}
      </ScrollView>
      <PrimaryButton label={t('common.save')} icon="check" onPress={() => void handleSave()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: sp(3) },
  hint: { fontSize: sizes.fontLabel, lineHeight: 21, marginTop: sp(3) },
});
