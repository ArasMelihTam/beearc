import { count } from 'drizzle-orm';
import { db } from './client';
import { apiaries } from './schema';
import { apiariesRepo } from './repos/apiariesRepo';
import { hivesRepo } from './repos/hivesRepo';

/**
 * Dev-only sample data so we can test screens without typing on the phone.
 * Refuses to run if any apiary exists — it will never touch real data.
 * Triggered from More → "Load sample data" (visible only in dev builds).
 */
export async function seedSampleData(): Promise<boolean> {
  const [row] = await db.select({ n: count() }).from(apiaries);
  if ((row?.n ?? 0) > 0) return false;

  const apiary = await apiariesRepo.create({
    name: 'Deneme Arılığı',
    latitude: 39.9255,
    longitude: 32.8663,
    notes: 'Sample apiary created by the dev seed.',
  });
  await hivesRepo.create(apiary.id, { label: 'K-01', hiveType: 'langstroth' });
  await hivesRepo.create(apiary.id, { label: 'K-02', hiveType: 'langstroth', notes: 'Yeni oğul' });
  await hivesRepo.create(apiary.id, { label: 'K-03', hiveType: 'traditional' });
  return true;
}
