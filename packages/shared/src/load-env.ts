import { config } from 'dotenv';

/**
 * Loads the repository .env file for Node processes (API, scripts, Next config).
 * Kept out of env.ts: bundlers would otherwise copy .env into the web build.
 */
export function loadEnvironment() {
  config({ path: new URL('../../../.env', import.meta.url), quiet: true });
}
