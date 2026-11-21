import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '@kompri/db';
import {
  challengeDetailSchema,
  oralViewSchema,
  progressResponseSchema,
  skillDetailSchema,
  treeResponseSchema,
  z,
} from '@kompri/shared';
import { createExaminerMock } from '@kompri/examiner/testing';
import { createApi, developmentResponder } from './app.ts';
import { createClient, createMockAdapter } from '@kompri/llm';
import { skillStates } from './progress.ts';

const db = createDatabase();
let now = new Date('2030-01-01T10:00:00Z');
const advance = (seconds: number) => {
  now = new Date(now.getTime() + seconds * 1000);
};
let app: Awaited<ReturnType<typeof createApi>>;
let base: string;
const challengeId = 'js-basics-sans-ia';
const created: string[] = [];
let previousStatus: 'DRAFT' | 'PUBLISHED' = 'DRAFT';

async function call(
  path: string,
  init: { method?: string; token?: string; body?: unknown } = {},
) {
  const response = await fetch(`${base}${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: {
      ...(init.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: response.headers.get('content-type')?.includes('json')
      ? (JSON.parse(text) as unknown)
      : null,
    text,
  };
}

async function register(name = 'Alice') {
  const email = `test-${crypto.randomUUID()}@example.invalid`;
  const response = await call('/auth/register', {
    body: { email, password: 'correct horse battery', displayName: name },
  });
  expect(response.status).toBe(201);
  const body = z
    .object({ token: z.string(), user: z.object({ id: z.string() }) })
    .parse(response.body);
  created.push(body.user.id);
  return { email, token: body.token, id: body.user.id };
}

const long =
  'Je convertis explicitement le montant avec Number parce que la saisie est une chaîne, puis je compare strictement et j’arrondis seulement à l’affichage pour éviter les erreurs de virgule flottante.';

beforeAll(async () => {
  const skill = await db.skill.findUniqueOrThrow({
    where: { id: 'js-basics' },
  });
  previousStatus = skill.status;
  await db.skill.update({
    where: { id: 'js-basics' },
    data: { status: 'PUBLISHED' },
  });
  app = await createApi({
    db: createDatabase(),
    examiner: { provider: 'mock', client: createExaminerMock() },
    tutor: createClient({
      adapter: createMockAdapter(developmentResponder),
      usage: 'tutor',
      model: 'mock-v1',
      inputRate: 0,
      outputRate: 0,
      log: () => {},
    }),
    settings: {
      ORAL_LIMIT_PER_WINDOW: 2,
      ORAL_ANSWER_SECONDS: 60,
      TUTOR_LIMIT_PER_WINDOW: 2,
    },
    clock: () => now,
  });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: created } } });
  await db.skill.update({
    where: { id: 'js-basics' },
    data: { status: previousStatus },
  });
  await app?.close();
  await db.$disconnect();
});

describe('content', () => {
  it('checks the database and serves the tree, skills and challenges', async () => {
    expect((await call('/health')).body).toEqual({
      status: 'ok',
      database: 'up',
    });
    const tree = treeResponseSchema.parse((await call('/tree')).body);
    expect(tree.domains.map((d) => d.id)).toContain('javascript');
    expect(
      tree.skills.find((s) => s.id === 'git-basics')?.prerequisites,
    ).toEqual(['command-line']);
    expect(tree.skills.some((s) => s.id === 'variables')).toBe(false);
    expect((await call('/skills?admin=true')).status).toBe(400);
    const skill = skillDetailSchema.parse(
      (await call('/skills/js-basics')).body,
    );
    expect(skill.challenges).toHaveLength(4);
    expect((await call('/skills/absent')).status).toBe(404);
    expect((await call('/skills/js-basics/lessons/absent')).status).toBe(404);
    const challenge = await call(`/challenges/${challengeId}`);
    challengeDetailSchema.parse(challenge.body);
    expect(challenge.text).not.toContain('examinerNotes');
    expect(challenge.text).not.toContain('Points de compréhension attendus');
    const document = z
      .object({ paths: z.record(z.string(), z.unknown()) })
      .parse((await call('/openapi.json')).body);
    expect(Object.keys(document.paths)).toContain('/orals/{id}/answers');
  });
});

describe('accounts', () => {
  it('registers, logs in, rejects duplicates and locks after repeated failures', async () => {
    const user = await register();
    expect(
      (
        await call('/auth/register', {
          body: {
            email: user.email.toUpperCase(),
            password: 'another long password',
            displayName: 'Bob',
          },
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await call('/auth/register', {
          body: {
            email: 'x@example.invalid',
            password: 'short',
            displayName: 'X',
          },
        })
      ).status,
    ).toBe(400);
    expect((await call('/me')).status).toBe(401);
    expect((await call('/me', { token: user.token })).status).toBe(200);
    for (let i = 0; i < 5; i++)
      expect(
        (
          await call('/auth/login', {
            body: { email: user.email, password: 'wrong password!' },
          })
        ).status,
      ).toBe(401);
    expect(
      (
        await call('/auth/login', {
          body: { email: user.email, password: 'correct horse battery' },
        })
      ).status,
    ).toBe(429);
    advance(16 * 60);
    const login = await call('/auth/login', {
      body: { email: user.email, password: 'correct horse battery' },
    });
    expect(login.status).toBe(200);
    const token = z.object({ token: z.string() }).parse(login.body).token;
    expect((await call('/auth/logout', { method: 'POST', token })).status).toBe(
      204,
    );
    expect((await call('/me', { token })).status).toBe(401);
    const unknown = await call('/auth/login', {
      body: { email: 'nobody@example.invalid', password: 'whatever pass' },
    });
    expect(unknown.status).toBe(401);
    expect(unknown.text).not.toContain('nobody');
  });

  it('exports and deletes the account with every personal row', async () => {
    const user = await register();
    await call('/attempts', {
      token: user.token,
      body: { challengeId, work: 'private learner work' },
    });
    const exported = await call('/me/export', { token: user.token });
    expect(exported.text).toContain('private learner work');
    expect(
      (
        await call('/me', {
          method: 'DELETE',
          token: user.token,
          body: { password: 'wrong password!' },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await call('/me', {
          method: 'DELETE',
          token: user.token,
          body: { password: 'correct horse battery' },
        })
      ).status,
    ).toBe(204);
    expect(await db.user.count({ where: { id: user.id } })).toBe(0);
    expect(await db.attempt.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.authSession.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe('oral', () => {
  it('runs a timed oral, grades it and validates the skill', async () => {
    const user = await register();
    const other = await register('Mallory');
    const attempt = await call('/attempts', {
      token: user.token,
      body: { challengeId, work: 'const total = 8.5;' },
    });
    expect(attempt.status).toBe(201);
    const attemptId = z.object({ id: z.string() }).parse(attempt.body).id;
    expect(
      (await call(`/attempts/${attemptId}`, { token: other.token })).status,
    ).toBe(404);

    const started = await call(`/attempts/${attemptId}/oral`, {
      method: 'POST',
      token: user.token,
    });
    expect(started.status).toBe(201);
    let oral = oralViewSchema.parse(started.body);
    expect(oral.status).toBe('active');
    expect(oral.questionCount).toBe(3);
    expect(oral.deadline).toBe(new Date(now.getTime() + 60_000).toISOString());
    expect(
      (await call(`/orals/${oral.id}`, { token: other.token })).status,
    ).toBe(404);
    expect(
      (
        await call(`/attempts/${attemptId}/oral`, {
          method: 'POST',
          token: user.token,
        })
      ).status,
    ).toBe(409);

    advance(30);
    oral = oralViewSchema.parse(
      (
        await call(`/orals/${oral.id}/answers`, {
          token: user.token,
          body: { text: long },
        })
      ).body,
    );
    expect(oral.answeredCount).toBe(1);
    // A late answer is recorded as unanswered and the oral continues.
    advance(120);
    oral = oralViewSchema.parse(
      (
        await call(`/orals/${oral.id}/answers`, {
          token: user.token,
          body: { text: long },
        })
      ).body,
    );
    expect(oral.turns.at(-2)?.text).toContain('Aucune réponse');
    advance(10);
    oral = oralViewSchema.parse(
      (
        await call(`/orals/${oral.id}/answers`, {
          token: user.token,
          body: { text: 'Je ne sais pas.' },
        })
      ).body,
    );
    expect(oral.status).toBe('completed');
    expect(oral.result?.criteria).toHaveLength(4);
    // Mock signal: 3 + 0 (unanswered) + 0 (short) + 2 = 5/10, below 0.7.
    expect(oral.result?.score).toBe(5);
    expect(oral.result?.verdict).toBe('FAILED');
    expect(
      (
        await call(`/orals/${oral.id}/answers`, {
          token: user.token,
          body: { text: long },
        })
      ).status,
    ).toBe(409);

    const retry = await call('/attempts', {
      token: user.token,
      body: { challengeId, work: 'const total = 8.5; // v2' },
    });
    const retryId = z.object({ id: z.string() }).parse(retry.body).id;
    oral = oralViewSchema.parse(
      (
        await call(`/attempts/${retryId}/oral`, {
          method: 'POST',
          token: user.token,
        })
      ).body,
    );
    for (let i = 0; i < 3; i++) {
      advance(20);
      oral = oralViewSchema.parse(
        (
          await call(`/orals/${oral.id}/answers`, {
            token: user.token,
            body: { text: long },
          })
        ).body,
      );
    }
    expect(oral.result?.verdict).toBe('PASSED');
    expect(oral.result?.validationExpiresAt).toBe(
      new Date(now.getTime() + 180 * 86_400_000).toISOString(),
    );

    const progress = progressResponseSchema.parse(
      (await call('/me/progress', { token: user.token })).body,
    );
    expect(progress.skills.find((s) => s.skillId === 'js-basics')?.state).toBe(
      'validated',
    );
    expect(progress.quota).toEqual({ used: 2, limit: 2, windowHours: 24 });
    expect(progress.recentOrals).toHaveLength(2);

    const third = await call('/attempts', {
      token: user.token,
      body: { challengeId, work: 'v3' },
    });
    const thirdId = z.object({ id: z.string() }).parse(third.body).id;
    const refused = await call(`/attempts/${thirdId}/oral`, {
      method: 'POST',
      token: user.token,
    });
    expect(refused.status).toBe(429);
    expect(refused.body).toMatchObject({ code: 'quota_exceeded' });
  });

  it('abandons an oral and refuses a second oral in parallel', async () => {
    const user = await register();
    const ids = [];
    for (const work of ['first', 'second']) {
      const response = await call('/attempts', {
        token: user.token,
        body: { challengeId, work },
      });
      ids.push(z.object({ id: z.string() }).parse(response.body).id);
    }
    const first = oralViewSchema.parse(
      (
        await call(`/attempts/${ids[0]}/oral`, {
          method: 'POST',
          token: user.token,
        })
      ).body,
    );
    const second = await call(`/attempts/${ids[1]}/oral`, {
      method: 'POST',
      token: user.token,
    });
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({ code: 'oral_in_progress' });
    const abandoned = oralViewSchema.parse(
      (
        await call(`/orals/${first.id}/abandon`, {
          method: 'POST',
          token: user.token,
        })
      ).body,
    );
    expect(abandoned.status).toBe('completed');
    expect(abandoned.result?.verdict).toBe('FAILED');
  });

  it('refuses unpublished skills and invalid identifiers', async () => {
    const user = await register();
    expect(
      (
        await call('/attempts', {
          token: user.token,
          body: { challengeId: 'absent-challenge', work: 'x' },
        })
      ).status,
    ).toBe(404);
    expect(
      (await call('/orals/not-a-uuid', { token: user.token })).status,
    ).toBe(400);
  });
});

describe('tutor', () => {
  it('streams answers within a quota, refuses during an oral and stores no content', async () => {
    const user = await register();
    const body = {
      skillId: 'js-basics',
      messages: [
        { role: 'user', content: 'Pourquoi typeof null vaut object ?' },
      ],
    };
    expect((await call('/tutor/messages', { body })).status).toBe(401);
    const answer = await call('/tutor/messages', { token: user.token, body });
    expect(answer.status).toBe(200);
    expect(answer.text).toContain('tuteur de démonstration');
    expect(
      (
        await call('/tutor/messages', {
          token: user.token,
          body: { ...body, messages: [{ role: 'assistant', content: 'x' }] },
        })
      ).status,
    ).toBe(400);
    const attempt = z.object({ id: z.string() }).parse(
      (
        await call('/attempts', {
          token: user.token,
          body: { challengeId, work: 'work' },
        })
      ).body,
    );
    const oral = oralViewSchema.parse(
      (
        await call(`/attempts/${attempt.id}/oral`, {
          method: 'POST',
          token: user.token,
        })
      ).body,
    );
    const refused = await call('/tutor/messages', { token: user.token, body });
    expect(refused.status).toBe(403);
    expect(refused.body).toMatchObject({ code: 'tutor_during_oral' });
    expect(
      (await call('/tutor/quota', { token: user.token })).body,
    ).toMatchObject({ available: false, reason: 'oral_in_progress' });
    await call(`/orals/${oral.id}/abandon`, {
      method: 'POST',
      token: user.token,
    });
    expect(
      (await call('/tutor/messages', { token: user.token, body })).status,
    ).toBe(200);
    const exhausted = await call('/tutor/messages', {
      token: user.token,
      body,
    });
    expect(exhausted.status).toBe(429);
    expect(exhausted.body).toMatchObject({ code: 'tutor_quota_exceeded' });
    expect(await db.tutorUsage.count({ where: { userId: user.id } })).toBe(2);
    const exported = await call('/me/export', { token: user.token });
    expect(exported.text).not.toContain('typeof null');
  });
});

it('derives skill states from validations and prerequisites', () => {
  const at = new Date('2030-06-01T00:00:00Z');
  const states = skillStates(
    [
      { id: 'a', status: 'PUBLISHED', prerequisites: [] },
      { id: 'b', status: 'PUBLISHED', prerequisites: ['a'] },
      { id: 'c', status: 'PUBLISHED', prerequisites: ['b'] },
      { id: 'd', status: 'DRAFT', prerequisites: [] },
    ],
    [
      {
        skillId: 'a',
        validatedAt: new Date('2029-01-01T00:00:00Z'),
        expiresAt: new Date('2029-07-01T00:00:00Z'),
      },
    ],
    at,
  );
  expect(states.map((s) => s.state)).toEqual([
    'expired',
    'available',
    'locked',
    'upcoming',
  ]);
});
