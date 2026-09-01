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
export const RULE_TASK_IDS = ['R1', 'R2_END', 'R2_RECOUNT', 'R3', 'R4', 'R5', 'R7'] as const;
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
  // R7 is good news, not a chore: it lands on the day the honey is clear
  // again. Severity null — a withdrawal period is not a sick colony.
  R7: { severity: null, title: 'Withdrawal period over — honey safe to harvest' },
};

/**
 * What the beekeeper switches on and off (M6e). R2 books two tasks — end the
 * treatment, then recount — but they are one decision to a person, so they
 * share one switch. R6 is not here: it writes no task, only the hidden
 * status column, and it follows the master switch.
 */
export const RULE_GROUPS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R7'] as const;
export type RuleGroup = (typeof RULE_GROUPS)[number];

/** Which switch governs a rule task. 'R2_END' and 'R2_RECOUNT' → 'R2'. */
export function ruleGroupOf(id: RuleTaskId): RuleGroup {
  return (id.startsWith('R2') ? 'R2' : id) as RuleGroup;
}

/**
 * May this rule create a task right now? The master switch wins over the
 * individual ones, so turning the assistant off is one tap and needs no
 * unpicking of six others — and turning it back on restores exactly the
 * per-rule choices that were there before.
 */
export function isRuleEnabled(s: RuleSettings, id: RuleTaskId): boolean {
  if (!s.assistantEnabled) return false;
  return s.ruleEnabled[ruleGroupOf(id)] !== false;
}

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
  /** R7: days after removal before honey is safe to harvest. null = unknown. */
  treatmentWithdrawalDays: Record<TreatmentProduct, number | null>;
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
  /**
   * The master switch (M6e). Off = the assistant creates nothing and colours
   * nothing; the app becomes a pure record book. Existing tasks are left
   * alone — silencing the assistant must not delete work already booked.
   */
  assistantEnabled: boolean;
  /** Per-rule switches, all on by default. */
  ruleEnabled: Record<RuleGroup, boolean>;
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
    // How long each product normally stays on the hive (R2 uses this to date
    // the "end / remove treatment" reminder). The acids were confirmed by the
    // beekeeper at M4; the strips are 6-week products. Coumaphos comes in both
    // forms locally (confirmed 2026-08-12), hence two entries: the strips sit
    // in the hive for six weeks, the trickle is two doses a week apart.
    treatmentDurationDays: {
      formic_acid: 14,
      oxalic_acid: 1,
      thymol: 28,
      amitraz: 42,
      flumethrin: 42,
      tau_fluvalinate: 42,
      coumaphos_strip: 42,
      coumaphos_trickle: 7,
      other: null,
    },
    /**
     * R7 — days after a treatment is REMOVED before honey may be harvested.
     *
     * ⚠️ THESE ARE PROPOSED DEFAULTS, NOT VERIFIED FIGURES. Withdrawal
     * periods differ by product, formulation and country, and the label on
     * the box is the authority — not this table. They are editable in
     * Settings → Assistant for exactly that reason, and the beekeeper is
     * asked to confirm them (rule 7). 0 = no withdrawal period.
     *
     * `other` is null because an unknown product has an unknown withdrawal:
     * the form asks for it per treatment instead of inventing one.
     */
    treatmentWithdrawalDays: {
      formic_acid: 0, // organic, does not accumulate in honey
      oxalic_acid: 0, // organic, but supers should be off during application
      thymol: 28, // can taint honey with its smell for weeks
      amitraz: 14,
      flumethrin: 42,
      tau_fluvalinate: 42,
      coumaphos_strip: 42, // persistent in wax — the most cautious of the set
      coumaphos_trickle: 42,
      other: null,
    },
    superCheckDays: 10,
    queenRecheckDays: 3,
    varroaPlanDays: 2,
    feedingCheckDays: 5,
    postTreatmentRecountDays: 7,
    assistantEnabled: true,
    ruleEnabled: { R1: true, R2: true, R3: true, R4: true, R5: true, R7: true },
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
  s: RuleSettings,
  /**
   * The duration recorded on the treatment itself (M6c). It wins over the
   * product table: the beekeeper read the actual box, we read a default.
   * A custom ('other') product has no table entry, so this is the ONLY way
   * it ever gets a removal reminder.
   */
  overrideDays?: number | null
): RuleTaskDraft[] {
  const days = overrideDays ?? s.treatmentDurationDays[product];
  if (days == null) return [];
  return [draft('R2_END', dueInDays(startedAtIso, days))];
}

/**
 * Treatment ended — two follow-ups:
 *  - R2 recount: did it actually work?
 *  - R7: the day the honey is clear again, if the product has a withdrawal
 *    period. Skipped when it is 0 (nothing to wait for) or null (unknown —
 *    the app says nothing rather than guessing at a harvest being safe).
 */
export function evaluateTreatmentEnded(
  endedAtIso: string,
  s: RuleSettings,
  withdrawalDays?: number | null
): RuleTaskDraft[] {
  const drafts = [draft('R2_RECOUNT', dueInDays(endedAtIso, s.postTreatmentRecountDays))];
  if (withdrawalDays != null && withdrawalDays > 0) {
    drafts.push(draft('R7', dueInDays(endedAtIso, withdrawalDays)));
  }
  return drafts;
}

/**
 * When honey from this hive is safe again, or null if there is nothing to
 * wait for. Pure date arithmetic on the treatment's own recorded numbers —
 * the screens state this as a fact, they never compute a verdict from it.
 */
export function harvestSafeFrom(
  endedAtIso: string | null,
  withdrawalDays: number | null
): string | null {
  if (endedAtIso == null || withdrawalDays == null || withdrawalDays <= 0) return null;
  return dueInDays(endedAtIso, withdrawalDays);
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
  // Assistant off = no opinions at all, including the hidden status column.
  if (!s.assistantEnabled) return 'healthy';
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
