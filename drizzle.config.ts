import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit config: reads src/db/schema.ts and writes SQL migration files
 * to /drizzle. Run `npm run db:generate` after every schema change.
 * `driver: 'expo'` makes it emit a migrations.js bundle the app can import.
 */
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
