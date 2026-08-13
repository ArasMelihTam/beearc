import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { newId } from '@/src/db/util';
import { COMPRESSION_LADDER, isWithinBudget, nextCompression, resizeTarget } from '@/src/logic/photos';

/**
 * Where inspection photos live on the phone, and how they get there (M6).
 *
 * The impure half of the photo feature — the arithmetic it uses is in
 * src/logic/photos.ts, where it can be unit tested.
 */

const DIR_NAME = 'inspection-photos';

/**
 * WHY THE DATABASE STORES ONLY A FILE NAME, NEVER A FULL PATH.
 *
 * On iOS the app's documents directory sits inside a container whose UUID
 * changes when the app is reinstalled or updated:
 *
 *   .../Application/9F3C…/Documents/inspection-photos/abc.jpg   (today)
 *   .../Application/1B77…/Documents/inspection-photos/abc.jpg   (after an update)
 *
 * Saving the absolute URI is the classic way to end up with a season of
 * photos that all silently break on a Tuesday. `inspection_photos.file_path`
 * therefore holds `abc.jpg` and nothing else; the directory is resolved
 * fresh, here, every time a photo is read.
 */
function photoDirectory(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Stored file name → a URI an <Image> can actually load. */
export function photoUri(fileName: string): string {
  return new File(photoDirectory(), fileName).uri;
}

/** File size in bytes, or 0 if the file has gone missing. */
function sizeOf(uri: string): number {
  try {
    const file = new File(uri);
    return file.exists ? file.size : 0;
  } catch {
    return 0;
  }
}

function discard(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A leftover file in the OS cache directory is the system's to clean up.
  }
}

/**
 * Resize, compress and file away one picked photo. Returns the stored file
 * name, which is what goes in the database.
 *
 * The photo the picker hands us lives in the cache directory, which the OS
 * may empty whenever it likes — so the last step moves it somewhere
 * permanent. Everything here is local: no upload, no network, works in
 * airplane mode.
 */
export async function importPhoto(source: {
  uri: string;
  width: number;
  height: number;
}): Promise<string> {
  const context = ImageManipulator.manipulate(source.uri);

  const target = resizeTarget(source.width, source.height);
  if (target) context.resize(target);

  const rendered = await context.renderAsync();

  let quality: number = COMPRESSION_LADDER[0];
  let saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });

  // Walk down the quality ladder until it fits — see COMPRESSION_LADDER for
  // why a photo of capped brood is the case that needs this.
  while (!isWithinBudget(sizeOf(saved.uri))) {
    const next = nextCompression(quality);
    if (next === null) break; // Bottom rung: keep it slightly big rather than unreadable.
    const previous = saved.uri;
    saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: next });
    quality = next;
    discard(previous);
  }

  const fileName = `${newId()}.jpg`;
  new File(saved.uri).move(new File(photoDirectory(), fileName));
  return fileName;
}

/** Remove one stored photo. Missing files are not an error — the goal is absence. */
export function deletePhoto(fileName: string): void {
  try {
    const file = new File(photoDirectory(), fileName);
    if (file.exists) file.delete();
  } catch {
    // Losing the file but keeping the row would show a broken thumbnail;
    // the orphan sweep below catches the reverse, which is what matters.
  }
}

/**
 * Delete stored photos that no inspection refers to, and report how many
 * bytes that freed.
 *
 * Photos are written to permanent storage the moment they are taken, before
 * the inspection they belong to has been saved — that is what makes them
 * survive the app being killed mid-entry, standing in a field. The cost is
 * that abandoning an entry, or removing a photo and then backing out without
 * saving, leaves a file with no row. This runs once at startup, when nothing
 * is half-entered, so anything unreferenced is genuinely rubbish.
 */
export function sweepOrphanPhotos(keep: ReadonlySet<string>): { files: number; bytes: number } {
  const swept = { files: 0, bytes: 0 };
  try {
    for (const entry of photoDirectory().list()) {
      if (!(entry instanceof File)) continue;
      if (keep.has(entry.name)) continue;
      const bytes = sizeOf(entry.uri);
      entry.delete();
      swept.files += 1;
      swept.bytes += bytes;
    }
  } catch {
    // Never let housekeeping stop the app from opening.
  }
  return swept;
}

/** Total bytes of stored photos — so "app storage stays small" is checkable. */
export function totalPhotoBytes(): number {
  try {
    return photoDirectory()
      .list()
      .reduce((sum, entry) => (entry instanceof File ? sum + sizeOf(entry.uri) : sum), 0);
  } catch {
    return 0;
  }
}
