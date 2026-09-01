import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FormField } from '@/src/components/FormField';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { SETTING_KEYS, settingsRepo } from '@/src/db/repos/settingsRepo';
import { RULE_GROUPS, type RuleGroup } from '@/src/logic/rules';
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
 * Settings → Assistant (M4, made switchable in M6e).
 *
 * Three layers, in the order a person thinks about them: do I want an
 * assistant at all → which of its jobs do I want → what are my numbers.
 * Season windows are NOT here on purpose; they follow the apiary's location.
 *
 * Turning the assistant off leaves EXISTING tasks alone. Silencing an
 * assistant is not the same as deleting work you already booked, and the
 * per-rule switches are remembered, so turning it back on restores exactly
 * the setup you had.
 */
export default function RulesSettingsScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldKey, string> | null>(null);
  const [assistantEnabled, setAssistantEnabled] = useState(true);
  const [ruleEnabled, setRuleEnabled] = useState<Record<RuleGroup, boolean>>({
    R1: true,
    R2: true,
    R3: true,
    R4: true,
    R5: true,
    R7: true,
  });

  useEffect(() => {
    getRuleSettings(null).then((s) => {
      setValues({
        varroaSeasonPct: String(s.varroaSeasonPct),
        varroaPreWinterPct: String(s.varroaPreWinterPct),
        stickyBoardPerDay: String(s.stickyBoardPerDay),
        inspectionOverdueDays: String(s.inspectionOverdueDays),
      });
      setAssistantEnabled(s.assistantEnabled);
      setRuleEnabled(s.ruleEnabled);
    });
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
      JSON.stringify({ ...existing, ...parsed, assistantEnabled, ruleEnabled })
    );
    router.back();
  };

  /** One switch row: icon + name + what it actually does + the toggle. */
  const switchRow = (
    key: string,
    on: boolean,
    onPress: () => void,
    icon: 'robot-outline' | 'checkbox-marked-circle-outline',
    dimmed = false
  ) => (
    <TouchableOpacity
      key={key}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[
        styles.switchRow,
        { backgroundColor: tokens.surface, borderColor: tokens.border, opacity: dimmed ? 0.5 : 1 },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={on ? tokens.primary : tokens.textMuted}
      />
      <View style={styles.switchText}>
        <Text style={[styles.switchLabel, { color: tokens.text }]}>
          {t(`rulesSettings.${key}`)}
        </Text>
        <Text style={[styles.switchDesc, { color: tokens.textMuted }]}>
          {t(`rulesSettings.${key}Desc`)}
        </Text>
      </View>
      <MaterialCommunityIcons
        name={on ? 'toggle-switch' : 'toggle-switch-off-outline'}
        size={38}
        color={on ? tokens.primary : tokens.textMuted}
      />
    </TouchableOpacity>
  );

  return (
    <Screen title={t('rulesSettings.title')} onBack={() => router.back()}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: tokens.textMuted }]}>
          {t('rulesSettings.hint')}
        </Text>

        {switchRow(
          'assistantEnabled',
          assistantEnabled,
          () => setAssistantEnabled((v) => !v),
          'robot-outline'
        )}

        {/* The per-rule switches stay visible but dimmed when the master
            switch is off — hiding them would make the app look like it had
            forgotten the choices, which it has not. */}
        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
          {t('rulesSettings.rulesSection')}
        </Text>
        {RULE_GROUPS.map((group) =>
          switchRow(
            group,
            assistantEnabled && ruleEnabled[group],
            () => setRuleEnabled((prev) => ({ ...prev, [group]: !prev[group] })),
            'checkbox-marked-circle-outline',
            !assistantEnabled
          )
        )}

        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
          {t('rulesSettings.numbersSection')}
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
  hint: { fontSize: sizes.fontLabel, lineHeight: 21, marginTop: sp(3), marginBottom: sp(3) },
  sectionLabel: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(5),
    marginBottom: sp(2),
  },
  switchRow: {
    minHeight: sizes.tapPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(3),
    paddingHorizontal: sp(3),
    paddingVertical: sp(2),
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    marginBottom: sp(2),
  },
  switchText: { flex: 1, gap: 2 },
  switchLabel: { fontSize: sizes.fontBody, fontWeight: '600' },
  switchDesc: { fontSize: sizes.fontLabel, lineHeight: 19 },
});
