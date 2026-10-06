import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client.ts';
import {
  databaseEnvSchema,
  loadEnvironment,
  parseEnvironment,
} from '@kompri/shared/env';
export { PrismaClient };
export function createDatabase() {
  loadEnvironment();
  const env = parseEnvironment(databaseEnvSchema, process.env);
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      max: 5,
    }),
    log: [],
  });
}
export async function deleteUserData(db: PrismaClient, userId: string) {
  // Foreign-key cascades remove all personal rows atomically.
  await db.user.delete({ where: { id: userId } });
}
export async function countConsumedOrals(
  db: PrismaClient,
  userId: string,
  from: Date,
  until: Date,
) {
  if (
    !Number.isFinite(from.getTime()) ||
    !Number.isFinite(until.getTime()) ||
    from >= until
  )
    throw new Error('Invalid quota period');
  return db.oralUsage.count({
    where: { userId, consumedAt: { gte: from, lt: until } },
  });
}
