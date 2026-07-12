import { apiariesRepo } from '../db/repos/apiariesRepo';
import { hivesRepo, type Hive } from '../db/repos/hivesRepo';
import { inspectionsRepo, type Inspection } from '../db/repos/inspectionsRepo';
import { SETTING_KEYS, settingsRepo } from '../db/repos/settingsRepo';
import { tasksRepo, type Task, type TaskUpdateInput } from '../db/repos/tasksRepo';
import {
  cancelTaskNotification,
  scheduleTaskNotification,
} from '../notifications/taskNotifications';
import {
  defaultRuleSettings,
  deriveHiveStatus,
  evaluateInspection,
  type RuleSettings,
  type RuleTaskDraft,
} from './rules';

/**
 * The IMPURE half of the assistant: reads the DB, applies the pure rules
 * (src/logic/rules.ts), writes tasks and statuses back. Screens call these
 * few functions and never touch the rules directly.
 */

/**
 * User overrides (Settings → Assistant rules) merged over hemisphere-aware
 * defaults. `latitude` comes from the hive's apiary — a southern-hemisphere
 * apiary gets its season windows flipped automatically.
 */
export async function getRuleSettings(latitude?: number | null): Promise<RuleSettings> {
  const base = defaultRuleSettings(latitude);
  const json = await settingsRepo.get(SETTING_KEYS.ruleSettings);
  if (!json) return base;
  try {
    const stored: Partial<RuleSettings> = JSON.parse(json);
    return {
      ...base,
      ...stored,
      // Nested objects must merge, not replace, or a partial override
      // (e.g. only formic_acid) would wipe the other defaults.
      treatmentDurationDays: {
        ...base.treatmentDurationDays,
        ...(stored.treatmentDurationDays ?? {}),
      },
      season: stored.season ?? base.season,
      preWinter: stored.preWinter ?? base.preWinter,
    };
  } catch {
    return base; // corrupt JSON → safe defaults, never a crash
  }
}

async function settingsForHive(hive: Hive): Promise<RuleSettings> {
  const apiary = await apiariesRepo.getById(hive.apiaryId);
  return getRuleSettings(apiary?.latitude);
}

/**
 * Recompute one hive's derived status (§7) and store it if it changed.
 * Called after every inspection save and every task check-off/un-check.
 */
export async function recomputeHiveStatus(hiveId: string): Promise<void> {
  const hive = await hivesRepo.getById(hiveId);
  if (!hive || hive.archivedAt) return;
  const settings = await settingsForHive(hive);
  const [openRuleSources, latest] = await Promise.all([
    tasksRepo.listOpenRuleSourcesByHive(hiveId),
    inspectionsRepo.latestByHive(hiveId),
  ]);
  const status = deriveHiveStatus(
    {
      openRuleSources,
      lastInspectedAt: latest?.inspectedAt ?? null,
      hiveCreatedAt: hive.createdAt,
      nowIso: new Date().toISOString(),
    },
    settings
  );
  if (status !== hive.status) await hivesRepo.updateStatus(hiveId, status);
}

/**
 * R6 is time-based (neglect), so statuses drift without any event.
 * The Today screen calls this on focus to keep every pin honest.
 */
export async function recomputeAllHiveStatuses(): Promise<void> {
  const all = await hivesRepo.listAllActive();
  for (const hive of all) await recomputeHiveStatus(hive.id);
}

/** Create the drafted tasks (skipping duplicates) and schedule reminders. */
async function materializeDrafts(
  hive: Hive,
  drafts: RuleTaskDraft[]
): Promise<void> {
  for (const draft of drafts) {
    // Guard: two bad inspections in a row must not stack identical tasks.
    if (await tasksRepo.hasOpenBySource(hive.id, draft.source)) continue;
    const task = await tasksRepo.create({
      title: draft.title,
      dueAt: draft.dueAt,
      hiveId: hive.id,
      source: draft.source,
    });
    await scheduleTaskNotification(task, hive.label);
  }
}

/**
 * THE entry point after saving an inspection: run R3/R4/R5, create their
 * tasks, then refresh the hive's status. (R1/R2 get their entry points in M5
 * when equipment and treatment screens exist.)
 */
export async function applyInspectionRules(inspection: Inspection): Promise<void> {
  const hive = await hivesRepo.getById(inspection.hiveId);
  if (!hive) return;
  const settings = await settingsForHive(hive);
  const drafts = evaluateInspection(
    {
      inspectedAt: inspection.inspectedAt,
      queenSeen: inspection.queenSeen,
      eggsSeen: inspection.eggsSeen,
      honeyStores: inspection.honeyStores,
      varroaCount: inspection.varroaCount,
      varroaMethod: inspection.varroaMethod,
    },
    settings
  );
  await materializeDrafts(hive, drafts);
  await recomputeHiveStatus(inspection.hiveId);
}

/**
 * Check-off / un-check from the Today screen. Completing a rule task clears
 * its condition, so the linked hive's status is recomputed right away.
 */
export async function setTaskDone(task: Task, done: boolean): Promise<void> {
  await tasksRepo.setDone(task.id, done);
  if (done) {
    await cancelTaskNotification(task.id);
  } else {
    const fresh = await tasksRepo.getById(task.id);
    if (fresh) await scheduleTaskNotification(fresh);
  }
  if (task.hiveId) await recomputeHiveStatus(task.hiveId);
}

/**
 * Swipe-to-delete (M4b). Soft delete — the row is hidden, never erased.
 * Deleting an open RULE task counts as dismissing its condition, so the hive
 * may turn healthy; if the problem is still real, the next inspection will
 * simply recreate the task (the duplicate guard only checks OPEN tasks).
 */
export async function deleteTask(task: Task): Promise<void> {
  await tasksRepo.softDelete(task.id);
  await cancelTaskNotification(task.id);
  if (task.hiveId) await recomputeHiveStatus(task.hiveId);
}

/**
 * Edit (M4b): persist, re-point the reminder at the new due date, and
 * recompute BOTH the old and new hive if the link moved.
 */
export async function updateTask(task: Task, input: TaskUpdateInput): Promise<void> {
  await tasksRepo.update(task.id, input);
  await cancelTaskNotification(task.id);
  const fresh = await tasksRepo.getById(task.id);
  if (fresh && !fresh.doneAt) {
    const hive = fresh.hiveId ? await hivesRepo.getById(fresh.hiveId) : null;
    await scheduleTaskNotification(fresh, hive?.label ?? null);
  }
  if (task.hiveId) await recomputeHiveStatus(task.hiveId);
  if (input.hiveId && input.hiveId !== task.hiveId) await recomputeHiveStatus(input.hiveId);
}
