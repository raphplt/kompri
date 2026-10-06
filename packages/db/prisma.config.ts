import { defineConfig } from 'prisma/config';
import {
  loadEnvironment,
  parseEnvironment,
  databaseEnvSchema,
} from '@kompri/shared/env';
loadEnvironment();
// Generation runs before the root prepare hook on a fresh clone.
// Only migration commands require a database URL at configuration time.
const databaseUrl = process.argv.includes('generate')
  ? undefined
  : parseEnvironment(databaseEnvSchema, process.env).DATABASE_URL;
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx src/seed.ts' },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
