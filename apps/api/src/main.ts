import { apiEnvSchema, parseEnvironment } from '@kompri/shared/env';
import { loadEnvironment } from '@kompri/shared/load-env';
import { createApi, createLlmFromEnvironment } from './app.ts';
import { createMailer } from './mailer.ts';
import { spendLogger } from './spend.ts';
import { createDatabase } from '@kompri/db';

loadEnvironment();
const env = parseEnvironment(apiEnvSchema, process.env);
// Validate every configured usage at startup; no provider call is made here.
const db = createDatabase();
const { examiner, tutor } = createLlmFromEnvironment(
  process.env,
  spendLogger(db),
);
if (process.env.NODE_ENV === 'production' && env.MAIL_TRANSPORT !== 'smtp')
  throw new Error('Production requires MAIL_TRANSPORT=smtp and SMTP_URL');
const mailer = createMailer(env);
const app = await createApi({ db, examiner, tutor, mailer, settings: env });
await app.listen(env.API_PORT, env.API_HOST);
console.log(`Kompri API: http://${env.API_HOST}:${env.API_PORT}`);
