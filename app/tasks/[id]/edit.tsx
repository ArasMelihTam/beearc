import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ChipPicker } from '@/src/components/ChipPicker';
import { DueDayPicker } from '@/src/components/DueDayPicker';
import { FormField } from '@/src/components/FormField';
import { NotifyToggle } from '@/src/components/NotifyToggle';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { Screen } from '@/src/components/Screen';
import { apiariesRepo, type ApiaryWithHiveCount } from '@/src/db/repos/apiariesRepo';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { tasksRepo, type Task } from '@/src/db/repos/tasksRepo';
import { nowIso } from '@/src/db/util';
import { formatDueDate } from '@/src/i18n/formatDate';
import { dueInDays, ruleIdFromSource } from '@/src/logic/rules';
import { updateTask } from '@/src/logic/status';
import { displayTaskTitle } from '@/src/notifications/taskNotifications';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Edit task (M4b). Manual tasks: everything editable. Rule tasks: only the
 * due date and details — the title and hive ARE the condition the assistant
 * is tracking; changing them would break the link between task and alert.
 */
export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [dueTouched, setDueTouched] = useState(false);
  const [notify, setNotify] = useState(true);
  const [apiaries, setApiaries] = useState<ApiaryWithHiveCount[]>([]);
  const [apiaryId, setApiaryId] = useState<string | null>(null);
  const [hives, setHives] = useState<Hive[]>([]);
  const [hiveId, setHiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const isRuleTask = task ? ruleIdFromSource(task.source) !== null : false;

  useEffect(() => {
    if (!id) return;
    (async () => {
      const loaded = await tasksRepo.getById(id);
      if (!loaded || loaded.deletedAt) {
        router.back();
        return;
      }
      setTask(loaded);
      setTitle(loaded.title);
      setDetails(loaded.details ?? '');
      setNotify(loaded.notify);
      setApiaries(await apiariesRepo.listActive());
      // Resolve the current link for the chips (hive → find its apiary).
      if (loaded.hiveId) {
        const hive = await hivesRepo.getById(loaded.hiveId);
        if (hive) {
          setApiaryId(hive.apiaryId);
          setHives(await hivesRepo.listActiveByApiary(hive.apiaryId));
          setHiveId(hive.id);
        }
      } else if (loaded.apiaryId) {
        setApiaryId(loaded.apiaryId);
        setHives(await hivesRepo.listActiveByApiary(loaded.apiaryId));
      }
      setHydrated(true);
    })();
  }, [id, router]);

  // Apiary change resets the hive choice — but not during initial hydration.
  const changeApiary = async (nextId: string | null) => {
    setApiaryId(nextId);
    setHiveId(null);
    setHives(nextId ? await hivesRepo.listActiveByApiary(nextId) : []);
  };

  if (!task || !hydrated) return null;

  const handleSave = async () => {
    if (!isRuleTask && !title.trim()) {
      Alert.alert(t('tasks.titleRequired'));
      return;
    }
    await updateTask(task, {
      // Rule tasks keep their canonical stored title (translated at render).
      title: isRuleTask ? task.title : title,
      details: details || null,
      dueAt: dueTouched ? dueInDays(nowIso(), dayOffset) : task.dueAt,
      hiveId: isRuleTask ? task.hiveId : hiveId,
      apiaryId: isRuleTask ? task.apiaryId : hiveId ? null : apiaryId,
      // Editable on rule tasks too: the assistant decides WHAT to track, the
      // beekeeper decides whether it is allowed to interrupt them.
      notify,
    });
    router.back();
  };

  return (
    <Screen title={t('tasks.edit')} onBack={() => router.back()}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {isRuleTask ? (
          <>
            <View style={styles.ruleHeader}>
              <MaterialCommunityIcons name="robot-outline" size={22} color={tokens.primary} />
              <Text style={[styles.ruleTitle, { color: tokens.text }]}>
                {displayTaskTitle(task)}
              </Text>
            </View>
            <Text style={[styles.ruleHint, { color: tokens.textMuted }]}>
              {t('tasks.ruleLocked')}
            </Text>
          </>
        ) : (
          <FormField
            label={t('tasks.titleLabel')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('tasks.titlePlaceholder')}
          />
        )}

        <FormField
          label={t('tasks.details')}
          value={details}
          onChangeText={setDetails}
          multiline
        />

        <DueDayPicker
          dayOffset={dayOffset}
          onChange={(d) => {
            setDueTouched(true);
            setDayOffset(d);
          }}
          fixedLabel={dueTouched ? null : formatDueDate(task.dueAt)}
        />

        <NotifyToggle value={notify} onChange={setNotify} hint={t('notify.taskHint')} />

        {!isRuleTask && apiaries.length > 0 ? (
          <>
            <Text style={[styles.label, { color: tokens.textMuted }]}>
              {t('tasks.linkLabel')}
            </Text>
            <ChipPicker<string>
              options={apiaries.map((a) => a.id)}
              value={apiaryId}
              onChange={(v) => void changeApiary(v)}
              getLabel={(aid) => apiaries.find((a) => a.id === aid)?.name ?? '?'}
            />
            {hives.length > 0 ? (
              <View style={styles.hiveChips}>
                <ChipPicker<string>
                  options={hives.map((h) => h.id)}
                  value={hiveId}
                  onChange={setHiveId}
                  getLabel={(hid) => hives.find((h) => h.id === hid)?.label ?? '?'}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <PrimaryButton label={t('common.save')} icon="check" onPress={() => void handleSave()} />
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
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: sp(2), marginTop: sp(4) },
  ruleTitle: { fontSize: sizes.fontBody, fontWeight: '700', flex: 1 },
  ruleHint: { fontSize: sizes.fontLabel, lineHeight: 20, marginTop: sp(1) },
  hiveChips: { marginTop: sp(2) },
});
