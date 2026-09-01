/**
 * Custom treatment products (M6c) — the "Other" products a beekeeper types
 * in once and then reuses, with the durations they carry.
 *
 * PURE: this module only transforms values. Persistence lives in the
 * settings table (`SETTING_KEYS.customTreatmentProducts`), and the name is
 * ALSO copied onto each treatment row — forgetting a name here must never
 * change what a past treatment says it was.
 */

export interface CustomProduct {
  /** As typed, trimmed. This is the display name and the identity. */
  name: string;
  /** Days it stays on the hive (R2's removal reminder). null = don't remind. */
  durationDays: number | null;
  /** Days after removal before honey is safe (R7). null = unknown, stay quiet. */
  withdrawalDays: number | null;
}

/**
 * The key two spellings of the same product share.
 *
 * Case- and whitespace-insensitive, and — the part that actually matters
 * here — it folds all four Turkish i-forms (I, İ, ı, i) together first.
 *
 * WHY: Turkish casing is not the invariant casing. `'APIVAR'` lowercased in
 * the Turkish locale is `'apıvar'` with a DOTLESS ı, so "APIVAR" and
 * "Apivar" would be remembered as two different products — and the beekeeper
 * would watch their own chip list sprout duplicates with no explanation.
 * Folding first, lowercasing after, makes the four forms one letter.
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // "Bee  Vital" is "Bee Vital"
    .replace(/[Iİıi]/g, 'i')
    .toLowerCase()
    .normalize('NFC');
}

/** A name that can actually be stored — non-empty once trimmed. */
export const isUsableName = (name: string): boolean => name.trim().length > 0;

/**
 * Read the remembered list out of its settings JSON. Anything malformed is
 * dropped rather than thrown: a corrupt setting must not stop a beekeeper
 * recording a treatment in a field.
 */
export function parseCustomProducts(raw: string | null | undefined): CustomProduct[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: CustomProduct[] = [];
  const seen = new Set<string>();
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.name !== 'string' || !isUsableName(e.name)) continue;
    const key = normalizeName(e.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: e.name.trim(),
      durationDays: typeof e.durationDays === 'number' ? e.durationDays : null,
      withdrawalDays: typeof e.withdrawalDays === 'number' ? e.withdrawalDays : null,
    });
  }
  return out;
}

export const serializeCustomProducts = (list: CustomProduct[]): string => JSON.stringify(list);

/** The remembered entry for a name, or null. */
export function findCustomProduct(list: CustomProduct[], name: string): CustomProduct | null {
  if (!isUsableName(name)) return null;
  const key = normalizeName(name);
  return list.find((p) => normalizeName(p.name) === key) ?? null;
}

/**
 * Remember a product, or update the numbers on one already remembered.
 *
 * Most-recently-used comes first, so the chip you reach for is the one under
 * your thumb. Re-saving keeps the spelling you just typed — if you decide it
 * is "Apiguard" rather than "apiguard", the list should follow you.
 */
export function rememberCustomProduct(
  list: CustomProduct[],
  entry: CustomProduct
): CustomProduct[] {
  if (!isUsableName(entry.name)) return list;
  const key = normalizeName(entry.name);
  const rest = list.filter((p) => normalizeName(p.name) !== key);
  return [{ ...entry, name: entry.name.trim() }, ...rest];
}

/** Forget a name. Past treatments keep theirs — they carry their own copy. */
export function forgetCustomProduct(list: CustomProduct[], name: string): CustomProduct[] {
  const key = normalizeName(name);
  return list.filter((p) => normalizeName(p.name) !== key);
}
