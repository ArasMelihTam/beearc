import { addDays } from 'date-fns';
// `import type` is erased at compile time — this pure module never actually
// loads drizzle/expo code, which is what lets Jest run it on plain Node.
import type {
  EquipmentItem,
  HiveStatus,
  TreatmentProduct,
  VarroaMethod,
} from '../db/schema';

/**
 * Beearc rules engine (master prompt §7) — PURE logic, no side effects.
 *
 * New concept — pure functions: every function here only computes outputs
 * from its inputs. Nothing reads the database, the clock, or the screen.
 * The impure wiring (creating real task rows, updating hive status) lives in
 * src/logic/status.ts. This split is what makes the rules unit-testable.
 *
 * The rules themselves are data: RULE_DEFS below is a table of
 * id → severity → task title. Adding a rule means adding a row + a trigger.
 */

// ---------------------------------------------------------------------------
// Rule identities
// ---------------------------------------------------------------------------

/**
 * R2 produces two different tasks (end the treatment, then recount varroa),
 * so it appears twice with distinct ids.
 */
export const RULE_TASK_IDS = ['R1', 'R2_END', 'R2_RECOUNT', 'R3', 'R4', 'R5'] as const;
export type RuleTaskId = (typeof RULE_TASK_IDS)[number];

export interface RuleDef {
  /**
   * How an OPEN task from this rule affects the hive's derived status.
   * null = pure reminder (R1/R2) — it never colors the hive.
   */
  severity: HiveStatus | null;
  /** Canonical English title stored in the DB (exports); UI translates via i18n. */
  title: string;
}

export const RULE_DEFS: Record<RuleTaskId, RuleDef> = {
  R1: { severity: null, title: 'Check super fill progress' },
  R2_END: { severity: null, title: 'End / remove treatment' },
  R2_RECOUNT: { severity: null, title: 'Post-treatment varroa recount' },
  R3: { severity: 'urgent', title: 'Recheck for queen/eggs' },
  R4: { severity: 'urgent', title: 'Plan varroa treatment' },
  R5: { severity: 'warning', title: 'Check feeding' },
};

/** tasks.source value for a rule task, e.g. "rule:R3" (master prompt §6). */
export const ruleSource = (id: RuleTaskId): string => `rule:${id}`;

/** Reverse of ruleSource — null for manual tasks or unknown sources. */
export function ruleIdFromSource(source: string): RuleTaskId | null {
  if (!source.startsWith('rule:')) return null;
  const id = source.slice('rule:'.length);
  return (RULE_TASK_IDS as readonly string[]).includes(id) ? (id as RuleTaskId) : null;
}

// ---------------------------------------------------------------------------
// Settings (user-editable; defaults confirmed by the domain expert 2026-07-07)
// ---------------------------------------------------------------------------

/** A month window, 1–12 inclusive. May wrap the new year (e.g. Sep→Apr). */
export interface SeasonWindow {
  startMonth: number;
  endMonth: number;
}

export interface RuleSettings {
  /** R4: alcohol wash / sugar roll infestation limit during the season (%). */
  varroaSeasonPct: number;
  /** R4: stricter limit while winter bees are being raised (%). */
  varroaPreWinterPct: number;
  /** R4: natural mite fall limit for sticky boards (mites per day). */
  stickyBoardPerDay: number;
  /** R6: warn when a hive has no inspection for this many days (in season). */
  inspectionOverdueDays: number;
  /** R6 only runs inside this window (bees are barely touched in winter). */
  season: SeasonWindow;
  /** Stricter varroa window (pre-winter = raising the bees that overwinter). */
  preWinter: SeasonWindow;
  /** R2: typical treatment length per product; null = unknown, no auto end-task. */
  treatmentDurationDays: Record<TreatmentProduct, number | null>;
  /** R1: days until "check super fill progress". */
  superCheckDays: number;
  /** R3: days until "recheck for queen/eggs". */
  queenRecheckDays: number;
  /** R4: days until "plan varroa treatment". */
  varroaPlanDays: number;
  /** R5: days until "check feeding". */
  feedingCheckDays: number;
  /** R2: days after treatment end until the varroa recount. */
  postTreatmentRecountDays: number;
}

/**
 * Global app, hemisphere-aware defaults (user decision 2026-07-07):
 * the apiary's latitude decides the season window. Southern hemisphere
 * shifts everything by six months. No latitude → northern defaults.
 * Everything remains editable in Settings — this is a smart default only.
 */
export function defaultSeasonWindows(latitude?: number | null): {
  season: SeasonWindow;
  preWinter: SeasonWindow;
} {
  const southern = latitude != null && latitude < 0;
  return southern
    ? { season: { startMonth: 9, endMonth: 4 }, preWinter: { startMonth: 2, endMonth: 4 } }
    : { season: { startMonth: 3, endMonth: 10 }, preWinter: { startMonth: 8, endMonth: 10 } };
}

export function defaultRuleSettings(latitude?: number | null): RuleSettings {
  return {
    varroaSeasonPct: 3,
    varroaPreWinterPct: 1,
    stickyBoardPerDay: 10,
    inspectionOverdueDays: 21,
    ...defaultSeasonWindows(latitude),
    treatmentDurationDays: {
      formic_acid: 14,
      oxalic_acid: 1,
      thymol: 28,
      amitraz: 42,
      other: null,
    },
    superCheckDays: 10,
    queenRecheckDays: 3,
    varroaPlanDays: 2,
    feedingCheckDays: 5,
    postTreatmentRecountDays: 7,
  };
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Is `month` (1–12) inside the window? Handles windows that wrap the year. */
export function isMonthInWindow(month: number, window: SeasonWindow): boolean {
  const { startMonth: s, endMonth: e } = window;
  return s <= e ? month >= s && month <= e : month >= s || month <= e;
}

/** Local month (1–12) of an ISO timestamp — seasons follow the wall calendar. */
export const monthOfIso = (iso: string): number => new Date(iso).getMonth() + 1;

/**
 * Due timestamp `days` after `fromIso`, at 09:00 local time — a humane hour
 * for a task notification, late enough to be awake, early enough to plan.
 */
export function dueInDays(fromIso: string, days: number): string {
  const d = addDays(new Date(fromIso), days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Varroa math (R4)
// ---------------------------------------------------------------------------

/**
 * Infestation % from a raw mite count. Wash/roll samples ≈300 bees, so
 * % = count / 3. Visual counts and sticky boards have no % interpretation
 * (sticky boards are judged in mites/day instead) → null.
 */
export function varroaPercent(count: number, method: VarroaMethod): number | null {
  if (method === 'alcohol_wash' || method === 'sugar_roll') return count / 3;
  return null;
}

/**
 * Does this count call for treatment? (user decision 2026-07-07)
 * - alcohol wash / sugar roll: % over the seasonal threshold
 *   (pre-winter is stricter — those are the bees that must survive to spring)
 * - sticky board: mites/day over its own threshold (count = mites in 24 h)
 * - visual: never auto-triggers — too rough to alarm anyone
 */
export function varroaAboveThreshold(
  count: number,
  method: VarroaMethod,
  atIso: string,
  s: RuleSettings
): boolean {
  if (method === 'sticky_board') return count > s.stickyBoardPerDay;
  const pct = varroaPercent(count, method);
  if (pct === null) return false;
  const limit = isMonthInWindow(monthOfIso(atIso), s.preWinter)
    ? s.varroaPreWinterPct
    : s.varroaSeasonPct;
  return pct > limit;
}

// ---------------------------------------------------------------------------
// Triggers — each returns the tasks a fresh event should create
// ---------------------------------------------------------------------------

export interface RuleTaskDraft {
  ruleId: RuleTaskId;
  source: string;
  title: string;
  dueAt: string;
}

const draft = (ruleId: RuleTaskId, dueAt: string): RuleTaskDraft => ({
  ruleId,
  source: ruleSource(ruleId),
  title: RULE_DEFS[ruleId].title,
  dueAt,
});

/** The slice of an inspection the rules actually read. */
export interface InspectionFacts {
  inspectedAt: string;
  queenSeen: boolean;
  eggsSeen: boolean;
  honeyStores: number | null;
  varroaCount: number | null;
  varroaMethod: VarroaMethod | null;
}

/** R3 + R4 + R5 — evaluated after every saved inspection. */
export function evaluateInspection(insp: InspectionFacts, s: RuleSettings): RuleTaskDraft[] {
  const out: RuleTaskDraft[] = [];
  // R3 — queenless signs: no queen AND no eggs seen.
  if (!insp.queenSeen && !insp.eggsSeen) {
    out.push(draft('R3', dueInDays(insp.inspectedAt, s.queenRecheckDays)));
  }
  // R4 — varroa over threshold.
  if (
    insp.varroaCount != null &&
    insp.varroaMethod != null &&
    varroaAboveThreshold(insp.varroaCount, insp.varroaMethod, insp.inspectedAt, s)
  ) {
    out.push(draft('R4', dueInDays(insp.inspectedAt, s.varroaPlanDays)));
  }
  // R5 — honey stores critically low (≤1 on the 0–5 scale).
  if (insp.honeyStores != null && insp.honeyStores <= 1) {
    out.push(draft('R5', dueInDays(insp.inspectedAt, s.feedingCheckDays)));
  }
  return out;
}

/** R1 — a super was added: check its fill progress. (UI wiring lands in M5.) */
export function evaluateEquipmentAdded(
  item: EquipmentItem,
  addedAtIso: string,
  s: RuleSettings
): RuleTaskDraft[] {
  if (!item.endsWith('_super')) return [];
  return [draft('R1', dueInDays(addedAtIso, s.superCheckDays))];
}

/**
 * R2 (start) — treatment started: remind to end/remove it after the product's
 * typical duration. Unknown products ('other') get no auto end-task.
 * (UI wiring lands in M5.)
 */
export function evaluateTreatmentStarted(
  product: TreatmentProduct,
  startedAtIso: string,
  s: RuleSettings
): RuleTaskDraft[] {
  const days = s.treatmentDurationDays[product];
  if (days == null) return [];
  return [draft('R2_END', dueInDays(startedAtIso, days))];
}

/** R2 (end) — treatment ended: recount varroa to confirm it worked. */
export function evaluateTreatmentEnded(endedAtIso: string, s: RuleSettings): RuleTaskDraft[] {
  return [draft('R2_RECOUNT', dueInDays(endedAtIso, s.postTreatmentRecountDays))];
}

// ---------------------------------------------------------------------------
// Derived hive status (§7) — the single source of the pin/list color
// ---------------------------------------------------------------------------

export interface HiveStatusFacts {
  /** `source` values of the hive's OPEN (not done) rule tasks. */
  openRuleSources: string[];
  /** Newest inspection timestamp, or null if never inspected. */
  lastInspectedAt: string | null;
  /** Fallback baseline for R6 when never inspected — the hive's creation. */
  hiveCreatedAt: string;
  nowIso: string;
}

/**
 * Status is DERIVED, never hand-set: urgent beats warning beats healthy.
 * - open R3/R4 task → urgent; open R5 task → warning (completing it clears it)
 * - R6: in season, no inspection for >inspectionOverdueDays → warning
 */
export function deriveHiveStatus(facts: HiveStatusFacts, s: RuleSettings): HiveStatus {
  let status: HiveStatus = 'healthy';
  for (const source of facts.openRuleSources) {
    const id = ruleIdFromSource(source);
    if (!id) continue;
    const severity = RULE_DEFS[id].severity;
    if (severity === 'urgent') return 'urgent'; // can't get worse — done
    if (severity === 'warning') status = 'warning';
  }
  // R6 — neglected in season.
  if (isMonthInWindow(monthOfIso(facts.nowIso), s.season)) {
    const baseline = facts.lastInspectedAt ?? facts.hiveCreatedAt;
    const ageDays =
      (new Date(facts.nowIso).getTime() - new Date(baseline).getTime()) / 86_400_000;
    // (urgent already returned above, so warning can only upgrade healthy)
    if (ageDays > s.inspectionOverdueDays) status = 'warning';
  }
  return status;
}
