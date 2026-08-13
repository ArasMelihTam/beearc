import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '../client';
import { inspectionPhotos } from '../schema';
import { newId } from '../util';

export type InspectionPhoto = typeof inspectionPhotos.$inferSelect;

/**
 * Photos attached to inspections (M6).
 *
 * `file_path` holds a bare file name, never an absolute path — see the long
 * comment in src/photos/photoStore.ts for why. This repo only ever touches
 * the database; deleting the file itself is the photo store's job, and for
 * removed photos it is left to the startup sweep.
 */
export const inspectionPhotosRepo = {
  /** Oldest first — the order they were taken at the hive. */
  async listByInspection(inspectionId: string): Promise<InspectionPhoto[]> {
    return db
      .select()
      .from(inspectionPhotos)
      .where(eq(inspectionPhotos.inspectionId, inspectionId))
      .orderBy(asc(inspectionPhotos.createdAt));
  },

  async fileNamesByInspection(inspectionId: string): Promise<string[]> {
    const rows = await this.listByInspection(inspectionId);
    return rows.map((row) => row.filePath);
  },

  /**
   * How many photos each of several inspections has, in one query — the hive
   * timeline needs a count per card and must not run a query per row.
   */
  async countsByInspections(inspectionIds: string[]): Promise<Record<string, number>> {
    if (inspectionIds.length === 0) return {};
    const rows = await db
      .select({ inspectionId: inspectionPhotos.inspectionId })
      .from(inspectionPhotos)
      .where(inArray(inspectionPhotos.inspectionId, inspectionIds));
    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.inspectionId] = (counts[row.inspectionId] ?? 0) + 1;
    return counts;
  },

  /** Every file name the database still refers to — the keep-list for the sweep. */
  async allFileNames(): Promise<string[]> {
    const rows = await db.select({ filePath: inspectionPhotos.filePath }).from(inspectionPhotos);
    return rows.map((row) => row.filePath);
  },

  /**
   * Make the stored photos for one inspection match `fileNames` exactly.
   *
   * Called when an inspection is saved. Written as a diff rather than
   * delete-all-then-insert so that editing an inspection to fix a typo does
   * not churn every photo row it already had.
   */
  async setForInspection(inspectionId: string, fileNames: string[]): Promise<void> {
    const existing = await db
      .select()
      .from(inspectionPhotos)
      .where(eq(inspectionPhotos.inspectionId, inspectionId));

    const wanted = new Set(fileNames);
    const removed = existing.filter((row) => !wanted.has(row.filePath));
    if (removed.length > 0) {
      await db.delete(inspectionPhotos).where(
        inArray(
          inspectionPhotos.id,
          removed.map((row) => row.id)
        )
      );
    }

    const held = new Set(existing.map((row) => row.filePath));
    const added = fileNames.filter((name) => !held.has(name));
    if (added.length > 0) {
      const base = Date.now();
      await db.insert(inspectionPhotos).values(
        added.map((filePath, index) => ({
          id: newId(),
          inspectionId,
          filePath,
          // One millisecond apart so the order they were taken in survives a
          // reload; saving three photos inside the same millisecond would
          // otherwise come back in whatever order SQLite felt like.
          createdAt: new Date(base + index).toISOString(),
        }))
      );
    }
  },

  /** Photo rows for one inspection, dropped outright. */
  async deleteByInspection(inspectionId: string): Promise<void> {
    await db.delete(inspectionPhotos).where(eq(inspectionPhotos.inspectionId, inspectionId));
  },
};
