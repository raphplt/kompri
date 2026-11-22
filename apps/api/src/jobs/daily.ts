// Daily maintenance: node --import tsx src/jobs/daily.ts (schedule it once a day).
import { createDatabase } from '@kompri/db';
import { apiEnvSchema, parseEnvironment } from '@kompri/shared/env';
import { loadEnvironment } from '@kompri/shared/load-env';
import { runDailyTasks } from '../daily.ts';
import { createMailer } from '../mailer.ts';

loadEnvironment();
const env = parseEnvironment(apiEnvSchema, process.env);
const db = createDatabase();
try {
  const report = await runDailyTasks({
    db,
    mailer: createMailer(env),
    now: new Date(),
    webUrl: env.WEB_URL,
    reminderDays: env.REMINDER_DAYS,
    inactiveAccountDays: env.INACTIVE_ACCOUNT_DAYS,
  });
  console.info(JSON.stringify({ level: 'info', msg: 'daily', ...report }));
} finally {
  await db.$disconnect();
}
