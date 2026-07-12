import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EmptyState, Screen } from '@/src/components/Screen';
import { tasksRepo, type TaskWithRefs } from '@/src/db/repos/tasksRepo';
import { formatDateTime } from '@/src/i18n/formatDate';
import { setTaskDone } from '@/src/logic/status';
import { displayTaskTitle } from '@/src/notifications/taskNotifications';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Task history (M4b): everything ever checked off, newest first. Done tasks
 * show on Today only for the day itself; after that they live here.
 * The checkbox still works — un-checking sends the task back to Today
 * ("I thought I fed them, but the feeder was still full").
 */
export default function TaskHistoryScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<TaskWithRefs[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      tasksRepo.listHistory().then((rows) => {
        setItems(rows);
        setLoaded(true);
      });
    }, [])
  );

  const uncheck = async (task: TaskWithRefs) => {
    await setTaskDone(task, false);
    setItems((prev) => prev.filter((x) => x.id !== task.id));
  };

  return (
    <Screen title={t('tasks.history')} onBack={() => router.back()}>
      {loaded && items.length === 0 ? (
        <EmptyState message={t('tasks.historyEmpty')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const place = item.hiveLabel ?? item.apiaryName;
            return (
              <View
                style={[
                  styles.row,
                  { backgroundColor: tokens.surface, borderColor: tokens.border },
                ]}
              >
                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: true }}
                  accessibilityLabel={displayTaskTitle(item)}
                  onPress={() => void uncheck(item)}
                  style={styles.checkbox}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={32}
                    color={tokens.statusHealthy}
                  />
                </TouchableOpacity>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: tokens.text }]}>
                    {displayTaskTitle(item)}
                  </Text>
                  <Text style={[styles.rowSub, { color: tokens.textMuted }]}>
                    {item.doneAt ? formatDateTime(item.doneAt) : ''}
                    {place ? `  ·  ${place}` : ''}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: sp(3), paddingBottom: sp(3) },
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
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: sizes.fontBody, fontWeight: '600' },
  rowSub: { fontSize: sizes.fontLabel },
});
