import { useCallback, useState } from 'react';
import { Alert, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { isBefore, isToday, startOfDay } from 'date-fns';
import { EmptyState, Screen } from '@/src/components/Screen';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { SwipeableRow } from '@/src/components/SwipeableRow';
import { SETTING_KEYS, settingsRepo } from '@/src/db/repos/settingsRepo';
import { tasksRepo, type TaskWithRefs } from '@/src/db/repos/tasksRepo';
import { formatDueDate } from '@/src/i18n/formatDate';
import { ruleIdFromSource } from '@/src/logic/rules';
import { deleteTask, recomputeAllHiveStatuses, setTaskDone } from '@/src/logic/status';
import { displayTaskTitle } from '@/src/notifications/taskNotifications';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

type SectionKey = 'overdue' | 'dueToday' | 'upcoming' | 'doneToday';

interface TaskSection {
  key: SectionKey;
  data: TaskWithRefs[];
}

/**
 * Today — the workday screen (M4, task management M4b): overdue first, then
 * today, then what's coming. Row gestures: tap the circle to check off (and
 * back), swipe right to edit, swipe left to delete (soft). Checked tasks
 * stay in "Done today" until midnight, then move to Task history (clock icon).
 */
export default function TodayScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [loaded, setLoaded] = useState(false);
  // null = not read from settings yet; true/false afterwards (one-time hint).
  const [hintSeen, setHintSeen] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    // R6 (neglect) is time-based — refresh every hive's color first, so the
    // Hives tab and future map pins are honest every time you look.
    await recomputeAllHiveStatuses();
    const todayStart = startOfDay(new Date());
    const [open, doneToday, hint] = await Promise.all([
      tasksRepo.listOpen(),
      tasksRepo.listDoneSince(todayStart.toISOString()),
      settingsRepo.get(SETTING_KEYS.swipeHintSeen),
    ]);
    setHintSeen(hint === '1');
    const overdue: TaskWithRefs[] = [];
    const due: TaskWithRefs[] = [];
    const upcoming: TaskWithRefs[] = [];
    for (const task of open) {
      const dueDate = new Date(task.dueAt);
      if (isToday(dueDate)) due.push(task);
      else if (isBefore(dueDate, todayStart)) overdue.push(task);
      else upcoming.push(task);
    }
    const built: TaskSection[] = [
      { key: 'overdue' as const, data: overdue },
      { key: 'dueToday' as const, data: due },
      { key: 'upcoming' as const, data: upcoming },
      { key: 'doneToday' as const, data: doneToday },
    ].filter((s) => s.data.length > 0);
    setSections(built);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const toggle = async (task: TaskWithRefs) => {
    await setTaskDone(task, !task.doneAt);
    await load();
  };

  /**
   * Checking off "Plan varroa treatment" (R4) asks what you decided instead
   * of just clearing the row (user decision 2026-08-08). Recording the
   * treatment is what completes the task, so the mite count that raised the
   * alarm and the treatment that answered it stay connected — and the
   * "last treatment" overdose warning appears at exactly the right moment.
   *
   * Hung off the check circle on purpose: it is already the one deliberate
   * tap target on a row, so this adds no new surface for a glove to brush.
   */
  const checkOff = (task: TaskWithRefs) => {
    const hiveId = task.hiveId; // pulled out so it narrows inside the callback
    if (task.doneAt || hiveId === null || ruleIdFromSource(task.source) !== 'R4') {
      void toggle(task);
      return;
    }
    Alert.alert(t('treatments.planTitle'), t('treatments.planMessage'), [
      {
        text: t('treatments.planStart'),
        onPress: () => router.push(`/treatments/new?hiveId=${hiveId}&fromTaskId=${task.id}`),
      },
      { text: t('treatments.planJustDone'), onPress: () => void toggle(task) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const remove = async (task: TaskWithRefs) => {
    await deleteTask(task);
    await load();
  };

  const renderTask = ({ item, section }: { item: TaskWithRefs; section: TaskSection }) => (
    <TaskRow
      item={item}
      overdue={section.key === 'overdue'}
      onToggle={() => checkOff(item)}
      onRemove={() => void remove(item)}
      onEdit={() => router.push(`/tasks/${item.id}/edit`)}
    />
  );

  return (
    <Screen
      title={t('today.title')}
      right={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('tasks.history')}
          onPress={() => router.push('/tasks/history')}
          style={styles.historyButton}
        >
          <MaterialCommunityIcons name="history" size={26} color={tokens.text} />
        </TouchableOpacity>
      }
    >
      {/* One-time hint (user request): how the swipe gestures work. Shows
          only while there are tasks to swipe; "Got it" hides it forever. */}
      {loaded && hintSeen === false && sections.length > 0 ? (
        <View style={[styles.hintCard, { backgroundColor: tokens.surface, borderColor: tokens.primary }]}>
          <MaterialCommunityIcons name="gesture-swipe-horizontal" size={26} color={tokens.primary} />
          <Text style={[styles.hintText, { color: tokens.text }]}>{t('today.swipeHint')}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setHintSeen(true);
              void settingsRepo.set(SETTING_KEYS.swipeHintSeen, '1');
            }}
            style={[styles.hintButton, { backgroundColor: tokens.primary }]}
          >
            <Text style={[styles.hintButtonLabel, { color: tokens.onPrimary }]}>
              {t('today.swipeHintGotIt')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {loaded && sections.length === 0 ? (
        <EmptyState message={t('today.empty')} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
              {t(`today.${section.key}`)}
            </Text>
          )}
          renderItem={renderTask}
        />
      )}
      <PrimaryButton
        label={t('today.addTask')}
        icon="plus"
        onPress={() => router.push('/tasks/new')}
      />
    </Screen>
  );
}

/**
 * One task row. Gestures come from `SwipeableRow` — swipe right to edit,
 * swipe left for the red Delete button. Tap the circle to check off / back;
 * the row body is deliberately not a tap target (glove safety, M4b).
 */
function TaskRow({
  item,
  overdue,
  onToggle,
  onRemove,
  onEdit,
}: {
  item: TaskWithRefs;
  overdue: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const done = !!item.doneAt;
  const place = item.hiveLabel ?? item.apiaryName;

  return (
    <SwipeableRow
      editLabel={t('common.edit')}
      deleteLabel={t('common.delete')}
      onEdit={onEdit}
      onDelete={onRemove}
      marginBottom={sp(2)} // task rows space themselves, not via list gap
    >
      <View
        style={[styles.row, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
      >
        <TouchableOpacity
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={displayTaskTitle(item)}
          onPress={onToggle}
          style={styles.checkbox}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <MaterialCommunityIcons
            name={done ? 'check-circle' : 'checkbox-blank-circle-outline'}
            size={32}
            color={done ? tokens.statusHealthy : tokens.primary}
          />
        </TouchableOpacity>
        {/* Plain View on purpose (user decision): editing ONLY via swipe —
            a tap target here would fire on accidental glove touches. */}
        <View style={styles.rowText}>
          <Text
            style={[
              styles.rowTitle,
              { color: done ? tokens.textMuted : tokens.text },
              done && styles.rowTitleDone,
            ]}
          >
            {displayTaskTitle(item)}
          </Text>
          <View style={styles.rowSubLine}>
            {overdue ? (
              <MaterialCommunityIcons
                name="clock-alert-outline"
                size={16}
                color={tokens.statusWarning}
              />
            ) : null}
            <Text
              style={[
                styles.rowSub,
                { color: overdue ? tokens.statusWarning : tokens.textMuted },
              ]}
            >
              {formatDueDate(item.dueAt)}
              {place ? `  ·  ${place}` : ''}
            </Text>
          </View>
        </View>
      </View>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: sp(3) },
  sectionHeader: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(5),
    marginBottom: sp(2),
  },
  historyButton: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintCard: {
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    padding: sp(3),
    marginTop: sp(3),
    gap: sp(2),
  },
  hintText: { fontSize: sizes.fontLabel, lineHeight: 21 },
  hintButton: {
    minHeight: sizes.tapMin,
    borderRadius: sizes.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sp(4),
    alignSelf: 'flex-start',
  },
  hintButtonLabel: { fontSize: sizes.fontBody, fontWeight: '700' },
  row: {
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(2),
    paddingHorizontal: sp(2),
    paddingVertical: sp(2),
    marginBottom: sp(2),
  },
  checkbox: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2, justifyContent: 'center', minHeight: sizes.tapMin },
  rowTitle: { fontSize: sizes.fontBody, fontWeight: '600' },
  rowTitleDone: { textDecorationLine: 'line-through' },
  rowSubLine: { flexDirection: 'row', alignItems: 'center', gap: sp(1) },
  rowSub: { fontSize: sizes.fontLabel },
});
