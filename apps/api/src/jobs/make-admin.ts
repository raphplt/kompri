// Grants the administrator role: node --import tsx src/jobs/make-admin.ts <email>
import { createDatabase } from '@kompri/db';
import { emailSchema } from '@kompri/shared';
import { loadEnvironment } from '@kompri/shared/load-env';

loadEnvironment();
const email = emailSchema.parse(process.argv[2]);
const db = createDatabase();
try {
  const updated = await db.user.updateMany({
    where: { email },
    data: { role: 'ADMIN' },
  });
  if (!updated.count) {
    console.error(`No account uses ${email}.`);
    process.exitCode = 1;
  } else console.log(`${email} is now an administrator.`);
} finally {
  await db.$disconnect();
}
