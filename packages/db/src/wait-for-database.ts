import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';
import {
  databaseEnvSchema,
  loadEnvironment,
  parseEnvironment,
} from '@kompri/shared/env';

loadEnvironment();
const { DATABASE_URL } = parseEnvironment(databaseEnvSchema, process.env);
const deadline = Date.now() + 30_000;
let ready = false;
while (!ready && Date.now() < deadline) {
  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 1000,
    query_timeout: 1000,
  });
  // A database restarting during initialization may close an idle socket.
  client.on('error', () => {});
  try {
    await client.connect();
    await client.query('SELECT 1');
    ready = true;
  } catch {
    // Connection errors can contain credentials; do not log their contents.
  } finally {
    await client.end().catch(() => {});
  }
  if (!ready) await delay(250);
}
if (!ready)
  throw new Error(
    'Database unavailable after 30 seconds; check DATABASE_URL and PostgreSQL.',
  );
