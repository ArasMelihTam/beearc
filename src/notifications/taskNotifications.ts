import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '../i18n';
import type { Task } from '../db/repos/tasksRepo';
import { ruleIdFromSource } from '../logic/rules';

/**
 * LOCAL notifications only (§3 — no push, no server, works in airplane mode).
 * The phone itself fires them at the scheduled time; nothing leaves the device.
 *
 * Trick that keeps this simple: the notification identifier IS the task id,
 * so canceling on check-off needs no lookup table.
 */

// How a notification behaves if it fires while the app is open in the
// foreground (module scope: runs once at import, before any scheduling).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Ask for permission lazily — the first time something actually schedules,
 * not at app start. The OS remembers the answer; repeated calls are cheap.
 * Returns false if the user said no (tasks still work, just silently).
 */
async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Android routes notifications through named channels; iOS ignores this. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('tasks', {
    name: 'Tasks',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Rule tasks are stored with a canonical English title; translate for display. */
export function displayTaskTitle(task: Pick<Task, 'title' | 'source'>): string {
  const ruleId = ruleIdFromSource(task.source);
  return ruleId ? i18n.t(`rules.${ruleId}`) : task.title;
}

/**
 * Schedule (or silently skip) the reminder for one task.
 * Skips: already done, due in the past, or permission denied.
 */
export async function scheduleTaskNotification(
  task: Task,
  hiveLabel?: string | null
): Promise<void> {
  try {
    if (task.doneAt) return;
    const due = new Date(task.dueAt);
    if (due.getTime() <= Date.now()) return;
    if (!(await ensurePermission())) return;
    await ensureAndroidChannel();

    // IMPORTANT (device-found crash): iOS's native module rejects explicit
    // `undefined` for optional fields ("Cannot cast 'nil' for field 'body'").
    // Optional fields must be OMITTED from the object, never set to undefined.
    const content: Notifications.NotificationContentInput = {
      title: displayTaskTitle(task),
    };
    if (hiveLabel) content.body = hiveLabel;

    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: due,
    };
    if (Platform.OS === 'android') trigger.channelId = 'tasks';

    await Notifications.scheduleNotificationAsync({
      identifier: task.id, // cancel by task id later
      content,
      trigger,
    });
  } catch (e) {
    // A failed reminder must NEVER break saving the task itself.
    console.warn('scheduleTaskNotification failed:', e);
  }
}

export async function cancelTaskNotification(taskId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(taskId);
  } catch (e) {
    console.warn('cancelTaskNotification failed:', e);
  }
}
