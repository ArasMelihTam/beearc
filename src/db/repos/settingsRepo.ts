import { eq } from 'drizzle-orm';
import { db } from '../client';
import { settings } from '../schema';

/**
 * Repository for the key/value settings table.
 *
 * New concept — repository pattern: screens never talk to the database
 * directly; they call small, named functions like these. When a sync engine
 * arrives (post-v1), it hooks in here — one place, not fifty screens.
 */
export const settingsRepo = {
  async get(key: string): Promise<string | null> {
    const rows = await db.select().from(settings).where(eq(settings.key, key));
    return rows[0]?.value ?? null;
  },

  /** Insert or overwrite ("upsert") a single setting. */
  async set(key: string, value: string): Promise<void> {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  },
};

/** Well-known setting keys — use these constants, never raw strings. */
export const SETTING_KEYS = {
  themeMode: 'theme_mode',
  language: 'language',
  /** JSON array of InspectionFactor — the factor picker remembers your last choice. */
  inspectionFactors: 'inspection_factors',
  /** JSON partial of RuleSettings — user overrides merged over the defaults. */
  ruleSettings: 'rule_settings',
  /** '1' once the one-time swipe-gesture hint on Today was dismissed. */
  swipeHintSeen: 'swipe_hint_seen',
  /** JSON CustomProduct[] — the "Other" treatment names you've used before. */
  customTreatmentProducts: 'custom_treatment_products',
  /** '1' once the one-time explanation of the notification bell was shown. */
  notifyHintSeen: 'notify_hint_seen',
} as const;
