import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { countConsumedOrals, createDatabase, deleteUserData } from './index.ts';
const db = createDatabase();
afterAll(async () => {
  await db.$disconnect();
});
it('counts a period once per oral and cascades deletion of all personal rows', async () => {
  const user = await db.user.create({
    data: { email: `test-${randomUUID()}@example.invalid` },
  });
  try {
    const attempt = await db.attempt.create({
      data: {
        userId: user.id,
        challengeId: 'add-without-ai',
        submittedWork: 'private code',
        challengeSnapshot: {},
      },
    });
    const session = await db.oralSession.create({
      data: {
        userId: user.id,
        attemptId: attempt.id,
        model: 'mock-v1',
        provider: 'mock',
        rubricSnapshot: {},
      },
    });
    await db.oralTurn.create({
      data: {
        sessionId: session.id,
        sequence: 0,
        speaker: 'LEARNER',
        text: 'private transcript',
      },
    });
    await db.validation.create({
      data: {
        userId: user.id,
        skillId: 'variables',
        oralSessionId: session.id,
        verdict: 'PASSED',
        criteria: [],
        validatedAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-07-01'),
      },
    });
    const usage = {
      userId: user.id,
      sessionId: session.id,
      consumedAt: new Date('2026-01-01'),
    };
    await db.oralUsage.create({ data: usage });
    await expect(db.oralUsage.create({ data: usage })).rejects.toThrow();
    expect(
      await countConsumedOrals(
        db,
        user.id,
        new Date('2026-01-01'),
        new Date('2026-02-01'),
      ),
    ).toBe(1);
    expect(
      await countConsumedOrals(
        db,
        user.id,
        new Date('2025-12-01'),
        new Date('2026-01-01'),
      ),
    ).toBe(0);
    await deleteUserData(db, user.id);
    expect(await db.attempt.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.oralSession.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.oralTurn.count({ where: { sessionId: session.id } })).toBe(
      0,
    );
    expect(await db.validation.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.oralUsage.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.skill.count()).toBeGreaterThanOrEqual(3);
  } finally {
    await db.user.deleteMany({ where: { id: user.id } });
  }
});
