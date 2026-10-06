import {
  apiEnvSchema,
  loadEnvironment,
  parseEnvironment,
} from '@kompri/shared/env';
import { createRegistry } from '@kompri/llm';
import { createApi } from './app.ts';
loadEnvironment();
const env = parseEnvironment(apiEnvSchema, process.env);
// Validate every configured usage at startup; no provider call is made here.
createRegistry(process.env);
const app = await createApi();
await app.listen(env.API_PORT, '127.0.0.1');
console.log(`Kompri API: http://localhost:${env.API_PORT}`);
