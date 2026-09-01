import {
  defaultRuleSettings,
  defaultSeasonWindows,
  deriveHiveStatus,
  dueInDays,
  evaluateEquipmentAdded,
  evaluateInspection,
  evaluateTreatmentEnded,
  evaluateTreatmentStarted,
  harvestSafeFrom,
  isMonthInWindow,
  isRuleEnabled,
  ruleGroupOf,
  ruleIdFromSource,
  ruleSource,
  varroaAboveThreshold,
  varroaPercent,
  type InspectionFacts,
} from '../rules';

/**
 * First Jest file in the project. Each `test()` calls a pure function with
 * hand-made inputs and `expect()`s the output — no phone, no database.
 * Run with `npm test`.
 */

// Northern-hemisphere defaults; most tests pin dates explicitly.
const S = defaultRuleSettings(39.9); // Ankara-ish latitude

const JUNE = '2026-06-15T10:00:00.000Z'; // mid-season
const SEPT = '2026-09-15T10:00:00.000Z'; // pre-winter
const JAN = '2026-01-15T10:00:00.000Z'; // off-season

const baseInspection: InspectionFacts = {
  inspectedAt: JUNE,
  queenSeen: true,
  eggsSeen: true,
  honeyStores: 4,
  varroaCount: null,
  varroaMethod: null,
};

// ---------------------------------------------------------------------------
// Season windows & hemisphere defaults
// ---------------------------------------------------------------------------

describe('season windows', () => {
  test('northern defaults: Mar–Oct season, Aug–Oct pre-winter', () => {
    expect(defaultSeasonWindows(39.9)).toEqual({
      season: { startMonth: 3, endMonth: 10 },
      preWinter: { startMonth: 8, endMonth: 10 },
    });
  });

  test('no latitude falls back to northern defaults', () => {
    expect(defaultSeasonWindows(null).season.startMonth).toBe(3);
    expect(defaultSeasonWindows(undefined).season.startMonth).toBe(3);
  });

  test('southern hemisphere shifts by six months (Sep–Apr wraps the year)', () => {
    const { season, preWinter } = defaultSeasonWindows(-33.9); // Sydney-ish
    expect(season).toEqual({ startMonth: 9, endMonth: 4 });
    expect(preWinter).toEqual({ startMonth: 2, endMonth: 4 });
  });

  test('isMonthInWindow handles plain and wrapping windows', () => {
    const plain = { startMonth: 3, endMonth: 10 };
    expect(isMonthInWindow(3, plain)).toBe(true);
    expect(isMonthInWindow(10, plain)).toBe(true);
    expect(isMonthInWindow(2, plain)).toBe(false);
    expect(isMonthInWindow(11, plain)).toBe(false);

    const wrapping = { startMonth: 9, endMonth: 4 }; // southern season
    expect(isMonthInWindow(12, wrapping)).toBe(true);
    expect(isMonthInWindow(2, wrapping)).toBe(true);
    expect(isMonthInWindow(6, wrapping)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Varroa math (R4)
// ---------------------------------------------------------------------------

describe('varroa thresholds', () => {
  test('% only defined for wash and roll (≈300-bee sample → count/3)', () => {
    expect(varroaPercent(9, 'alcohol_wash')).toBe(3);
    expect(varroaPercent(9, 'sugar_roll')).toBe(3);
    expect(varroaPercent(9, 'visual')).toBeNull();
    expect(varroaPercent(9, 'sticky_board')).toBeNull();
  });

  test('in season: wash over 3% triggers, exactly 3% does not', () => {
    expect(varroaAboveThreshold(10, 'alcohol_wash', JUNE, S)).toBe(true); // 3.33%
    expect(varroaAboveThreshold(9, 'alcohol_wash', JUNE, S)).toBe(false); // 3.00%
  });

  test('pre-winter is stricter: the same 2% count triggers in September only', () => {
    expect(varroaAboveThreshold(6, 'sugar_roll', JUNE, S)).toBe(false); // 2% vs 3%
    expect(varroaAboveThreshold(6, 'sugar_roll', SEPT, S)).toBe(true); // 2% vs 1%
  });

  test('sticky board uses mites/day, not %', () => {
    expect(varroaAboveThreshold(11, 'sticky_board', JUNE, S)).toBe(true);
    expect(varroaAboveThreshold(10, 'sticky_board', JUNE, S)).toBe(false);
  });

  test('visual counts never auto-trigger', () => {
    expect(varroaAboveThreshold(500, 'visual', JUNE, S)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Inspection triggers (R3, R4, R5)
// ---------------------------------------------------------------------------

describe('evaluateInspection', () => {
  test('healthy inspection creates no tasks', () => {
    expect(evaluateInspection(baseInspection, S)).toEqual([]);
  });

  test('R3: no queen AND no eggs → recheck task due +3 days', () => {
    const drafts = evaluateInspection(
      { ...baseInspection, queenSeen: false, eggsSeen: false },
      S
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0].ruleId).toBe('R3');
    expect(drafts[0].source).toBe('rule:R3');
    expect(drafts[0].dueAt).toBe(dueInDays(JUNE, 3));
  });

  test('R3 does NOT fire when eggs are seen without the queen (she is there)', () => {
    expect(
      evaluateInspection({ ...baseInspection, queenSeen: false, eggsSeen: true }, S)
    ).toEqual([]);
  });

  test('R4: high wash count → plan-treatment task', () => {
    const drafts = evaluateInspection(
      { ...baseInspection, varroaCount: 15, varroaMethod: 'alcohol_wash' },
      S
    );
    expect(drafts.map((d) => d.ruleId)).toEqual(['R4']);
  });

  test('R5: honey stores ≤ 1 → feeding task due +5 days; 2 does not fire', () => {
    const low = evaluateInspection({ ...baseInspection, honeyStores: 1 }, S);
    expect(low.map((d) => d.ruleId)).toEqual(['R5']);
    expect(low[0].dueAt).toBe(dueInDays(JUNE, 5));
    expect(evaluateInspection({ ...baseInspection, honeyStores: 2 }, S)).toEqual([]);
  });

  test('unrecorded values (null) never fire rules', () => {
    expect(evaluateInspection({ ...baseInspection, honeyStores: null }, S)).toEqual([]);
  });

  test('a truly bad inspection fires several rules at once', () => {
    const drafts = evaluateInspection(
      {
        inspectedAt: JUNE,
        queenSeen: false,
        eggsSeen: false,
        honeyStores: 0,
        varroaCount: 20,
        varroaMethod: 'alcohol_wash',
      },
      S
    );
    expect(drafts.map((d) => d.ruleId).sort()).toEqual(['R3', 'R4', 'R5']);
  });
});

// ---------------------------------------------------------------------------
// Equipment & treatment triggers (R1, R2)
// ---------------------------------------------------------------------------

describe('equipment and treatments', () => {
  test('R1: adding any super → fill-check task due +10 days', () => {
    expect(evaluateEquipmentAdded('deep_super', JUNE, S)[0].ruleId).toBe('R1');
    expect(evaluateEquipmentAdded('medium_super', JUNE, S)[0].dueAt).toBe(
      dueInDays(JUNE, 10)
    );
    expect(evaluateEquipmentAdded('feeder', JUNE, S)).toEqual([]);
    expect(evaluateEquipmentAdded('queen_excluder', JUNE, S)).toEqual([]);
  });

  test('R1 ignores the M5b items — a brood box is not checked for fill', () => {
    // R1 keys off the `_super` suffix, so the items added in M5b must stay
    // silent: nothing about a brood box or a pollen trap fills with honey.
    expect(evaluateEquipmentAdded('brood_box', JUNE, S)).toEqual([]);
    expect(evaluateEquipmentAdded('drone_frame', JUNE, S)).toEqual([]);
    expect(evaluateEquipmentAdded('pollen_trap', JUNE, S)).toEqual([]);
    expect(evaluateEquipmentAdded('winter_insulation', JUNE, S)).toEqual([]);
    expect(evaluateEquipmentAdded('frames', JUNE, S)).toEqual([]);
  });

  test('R2 start: end-task per product duration; "other" gets none', () => {
    expect(evaluateTreatmentStarted('formic_acid', JUNE, S)[0].dueAt).toBe(
      dueInDays(JUNE, 14)
    );
    expect(evaluateTreatmentStarted('oxalic_acid', JUNE, S)[0].dueAt).toBe(
      dueInDays(JUNE, 1)
    );
    expect(evaluateTreatmentStarted('amitraz', JUNE, S)[0].dueAt).toBe(dueInDays(JUNE, 42));
    expect(evaluateTreatmentStarted('other', JUNE, S)).toEqual([]);
  });

  test('R2 start: the two coumaphos forms are five weeks apart', () => {
    // Strips stay in for six weeks; the trickle is two doses a week apart.
    // Recording the wrong one would date the "take it off" reminder wrongly.
    expect(evaluateTreatmentStarted('coumaphos_strip', JUNE, S)[0].dueAt).toBe(
      dueInDays(JUNE, 42)
    );
    expect(evaluateTreatmentStarted('coumaphos_trickle', JUNE, S)[0].dueAt).toBe(
      dueInDays(JUNE, 7)
    );
  });

  test('R2 end: recount due +7 days after the treatment ends', () => {
    const drafts = evaluateTreatmentEnded(SEPT, S);
    expect(drafts.map((d) => d.ruleId)).toEqual(['R2_RECOUNT']);
    expect(drafts[0].dueAt).toBe(dueInDays(SEPT, 7));
  });

  // --- M6c: a duration recorded on the treatment beats the product table ---

  test('R2 start: a recorded duration overrides the product default', () => {
    // The box in your hand says four weeks; our table says six.
    expect(evaluateTreatmentStarted('amitraz', JUNE, S, 28)[0].dueAt).toBe(
      dueInDays(JUNE, 28)
    );
  });

  test('R2 start: a custom product gets a reminder ONLY via its own duration', () => {
    // This is the whole point of M6c — before it, every 'other' treatment
    // was silent, and custom products would have been the common case.
    expect(evaluateTreatmentStarted('other', JUNE, S)).toEqual([]);
    expect(evaluateTreatmentStarted('other', JUNE, S, 21)[0].dueAt).toBe(
      dueInDays(JUNE, 21)
    );
  });

  test('R2 start: duration 0 means "no removal reminder", not "remind today"', () => {
    expect(evaluateTreatmentStarted('other', JUNE, S, 0)[0].dueAt).toBe(dueInDays(JUNE, 0));
    // null is the "I don't know" case and stays silent.
    expect(evaluateTreatmentStarted('other', JUNE, S, null)).toEqual([]);
  });

  // --- M6c / R7: the honey withdrawal period ---

  test('R7: a withdrawal period books the day the honey is clear again', () => {
    const drafts = evaluateTreatmentEnded(SEPT, S, 42);
    expect(drafts.map((d) => d.ruleId)).toEqual(['R2_RECOUNT', 'R7']);
    expect(drafts[1].dueAt).toBe(dueInDays(SEPT, 42));
  });

  test('R7: stays silent when the withdrawal is zero or unknown', () => {
    // 0 = nothing to wait for (formic acid). null = we do not know, and an
    // app must never imply a harvest is safe on a guess.
    expect(evaluateTreatmentEnded(SEPT, S, 0).map((d) => d.ruleId)).toEqual(['R2_RECOUNT']);
    expect(evaluateTreatmentEnded(SEPT, S, null).map((d) => d.ruleId)).toEqual(['R2_RECOUNT']);
    expect(evaluateTreatmentEnded(SEPT, S).map((d) => d.ruleId)).toEqual(['R2_RECOUNT']);
  });

  test('R7 never colours the hive — a withdrawal period is not a sick colony', () => {
    expect(deriveHiveStatus(
      {
        openRuleSources: [ruleSource('R7')],
        lastInspectedAt: JUNE,
        hiveCreatedAt: JUNE,
        nowIso: JUNE,
      },
      S
    )).toBe('healthy');
  });

  test('harvestSafeFrom: a date only when there is genuinely something to wait for', () => {
    expect(harvestSafeFrom(SEPT, 42)).toBe(dueInDays(SEPT, 42));
    expect(harvestSafeFrom(SEPT, 0)).toBeNull();
    expect(harvestSafeFrom(SEPT, null)).toBeNull();
    expect(harvestSafeFrom(null, 42)).toBeNull(); // still on the hive
  });
});

// ---------------------------------------------------------------------------
// The assistant's switches (M6e)
// ---------------------------------------------------------------------------

describe('assistant switches', () => {
  test("R2's two tasks share one switch — they are one decision to a person", () => {
    expect(ruleGroupOf('R2_END')).toBe('R2');
    expect(ruleGroupOf('R2_RECOUNT')).toBe('R2');
    expect(ruleGroupOf('R3')).toBe('R3');
    expect(ruleGroupOf('R7')).toBe('R7');
  });

  test('everything is on by default — the assistant works out of the box', () => {
    for (const id of ['R1', 'R2_END', 'R2_RECOUNT', 'R3', 'R4', 'R5', 'R7'] as const) {
      expect(isRuleEnabled(S, id)).toBe(true);
    }
  });

  test('the master switch beats every individual one', () => {
    const off = { ...S, assistantEnabled: false };
    expect(isRuleEnabled(off, 'R3')).toBe(false);
    expect(isRuleEnabled(off, 'R7')).toBe(false);
  });

  test('turning one rule off leaves the others alone', () => {
    const s = { ...S, ruleEnabled: { ...S.ruleEnabled, R4: false } };
    expect(isRuleEnabled(s, 'R4')).toBe(false);
    expect(isRuleEnabled(s, 'R3')).toBe(true);
    expect(isRuleEnabled(s, 'R5')).toBe(true);
  });

  test('switching R2 off silences BOTH of its tasks', () => {
    const s = { ...S, ruleEnabled: { ...S.ruleEnabled, R2: false } };
    expect(isRuleEnabled(s, 'R2_END')).toBe(false);
    expect(isRuleEnabled(s, 'R2_RECOUNT')).toBe(false);
  });

  test('the master switch does not erase the per-rule choices', () => {
    // Turning the assistant back on must restore exactly the setup you had,
    // so the individual flags are preserved while it is off.
    const s = {
      ...S,
      assistantEnabled: false,
      ruleEnabled: { ...S.ruleEnabled, R4: false },
    };
    expect(isRuleEnabled({ ...s, assistantEnabled: true }, 'R4')).toBe(false);
    expect(isRuleEnabled({ ...s, assistantEnabled: true }, 'R3')).toBe(true);
  });

  test('an assistant that is off has no opinion about a hive either', () => {
    // R3 is urgent, but a silenced assistant must not colour anything.
    const facts = {
      openRuleSources: [ruleSource('R3')],
      lastInspectedAt: JUNE,
      hiveCreatedAt: JUNE,
      nowIso: JUNE,
    };
    expect(deriveHiveStatus(facts, S)).toBe('urgent');
    expect(deriveHiveStatus(facts, { ...S, assistantEnabled: false })).toBe('healthy');
  });
});

// ---------------------------------------------------------------------------
// Derived hive status (§7)
// ---------------------------------------------------------------------------

describe('deriveHiveStatus', () => {
  const facts = (over: Partial<Parameters<typeof deriveHiveStatus>[0]>) => ({
    openRuleSources: [],
    lastInspectedAt: JUNE,
    hiveCreatedAt: '2026-01-01T00:00:00.000Z',
    nowIso: JUNE,
    ...over,
  });

  test('no open conditions, recently inspected → healthy', () => {
    expect(deriveHiveStatus(facts({}), S)).toBe('healthy');
  });

  test('open R3 or R4 → urgent; open R5 → warning; urgent wins', () => {
    expect(deriveHiveStatus(facts({ openRuleSources: ['rule:R3'] }), S)).toBe('urgent');
    expect(deriveHiveStatus(facts({ openRuleSources: ['rule:R4'] }), S)).toBe('urgent');
    expect(deriveHiveStatus(facts({ openRuleSources: ['rule:R5'] }), S)).toBe('warning');
    expect(
      deriveHiveStatus(facts({ openRuleSources: ['rule:R5', 'rule:R3'] }), S)
    ).toBe('urgent');
  });

  test('reminder tasks (R1/R2) and manual tasks never color the hive', () => {
    expect(
      deriveHiveStatus(
        facts({ openRuleSources: ['rule:R1', 'rule:R2_END', 'manual'] }),
        S
      )
    ).toBe('healthy');
  });

  test('completing the condition task clears it (no open sources → healthy)', () => {
    // "Completing the related task clears the condition" — derived state means
    // there is nothing to reset by hand; the source list simply shrinks.
    expect(deriveHiveStatus(facts({ openRuleSources: [] }), S)).toBe('healthy');
  });

  test('R6: >21 days without inspection in season → warning', () => {
    const may = '2026-05-01T10:00:00.000Z';
    expect(deriveHiveStatus(facts({ lastInspectedAt: may, nowIso: JUNE }), S)).toBe(
      'warning'
    );
  });

  test('R6 stays quiet off-season and within 21 days', () => {
    const nov = '2026-11-20T10:00:00.000Z';
    const jan = JAN;
    expect(deriveHiveStatus(facts({ lastInspectedAt: nov, nowIso: jan }), S)).toBe(
      'healthy'
    );
    const tenDaysBefore = '2026-06-05T10:00:00.000Z';
    expect(
      deriveHiveStatus(facts({ lastInspectedAt: tenDaysBefore, nowIso: JUNE }), S)
    ).toBe('healthy');
  });

  test('R6: never-inspected hive measures from its creation date', () => {
    expect(
      deriveHiveStatus(
        facts({ lastInspectedAt: null, hiveCreatedAt: '2026-05-01T00:00:00.000Z' }),
        S
      )
    ).toBe('warning');
    expect(
      deriveHiveStatus(
        facts({ lastInspectedAt: null, hiveCreatedAt: '2026-06-10T00:00:00.000Z' }),
        S
      )
    ).toBe('healthy');
  });

  test('R6 upgrades an R5 warning nothing further; urgent unaffected', () => {
    const may = '2026-05-01T10:00:00.000Z';
    expect(
      deriveHiveStatus(
        facts({ openRuleSources: ['rule:R5'], lastInspectedAt: may, nowIso: JUNE }),
        S
      )
    ).toBe('warning');
    expect(
      deriveHiveStatus(
        facts({ openRuleSources: ['rule:R3'], lastInspectedAt: may, nowIso: JUNE }),
        S
      )
    ).toBe('urgent');
  });
});

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

describe('sources and due dates', () => {
  test('ruleSource/ruleIdFromSource round-trip; junk → null', () => {
    expect(ruleIdFromSource(ruleSource('R3'))).toBe('R3');
    expect(ruleIdFromSource('manual')).toBeNull();
    expect(ruleIdFromSource('rule:R99')).toBeNull();
  });

  test('dueInDays lands at 09:00 local on the right day', () => {
    const due = new Date(dueInDays(JUNE, 3));
    const from = new Date(JUNE);
    expect(due.getHours()).toBe(9);
    expect(due.getMinutes()).toBe(0);
    // 3 days later ±1 calendar day depending on timezone of the runner
    const diffDays = (due.getTime() - from.getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThan(2);
    expect(diffDays).toBeLessThan(4);
  });
});
