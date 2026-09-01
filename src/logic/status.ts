import { apiariesRepo } from '../db/repos/apiariesRepo';
import type { Equipment } from '../db/repos/equipmentRepo';
import { hivesRepo, type Hive } from '../db/repos/hivesRepo';
import { inspectionsRepo, type Inspection } from '../db/repos/inspectionsRepo';
import { SETTING_KEYS, settingsRepo } from '../db/repos/settingsRepo';
import { tasksRepo, type Task, type TaskUpdateInput } from '../db/repos/tasksRepo';
import type { Treatment } from '../db/repos/treatmentsRepo';
import {
  cancelTaskNotification,
  scheduleTaskNotification,
} from '../notifications/taskNotifications';
import {
  defaultRuleSettings,
  deriveHiveStatus,
  evaluateEquipmentAdded,
  evaluateInspection,
  evaluateTreatmentEnded,
  evaluateTreatmentStarted,
  isRuleEnabled,
  ruleSource,
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
      treatmentWithdrawalDays: {
        ...base.treatmentWithdrawalDays,
        ...(stored.treatmentWithdrawalDays ?? {}),
      },
      ruleEnabled: {
        ...base.ruleEnabled,
        ...(stored.ruleEnabled ?? {}),
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

/**
 * Create the drafted tasks (skipping duplicates) and schedule reminders.
 * `notify: false` (M6d) still creates the task — it just never rings.
 *
 * ONE gate for the whole assistant (M6e): a switched-off rule is filtered
 * here, at the single place drafts become rows. The pure evaluate functions
 * stay unaware of it, so the rules keep being testable as plain arithmetic.
 */
async function materializeDrafts(
  hive: Hive,
  drafts: RuleTaskDraft[],
  settings: RuleSettings,
  notify = true
): Promise<void> {
  for (const draft of drafts) {
    if (!isRuleEnabled(settings, draft.ruleId)) continue;
    // Guard: two bad inspections in a row must not stack identical tasks.
    if (await tasksRepo.hasOpenBySource(hive.id, draft.source)) continue;
    const task = await tasksRepo.create({
      title: draft.title,
      dueAt: draft.dueAt,
      hiveId: hive.id,
      source: draft.source,
      notify,
    });
    // scheduleTaskNotification skips muted tasks itself; calling it either
    // way keeps one code path.
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
  await materializeDrafts(hive, drafts, settings);
  await recomputeHiveStatus(inspection.hiveId);
}

/**
 * When each hive was last inspected, plus the neglect threshold to shade it
 * against (R6's `inspectionOverdueDays`, which the beekeeper can edit).
 *
 * This is all the hive list needs: a date and a tone. There is no scoring —
 * a colony's condition is the beekeeper's judgement, and the app's job is to
 * put the facts in front of them, not to grade the bees.
 */
export interface HiveRecency {
  /** hive id → newest inspection timestamp, or null if never inspected. */
  lastInspectedAt: Record<string, string | null>;
  overdueDays: number;
}

export async function getHiveRecency(
  hives: Hive[],
  latitude?: number | null
): Promise<HiveRecency> {
  if (hives.length === 0) return { lastInspectedAt: {}, overdueDays: 21 };
  // Two queries for the whole apiary, not two per hive — this runs on every
  // focus and an apiary can hold forty hives.
  const [settings, latest] = await Promise.all([
    getRuleSettings(latitude),
    inspectionsRepo.latestByHives(hives.map((h) => h.id)),
  ]);
  const lastInspectedAt: Record<string, string | null> = {};
  for (const hive of hives) lastInspectedAt[hive.id] = latest[hive.id] ?? null;
  return { lastInspectedAt, overdueDays: settings.inspectionOverdueDays };
}

/** The rules that read an inspection — the only ones a correction can undo. */
const INSPECTION_RULE_IDS = ['R3', 'R4', 'R5'] as const;

/**
 * Re-derive the inspection rules for a hive from its NEWEST surviving
 * inspection (M5c) — used after an inspection is edited or deleted.
 *
 * Unlike saving a new inspection, this also RETRACTS: if the corrected record
 * no longer says "no queen, no eggs", the open "recheck for queen/eggs" task
 * goes away and the hive stops being red. A typo must not leave the beekeeper
 * with a chore that was never real.
 *
 * Saving a *new* inspection deliberately keeps the old behaviour (open tasks
 * stay until they are checked off or swiped away, master prompt §7) — a good
 * inspection today does not prove yesterday's problem was handled.
 */
export async function syncInspectionRules(hiveId: string): Promise<void> {
  const hive = await hivesRepo.getById(hiveId);
  if (!hive) return;
  const settings = await settingsForHive(hive);
  const latest = await inspectionsRepo.latestByHive(hiveId);
  const drafts = latest
    ? evaluateInspection(
        {
          inspectedAt: latest.inspectedAt,
          queenSeen: latest.queenSeen,
          eggsSeen: latest.eggsSeen,
          honeyStores: latest.honeyStores,
          varroaCount: latest.varroaCount,
          varroaMethod: latest.varroaMethod,
        },
        settings
      )
    : [];

  const stillJustified = new Set(drafts.map((d) => d.ruleId));
  for (const ruleId of INSPECTION_RULE_IDS) {
    if (stillJustified.has(ruleId)) continue;
    const stale = await tasksRepo.getOpenBySource(hiveId, ruleSource(ruleId));
    if (!stale) continue;
    await tasksRepo.softDelete(stale.id);
    await cancelTaskNotification(stale.id);
  }

  await materializeDrafts(hive, drafts, settings);
  await recomputeHiveStatus(hiveId);
}

/**
 * R1 — a super went on the hive: remind the beekeeper to check how it is
 * filling (M5b). Only supers trigger it, and only when a row is first added:
 * editing an old entry must not book a fresh chore.
 *
 * Same known limit as R2: the duplicate guard is per rule per hive, so
 * stacking a second super while the first check is still open adds no second
 * reminder — one "check the supers" trip covers both.
 */
export async function applyEquipmentAdded(item: Equipment): Promise<void> {
  const hive = await hivesRepo.getById(item.hiveId);
  if (!hive) return;
  const settings = await settingsForHive(hive);
  await materializeDrafts(hive, evaluateEquipmentAdded(item.item, item.addedAt, settings), settings);
}

/**
 * R2 (start) — a treatment went on the hive: schedule the reminder to take it
 * off again after the product's typical duration (M5a). Nothing here colors
 * the hive: R2 is a reminder, not an alarm (§7 decision at M4).
 *
 * Known limit: the duplicate guard is per rule per hive, so a second
 * treatment started on the SAME hive while the first is still running gets no
 * second "end treatment" reminder. Two concurrent products on one colony is
 * rare and usually a mistake — the "last treatment" warning shows it.
 */
export async function applyTreatmentStarted(treatment: Treatment): Promise<void> {
  const hive = await hivesRepo.getById(treatment.hiveId);
  if (!hive) return;
  const settings = await settingsForHive(hive);
  await materializeDrafts(
    hive,
    // The duration recorded on the row wins over the product table (M6c) —
    // it is what the beekeeper read off the actual box.
    evaluateTreatmentStarted(
      treatment.product,
      treatment.startedAt,
      settings,
      treatment.durationDays
    ),
    settings,
    treatment.notify
  );
}

/**
 * R2 (end) — the treatment came off: close the "end / remove treatment"
 * reminder if it's still open (it just happened, that's the whole point), and
 * schedule the varroa recount that proves the treatment actually worked.
 * R7 books the day the honey is clear again, when the product has a
 * withdrawal period recorded.
 */
export async function applyTreatmentEnded(treatment: Treatment): Promise<void> {
  const hive = await hivesRepo.getById(treatment.hiveId);
  if (!hive || !treatment.endedAt) return;
  const settings = await settingsForHive(hive);
  const endTask = await tasksRepo.getOpenBySource(hive.id, ruleSource('R2_END'));
  if (endTask) await setTaskDone(endTask, true);
  await materializeDrafts(
    hive,
    // R7 rides along when the treatment carries a withdrawal period.
    evaluateTreatmentEnded(treatment.endedAt, settings, treatment.withdrawalDays),
    settings,
    // The bell set on the treatment governs the reminders it books — R7 is
    // created here, long after the form that asked the question.
    treatment.notify
  );
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
 * Delete a hive, and everything that would otherwise outlive it on screen.
 *
 * The hive row is soft-deleted (§6 `archived_at`), so its inspections,
 * queens, treatments, equipment and photos all stay in the database for
 * export and backup — but its OPEN tasks are deleted with it and their
 * reminders cancelled. Without that, Today would go on asking you to recheck
 * a colony that no longer appears anywhere, and a notification would fire
 * days later for a hive you deleted (`tasksRepo.listOpen` joins the hive but
 * does not filter on it — deliberately, so history keeps its labels).
 *
 * Completed tasks are left alone: they are the record of work you actually
 * did, and Task history still shows the hive's label.
 */
export async function deleteHive(hiveId: string): Promise<void> {
  const open = await tasksRepo.listOpenByHive(hiveId);
  for (const task of open) {
    await tasksRepo.softDelete(task.id);
    await cancelTaskNotification(task.id);
  }
  await hivesRepo.softDelete(hiveId);
}

/**
 * Delete an apiary and every hive standing in it.
 *
 * The cascade is the point (see `apiariesRepo.softDelete`): you are deleting
 * a place, and the hives are in it. Each hive goes through `deleteHive`, so
 * their tasks and reminders are cleaned up the same way. The caller must
 * have shown the hive count first — this function does not ask.
 */
export async function deleteApiary(apiaryId: string): Promise<void> {
  const hiveIds = await hivesRepo.activeIdsByApiary(apiaryId);
  for (const hiveId of hiveIds) await deleteHive(hiveId);
  for (const task of await tasksRepo.listOpenByApiary(apiaryId)) {
    await tasksRepo.softDelete(task.id);
    await cancelTaskNotification(task.id);
  }
  await apiariesRepo.softDelete(apiaryId);
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
