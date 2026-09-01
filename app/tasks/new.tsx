import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChipPicker } from '@/src/components/ChipPicker';
import { DueDayPicker } from '@/src/components/DueDayPicker';
import { FormField } from '@/src/components/FormField';
import { MultiChipPicker } from '@/src/components/MultiChipPicker';
import { NotifyToggle } from '@/src/components/NotifyToggle';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { apiariesRepo, type ApiaryWithHiveCount } from '@/src/db/repos/apiariesRepo';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { tasksRepo } from '@/src/db/repos/tasksRepo';
import { nowIso } from '@/src/db/util';
import { dueInDays } from '@/src/logic/rules';
import { scheduleTaskNotification } from '@/src/notifications/taskNotifications';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Manual task creation (M4, multi-hive in M4b). Gloves rule the design:
 * due dates are big chips + a ±1 day stepper, hive links are toggle chips.
 *
 * Multi-hive (user request — equalizing, feeding rounds): selecting several
 * hives creates ONE TASK PER HIVE, not one shared task. That way each hive
 * gets its own check-off — you know exactly where you stopped when the smoker
 * goes out. The rules/status engine needs no change for this.
 */
export default function NewTaskScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dayOffset, setDayOffset] = useState(1); // default: tomorrow
  const [notify, setNotify] = useState(true); // the bell — on unless muted
  const [apiaries, setApiaries] = useState<ApiaryWithHiveCount[]>([]);
  const [apiaryId, setApiaryId] = useState<string | null>(null);
  const [hives, setHives] = useState<Hive[]>([]);
  const [hiveIds, setHiveIds] = useState<string[]>([]);

  useEffect(() => {
    apiariesRepo.listActive().then(setApiaries);
  }, []);

  // Changing apiary resets the hive choice — hives belong to one apiary.
  useEffect(() => {
    setHiveIds([]);
    if (!apiaryId) {
      setHives([]);
      return;
    }
    hivesRepo.listActiveByApiary(apiaryId).then(setHives);
  }, [apiaryId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('tasks.titleRequired'));
      return;
    }
    const dueAt = dueInDays(nowIso(), dayOffset);
    const base = { title, details: details || null, dueAt, notify };
    if (hiveIds.length === 0) {
      // No specific hive: link the apiary if one is chosen, else free-floating.
      const task = await tasksRepo.create({ ...base, apiaryId });
      await scheduleTaskNotification(task);
    } else {
      // One row per hive — independent check-off per hive.
      for (const hiveId of hiveIds) {
        const task = await tasksRepo.create({ ...base, hiveId });
        await scheduleTaskNotification(task, hives.find((h) => h.id === hiveId)?.label);
      }
    }
    router.back();
  };

  return (
    <Screen title={t('tasks.new')} onBack={() => router.back()}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormField
          label={t('tasks.titleLabel')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('tasks.titlePlaceholder')}
        />
        <FormField
          label={t('tasks.details')}
          value={details}
          onChangeText={setDetails}
          multiline
        />

        <DueDayPicker dayOffset={dayOffset} onChange={setDayOffset} />

        {/* Icon only, right of the due date — it is a question about that date. */}
        <NotifyToggle value={notify} onChange={setNotify} hintKey="notify.taskHint" />

        {apiaries.length > 0 ? (
          <>
            <Text style={[styles.label, { color: tokens.textMuted }]}>
              {t('tasks.linkLabel')}
            </Text>
            <ChipPicker<string>
              options={apiaries.map((a) => a.id)}
              value={apiaryId}
              onChange={setApiaryId}
              getLabel={(id) => apiaries.find((a) => a.id === id)?.name ?? '?'}
            />
            {hives.length > 0 ? (
              <View style={styles.hiveChips}>
                <MultiChipPicker<string>
                  options={hives.map((h) => h.id)}
                  values={hiveIds}
                  onChange={setHiveIds}
                  getLabel={(id) => hives.find((h) => h.id === id)?.label ?? '?'}
                />
                {hiveIds.length > 1 ? (
                  <Text style={[styles.multiHint, { color: tokens.textMuted }]}>
                    {t('tasks.multiHint', { count: hiveIds.length })}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <PrimaryButton label={t('tasks.save')} icon="check" onPress={() => void handleSave()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: sp(3) },
  label: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(4),
    marginBottom: sp(2),
  },
  hiveChips: { marginTop: sp(2) },
  multiHint: { fontSize: sizes.fontLabel, lineHeight: 20, marginTop: sp(2) },
});
