import { apiEnvSchema, parseEnvironment } from '@kompri/shared/env';
import { loadEnvironment } from '@kompri/shared/load-env';
import { createApi, createExaminerFromEnvironment } from './app.ts';

loadEnvironment();
const env = parseEnvironment(apiEnvSchema, process.env);
// Validate every configured usage at startup; no provider call is made here.
const examiner = createExaminerFromEnvironment(process.env);
const app = await createApi({ examiner, settings: env });
await app.listen(env.API_PORT, env.API_HOST);
console.log(`Kompri API: http://${env.API_HOST}:${env.API_PORT}`);
