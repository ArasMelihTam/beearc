import { and, asc, desc, eq, gte, isNotNull, isNull, like } from 'drizzle-orm';
import { db } from '../client';
import { apiaries, hives, tasks } from '../schema';
import { newId, nowIso } from '../util';

export type Task = typeof tasks.$inferSelect;

/** A task plus the names of whatever it's linked to — for the Today list. */
export interface TaskWithRefs extends Task {
  hiveLabel: string | null;
  apiaryName: string | null;
}

export interface TaskInput {
  title: string;
  details?: string | null;
  dueAt: string;
  hiveId?: string | null;
  apiaryId?: string | null;
  /** 'manual' or 'rule:<id>' (§6). Screens never pass rule sources themselves. */
  source?: string;
  /** false = no notification on the due date (M6d). Defaults to true. */
  notify?: boolean;
}

/** What editing may change. Rule tasks: the UI locks title + links (M4b). */
export interface TaskUpdateInput {
  title: string;
  details?: string | null;
  dueAt: string;
  hiveId?: string | null;
  apiaryId?: string | null;
  /** M6d — the bell. Editable on rule tasks too; it changes no rule logic. */
  notify?: boolean;
}

const withRefs = {
  task: tasks,
  hiveLabel: hives.label,
  apiaryName: apiaries.name,
};

const flatten = (rows: { task: Task; hiveLabel: string | null; apiaryName: string | null }[]) =>
  rows.map((r) => ({ ...r.task, hiveLabel: r.hiveLabel, apiaryName: r.apiaryName }));

export const tasksRepo = {
  /** All open (not done) tasks, soonest first — the Today screen's backbone. */
  async listOpen(): Promise<TaskWithRefs[]> {
    const rows = await db
      .select(withRefs)
      .from(tasks)
      .leftJoin(hives, eq(tasks.hiveId, hives.id))
      .leftJoin(apiaries, eq(tasks.apiaryId, apiaries.id))
      .where(and(isNull(tasks.doneAt), isNull(tasks.deletedAt)))
      .orderBy(asc(tasks.dueAt));
    return flatten(rows);
  },

  /** Tasks completed since `sinceIso` (used for the "Done today" section). */
  async listDoneSince(sinceIso: string): Promise<TaskWithRefs[]> {
    const rows = await db
      .select(withRefs)
      .from(tasks)
      .leftJoin(hives, eq(tasks.hiveId, hives.id))
      .leftJoin(apiaries, eq(tasks.apiaryId, apiaries.id))
      .where(
        and(isNotNull(tasks.doneAt), gte(tasks.doneAt, sinceIso), isNull(tasks.deletedAt))
      )
      .orderBy(desc(tasks.doneAt));
    return flatten(rows);
  },

  /** Everything ever completed (and not deleted), newest first — History. */
  async listHistory(limit = 200): Promise<TaskWithRefs[]> {
    const rows = await db
      .select(withRefs)
      .from(tasks)
      .leftJoin(hives, eq(tasks.hiveId, hives.id))
      .leftJoin(apiaries, eq(tasks.apiaryId, apiaries.id))
      .where(and(isNotNull(tasks.doneAt), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.doneAt))
      .limit(limit);
    return flatten(rows);
  },

  async getById(id: string): Promise<Task | null> {
    const rows = await db.select().from(tasks).where(eq(tasks.id, id));
    return rows[0] ?? null;
  },

  async create(input: TaskInput): Promise<Task> {
    const row: Task = {
      id: newId(),
      hiveId: input.hiveId ?? null,
      apiaryId: input.apiaryId ?? null,
      title: input.title.trim(),
      details: input.details?.trim() || null,
      dueAt: input.dueAt,
      doneAt: null,
      deletedAt: null,
      notify: input.notify ?? true,
      source: input.source ?? 'manual',
      createdAt: nowIso(),
    };
    await db.insert(tasks).values(row);
    return row;
  },

  async update(id: string, input: TaskUpdateInput): Promise<void> {
    await db
      .update(tasks)
      .set({
        title: input.title.trim(),
        details: input.details?.trim() || null,
        dueAt: input.dueAt,
        hiveId: input.hiveId ?? null,
        apiaryId: input.apiaryId ?? null,
        notify: input.notify ?? true,
      })
      .where(eq(tasks.id, id));
  },

  /**
   * A hive's still-open tasks. Used when the hive itself is deleted: they
   * have to go with it, or Today keeps nagging about a hive that is no
   * longer in any list (`listOpen` joins the hive but doesn't filter on it).
   */
  async listOpenByHive(hiveId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(and(eq(tasks.hiveId, hiveId), isNull(tasks.doneAt), isNull(tasks.deletedAt)));
  },

  /** Open tasks pinned to the apiary itself rather than to one of its hives. */
  async listOpenByApiary(apiaryId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(and(eq(tasks.apiaryId, apiaryId), isNull(tasks.doneAt), isNull(tasks.deletedAt)));
  },

  /** Soft delete (M4b) — hidden everywhere, kept forever, like §6 archives. */
  async softDelete(id: string): Promise<void> {
    await db.update(tasks).set({ deletedAt: nowIso() }).where(eq(tasks.id, id));
  },

  /** Check-off and un-check-off. Status recompute happens in logic/status.ts. */
  async setDone(id: string, done: boolean): Promise<void> {
    await db
      .update(tasks)
      .set({ doneAt: done ? nowIso() : null })
      .where(eq(tasks.id, id));
  },

  /**
   * Sources ('rule:R3', …) of a hive's open rule tasks — the exact input
   * deriveHiveStatus needs. Manual tasks are excluded by the LIKE filter.
   */
  async listOpenRuleSourcesByHive(hiveId: string): Promise<string[]> {
    const rows = await db
      .select({ source: tasks.source })
      .from(tasks)
      .where(
        and(
          eq(tasks.hiveId, hiveId),
          isNull(tasks.doneAt),
          isNull(tasks.deletedAt),
          like(tasks.source, 'rule:%')
        )
      );
    return rows.map((r) => r.source);
  },

  /**
   * The hive's open task from one rule, if it has one. M5a uses it to close
   * "End / remove treatment" automatically when the treatment is ended in the
   * app — the reminder has served its purpose, so it shouldn't need a tap.
   */
  async getOpenBySource(hiveId: string, source: string): Promise<Task | null> {
    const rows = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.hiveId, hiveId),
          eq(tasks.source, source),
          isNull(tasks.doneAt),
          isNull(tasks.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  },

  /**
   * Duplicate guard: is there already an open task from this rule for this
   * hive? Logging two bad inspections in a row must not create two identical
   * "recheck queen" tasks.
   */
  async hasOpenBySource(hiveId: string, source: string): Promise<boolean> {
    return (await this.getOpenBySource(hiveId, source)) !== null;
  },
};
