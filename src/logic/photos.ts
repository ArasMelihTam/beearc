/**
 * Photo sizing arithmetic (M6).
 *
 * Master prompt §4: "Compress to ~200 KB max, longest side ~1280 px."
 * This file is the pure half — no files, no native calls — so the numbers
 * that decide how much of the phone a season of beekeeping costs are unit
 * tested. The file and camera work lives in src/photos/photoStore.ts.
 */

/** Longest side of a stored photo, in pixels. */
export const MAX_EDGE = 1280;

/** The size we try to land under, in bytes. */
export const TARGET_BYTES = 200 * 1024;

/**
 * JPEG quality steps, tried in order until the file fits the budget.
 *
 * 0.7 is the everyday case — a 1280 px frame photo lands around 150 KB. The
 * lower rungs exist for the pictures beekeepers actually take: a full frame
 * of capped brood is thousands of tiny high-contrast cells, which is the
 * worst case JPEG has. Stopping at 0.35 is deliberate — past that the comb
 * texture smears, and a photo you cannot read the brood pattern from is not
 * worth storing at any size.
 */
export const COMPRESSION_LADDER = [0.7, 0.5, 0.35] as const;

/**
 * The dimensions to resize to, or null when the photo is already small
 * enough to store untouched. Aspect ratio is always preserved.
 */
export function resizeTarget(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE
): { width: number; height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;

  const longest = Math.max(width, height);
  if (longest <= maxEdge) return null;

  const scale = maxEdge / longest;
  return {
    // A panorama can round its short side to zero, which no image library
    // accepts — one pixel is the floor.
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** The next quality to try, or null once the ladder is exhausted. */
export function nextCompression(current: number): number | null {
  const ladder: readonly number[] = COMPRESSION_LADDER;
  const index = ladder.indexOf(current);
  if (index === -1) return null;
  return ladder[index + 1] ?? null;
}

/** Is this file small enough to keep? */
export function isWithinBudget(bytes: number, target: number = TARGET_BYTES): boolean {
  return bytes <= target;
}
