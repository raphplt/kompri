import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase } from '@kompri/db';
import {
  adminStatsSchema,
  challengeDetailSchema,
  oralViewSchema,
  progressResponseSchema,
  searchResponseSchema,
  skillDetailSchema,
  treeResponseSchema,
  z,
} from '@kompri/shared';
import { createExaminerMock } from '@kompri/examiner/testing';
import { createApi, developmentResponder } from './app.ts';
import type { Mail } from './mailer.ts';
import { runDailyTasks } from './daily.ts';
import { createClient, createMockAdapter } from '@kompri/llm';
import type { LlmClient } from '@kompri/llm';
import { nextLesson, skillStates } from './progress.ts';
import { excerptParts } from './search.ts';
import { monthOf, recordSpend } from './spend.ts';

const db = createDatabase();
/**
 * The examiner mock, instrumented: counts model calls and can simulate
 * latency (the fake clock advances during the call) or a stalled call.
 */
const examinerControl = {
  calls: 0,
  latencySeconds: 0,
  gate: null as Promise<void> | null,
};
const baseExaminer = createExaminerMock();
const examinerClient: LlmClient = {
  ...baseExaminer,
  async generateStructured(request, schema) {
    examinerControl.calls++;
    if (examinerControl.gate) await examinerControl.gate;
    advance(examinerControl.latencySeconds);
    return baseExaminer.generateStructured(request, schema);
  },
};
let now = new Date('2030-01-01T10:00:00Z');
const advance = (seconds: number) => {
  now = new Date(now.getTime() + seconds * 1000);
};
let app: Awaited<ReturnType<typeof createApi>>;
let base: string;
const challengeId = 'js-basics-sans-ia';
const created: string[] = [];
const mails: Mail[] = [];
let previousStatus: 'DRAFT' | 'PUBLISHED' = 'DRAFT';

/** A distinct visitor address per call unless a test sets one (rate limits). */
const randomAddress = () =>
  `198.51.100.${Math.floor(Math.random() * 250)}-${crypto.randomUUID()}`.slice(
    0,
    60,
  );

async function call(
  path: string,
  init: { method?: string; token?: string; body?: unknown; ip?: string } = {},
) {
  const response = await fetch(`${base}${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: {
      ...(init.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      'X-Kompri-Client-IP': init.ip ?? randomAddress(),
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

const linkToken = (mail: Mail) =>
  new URL(/https?:\/\/\S+/.exec(mail.text)![0]).searchParams.get('jeton')!;

async function register(name = 'Alice', verify = true) {
  const email = `test-${crypto.randomUUID()}@example.invalid`;
  const response = await call('/auth/register', {
    body: { email, password: 'correct horse battery', displayName: name },
  });
  expect(response.status).toBe(201);
  const body = z
    .object({ token: z.string(), user: z.object({ id: z.string() }) })
    .parse(response.body);
  created.push(body.user.id);
  if (verify) {
    const mail = mails.findLast((m) => m.to === email)!;
    expect(
      (
        await call('/auth/email/verify', {
          body: { token: linkToken(mail) },
        })
      ).status,
    ).toBe(204);
  }
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
    examiner: { provider: 'mock', client: examinerClient },
    mailer: {
      send: async (mail) => {
        mails.push(mail);
      },
    },
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
      LLM_MONTHLY_BUDGET_USD: 5,
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

describe('search', () => {
  it('finds lessons without accents and highlights the words found', async () => {
    const response = await call(
      `/search?q=${encodeURIComponent('requetes parametrees')}`,
    );
    expect(response.status).toBe(200);
    const body = searchResponseSchema.parse(response.body);
    expect(body.results[0]).toMatchObject({
      skillId: 'database-from-node',
      slug: 'requetes-parametrees-et-injection',
    });
    expect(body.results[0]?.excerpt.some((part) => part.match)).toBe(true);
    expect((await call('/search?q=a')).status).toBe(400);
    expect(
      searchResponseSchema.parse((await call('/search?q=le+la')).body).results,
    ).toEqual([]);
  });

  it('splits highlighted excerpts', () => {
    expect(excerptParts('Une  \u27E6promesse\u27E7 est\nun objet')).toEqual([
      { text: 'Une ', match: false },
      { text: 'promesse', match: true },
      { text: ' est un objet', match: false },
    ]);
  });
});

describe('content', () => {
  it('hides the detailed levels of defect-finding challenges', async () => {
    const rubricOf = async (id: string) =>
      challengeDetailSchema.parse((await call(`/challenges/${id}`)).body)
        .rubric;
    const solo = await rubricOf('js-basics-sans-ia');
    expect(solo.criteria.every((c) => c.levels?.length)).toBe(true);
    for (const id of ['js-basics-contre-ia', 'js-basics-apres-ia']) {
      const rubric = await rubricOf(id);
      expect(rubric.criteria.length).toBeGreaterThan(0);
      expect(rubric.criteria.every((c) => c.levels === undefined)).toBe(true);
    }
  });

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
    // Locked: even the right password is refused, exactly like a wrong one.
    const locked = await call('/auth/login', {
      body: { email: user.email, password: 'correct horse battery' },
    });
    expect(locked.status).toBe(401);
    expect(locked.body).toMatchObject({ code: 'invalid_credentials' });
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

  it('locks after five failures even when the attempts arrive in parallel', async () => {
    const user = await register();
    const attempts = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        call('/auth/login', {
          body: {
            email: user.email,
            password: i === 11 ? 'correct horse battery' : 'wrong password!',
          },
        }),
      ),
    );
    // At most five passwords were actually checked, and none opened a session.
    expect(attempts.every((r) => r.status === 401)).toBe(true);
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.lockedUntil).not.toBeNull();
  });

  it('limits logins and sign-ups per visitor address', async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 250)}`;
    const statuses: number[] = [];
    for (let i = 0; i < 22; i++)
      statuses.push(
        (
          await call('/auth/login', {
            ip,
            body: {
              email: 'nobody@example.invalid',
              password: 'whatever pass',
            },
          })
        ).status,
      );
    expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(20)).toEqual([429, 429]);
    // Another address is not affected.
    expect(
      (
        await call('/auth/login', {
          body: { email: 'nobody@example.invalid', password: 'whatever pass' },
        })
      ).status,
    ).toBe(401);
  }, 30_000);

  it('exports a section for every table that holds personal rows', async () => {
    const user = await register();
    const exported = z
      .record(z.string(), z.unknown())
      .parse((await call('/me/export', { token: user.token })).body);
    const tables = await db.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'userId'`;
    const section: Record<string, string> = {
      AuthSession: 'authSessions',
      Attempt: 'attempts',
      OralSession: 'sessions',
      Validation: 'validations',
      OralUsage: 'oralUsage',
      TutorUsage: 'tutorUsage',
      PasswordReset: 'passwordResets',
      EmailVerification: 'emailChecks',
      ReviewRequest: 'reviewRequests',
      LessonProgress: 'lessonProgress',
    };
    for (const { table_name } of tables) {
      expect(section, `no export section for ${table_name}`).toHaveProperty(
        table_name,
      );
      expect(exported).toHaveProperty(section[table_name]!);
    }
    expect(exported).toHaveProperty('lastActiveAt');
    expect(JSON.stringify(exported)).not.toContain('scrypt$');
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

async function newAttempt(token: string) {
  return z
    .object({ id: z.string() })
    .parse(
      (await call('/attempts', { token, body: { challengeId, work: 'x' } }))
        .body,
    ).id;
}

describe('oral concurrency and recovery', () => {
  it('runs one model step at a time per oral, whatever the parallel requests', async () => {
    const user = await register();
    const attemptId = await newAttempt(user.token);
    // Parallel starts of the same learner: one oral, one model call, one quota.
    examinerControl.calls = 0;
    const starts = await Promise.all(
      Array.from({ length: 6 }, () =>
        call(`/attempts/${attemptId}/oral`, {
          method: 'POST',
          token: user.token,
        }),
      ),
    );
    expect(starts.filter((r) => r.status === 201)).toHaveLength(1);
    expect(starts.every((r) => [201, 409].includes(r.status))).toBe(true);
    expect(examinerControl.calls).toBe(1);
    const oral = oralViewSchema.parse(
      starts.find((r) => r.status === 201)!.body,
    );
    expect(await db.oralUsage.count({ where: { userId: user.id } })).toBe(1);

    // Parallel answers to the same question: one follow-up, one stored turn.
    let release!: () => void;
    examinerControl.calls = 0;
    examinerControl.gate = new Promise((resolve) => (release = resolve));
    const answers = Promise.all(
      Array.from({ length: 8 }, () =>
        call(`/orals/${oral.id}/answers`, {
          token: user.token,
          body: { text: long },
        }),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    release();
    examinerControl.gate = null;
    const results = await answers;
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(
      results
        .filter((r) => r.status !== 200)
        .every((r) => (r.body as { code: string }).code === 'oral_busy'),
    ).toBe(true);
    expect(examinerControl.calls).toBe(1);
    expect(
      await db.oralTurn.count({
        where: { sessionId: oral.id, speaker: 'LEARNER' },
      }),
    ).toBe(1);
    await call(`/orals/${oral.id}/abandon`, {
      method: 'POST',
      token: user.token,
    });
  });

  it('starts the answer time once the question exists, after the model call', async () => {
    const user = await register();
    const attemptId = await newAttempt(user.token);
    examinerControl.latencySeconds = 20;
    try {
      let oral = oralViewSchema.parse(
        (
          await call(`/attempts/${attemptId}/oral`, {
            method: 'POST',
            token: user.token,
          })
        ).body,
      );
      expect(Date.parse(oral.deadline!) - Date.parse(oral.serverTime)).toBe(
        60_000,
      );
      oral = oralViewSchema.parse(
        (
          await call(`/orals/${oral.id}/answers`, {
            token: user.token,
            body: { text: long },
          })
        ).body,
      );
      expect(Date.parse(oral.deadline!) - Date.parse(oral.serverTime)).toBe(
        60_000,
      );
      await call(`/orals/${oral.id}/abandon`, {
        method: 'POST',
        token: user.token,
      });
    } finally {
      examinerControl.latencySeconds = 0;
    }
  });

  it('recovers an oral whose grading was interrupted, and grades it once', async () => {
    const user = await register();
    const attemptId = await newAttempt(user.token);
    const oral = oralViewSchema.parse(
      (
        await call(`/attempts/${attemptId}/oral`, {
          method: 'POST',
          token: user.token,
        })
      ).body,
    );
    // Simulate a crash after the last answer was stored, before grading.
    const questions = z
      .object({ questions: z.array(z.string()) })
      .parse(
        (await db.oralSession.findUniqueOrThrow({ where: { id: oral.id } }))
          .plan,
      ).questions;
    for (let i = 0; i < questions.length; i++) {
      const sequence = await db.oralTurn.count({
        where: { sessionId: oral.id },
      });
      if (i > 0)
        await db.oralTurn.create({
          data: {
            sessionId: oral.id,
            sequence,
            speaker: 'EXAMINER',
            text: questions[i]!,
            createdAt: now,
          },
        });
      await db.oralTurn.create({
        data: {
          sessionId: oral.id,
          sequence: sequence + (i > 0 ? 1 : 0),
          speaker: 'LEARNER',
          text: long,
          createdAt: now,
        },
      });
    }
    await db.oralSession.update({
      where: { id: oral.id },
      data: { busyUntil: new Date(now.getTime() - 1000) },
    });
    const [first, second] = await Promise.all([
      call(`/orals/${oral.id}/grade`, { method: 'POST', token: user.token }),
      call(`/orals/${oral.id}/abandon`, { method: 'POST', token: user.token }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const done = oralViewSchema.parse(
      (await call(`/orals/${oral.id}`, { token: user.token })).body,
    );
    expect(done.status).toBe('completed');
    expect(done.result?.verdict).toBe('PASSED');
    expect(
      await db.validation.count({ where: { oralSessionId: oral.id } }),
    ).toBe(1);
  });

  it('keeps room in the budget for the orals in progress', async () => {
    const user = await register();
    const other = await register('Bob');
    const month = monthOf(now);
    // 5 USD budget, 0.10 reserved per oral in progress (other tests included):
    // room for exactly one more oral.
    const active = await db.oralSession.count({ where: { status: 'ACTIVE' } });
    await db.llmMonthlySpend.create({
      data: { month, costUsd: 5 - 0.1 * (active + 1) - 0.05, calls: 1 },
    });
    try {
      const first = await call(
        `/attempts/${await newAttempt(user.token)}/oral`,
        { method: 'POST', token: user.token },
      );
      expect(first.status).toBe(201);
      const refused = await call(
        `/attempts/${await newAttempt(other.token)}/oral`,
        { method: 'POST', token: other.token },
      );
      expect(refused.status).toBe(503);
      expect(refused.body).toMatchObject({ code: 'llm_budget_exhausted' });
      await call(`/orals/${oralViewSchema.parse(first.body).id}/abandon`, {
        method: 'POST',
        token: user.token,
      });
    } finally {
      await db.llmMonthlySpend.delete({ where: { month } });
    }
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
    const signals = {
      pasteAttempts: 2,
      focusLosses: 1,
      firstInputMs: 4200,
      typingMs: 21000,
    };
    oral = oralViewSchema.parse(
      (
        await call(`/orals/${oral.id}/answers`, {
          token: user.token,
          body: { text: long, signals },
        })
      ).body,
    );
    expect(oral.answeredCount).toBe(1);
    const stored = await db.oralTurn.findFirst({
      where: { sessionId: oral.id, speaker: 'LEARNER' },
    });
    expect(stored?.signals).toEqual(signals);
    expect(
      (
        await call(`/orals/${oral.id}/answers`, {
          token: user.token,
          body: { text: long, signals: { ...signals, pasteAttempts: -1 } },
        })
      ).status,
    ).toBe(400);
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

describe('account', () => {
  it('requires a verified e-mail before an oral', async () => {
    const user = await register('Nina', false);
    const me = z
      .object({ emailVerified: z.boolean(), role: z.string() })
      .parse((await call('/me', { token: user.token })).body);
    expect(me).toEqual({ emailVerified: false, role: 'learner' });
    const attempt = z.object({ id: z.string() }).parse(
      (
        await call('/attempts', {
          token: user.token,
          body: { challengeId, work: 'work' },
        })
      ).body,
    );
    const refused = await call(`/attempts/${attempt.id}/oral`, {
      method: 'POST',
      token: user.token,
    });
    expect(refused.body).toMatchObject({ code: 'email_unverified' });
    expect(
      (
        await call('/me/email/verification', {
          method: 'POST',
          token: user.token,
        })
      ).status,
    ).toBe(202);
    const token = linkToken(mails.findLast((m) => m.to === user.email)!);
    expect((await call('/auth/email/verify', { body: { token } })).status).toBe(
      204,
    );
    expect(
      (await call('/auth/email/verify', { body: { token } })).body,
    ).toMatchObject({ code: 'verification_link_invalid' });
    expect(
      (
        await call(`/attempts/${attempt.id}/oral`, {
          method: 'POST',
          token: user.token,
        })
      ).status,
    ).toBe(201);
  });

  it('changes the password and the e-mail with the current password', async () => {
    const user = await register();
    const other = z.object({ token: z.string() }).parse(
      (
        await call('/auth/login', {
          body: { email: user.email, password: 'correct horse battery' },
        })
      ).body,
    );
    expect(
      (
        await call('/me/password', {
          token: user.token,
          body: {
            currentPassword: 'wrong',
            newPassword: 'another long phrase',
          },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await call('/me/password', {
          token: user.token,
          body: {
            currentPassword: 'correct horse battery',
            newPassword: 'another long phrase',
          },
        })
      ).status,
    ).toBe(204);
    expect((await call('/me', { token: other.token })).status).toBe(401);
    expect((await call('/me', { token: user.token })).status).toBe(200);

    const newEmail = `new-${crypto.randomUUID()}@example.invalid`;
    expect(
      (
        await call('/me/email', {
          token: user.token,
          body: { password: 'another long phrase', newEmail },
        })
      ).status,
    ).toBe(202);
    expect(mails.findLast((m) => m.to === user.email)?.subject).toContain(
      'Changement',
    );
    const token = linkToken(mails.findLast((m) => m.to === newEmail)!);
    await call('/auth/email/verify', { body: { token } });
    expect(
      z
        .object({ email: z.string() })
        .parse((await call('/me', { token: user.token })).body).email,
    ).toBe(newEmail);
  });
});

describe('human review', () => {
  it('does not let an administrator decide on their own oral', async () => {
    const admin = await register('Admin');
    await db.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
    let oral = oralViewSchema.parse(
      (
        await call(`/attempts/${await newAttempt(admin.token)}/oral`, {
          method: 'POST',
          token: admin.token,
        })
      ).body,
    );
    oral = oralViewSchema.parse(
      (
        await call(`/orals/${oral.id}/abandon`, {
          method: 'POST',
          token: admin.token,
        })
      ).body,
    );
    expect(
      (
        await call(`/orals/${oral.id}/review`, {
          token: admin.token,
          body: {
            message: 'Je conteste ma propre note pour vérifier la règle.',
          },
        })
      ).status,
    ).toBe(201);
    const review = await db.reviewRequest.findFirstOrThrow({
      where: { oralSessionId: oral.id },
    });
    const decided = await call(`/admin/reviews/${review.id}/decision`, {
      token: admin.token,
      body: { decision: 'overturn', response: 'Je me donne raison.' },
    });
    expect(decided.status).toBe(403);
    expect(decided.body).toMatchObject({ code: 'own_review' });
  });

  it('lets a learner contest a grade and an administrator overturn it', async () => {
    const user = await register();
    const admin = await register('Admin');
    const attempt = z.object({ id: z.string() }).parse(
      (
        await call('/attempts', {
          token: user.token,
          body: { challengeId, work: 'const x = 1;' },
        })
      ).body,
    );
    let oral = oralViewSchema.parse(
      (
        await call(`/attempts/${attempt.id}/oral`, {
          method: 'POST',
          token: user.token,
        })
      ).body,
    );
    oral = oralViewSchema.parse(
      (
        await call(`/orals/${oral.id}/abandon`, {
          method: 'POST',
          token: user.token,
        })
      ).body,
    );
    expect(oral.result?.verdict).toBe('FAILED');
    expect(oral.reviewDeadline).not.toBeNull();
    expect(
      (
        await call(`/orals/${oral.id}/review`, {
          token: user.token,
          body: { message: 'trop court' },
        })
      ).status,
    ).toBe(400);
    const message =
      'Ma connexion a coupé pendant la première question, je demande un réexamen.';
    expect(
      (
        await call(`/orals/${oral.id}/review`, {
          token: user.token,
          body: { message },
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await call(`/orals/${oral.id}/review`, {
          token: user.token,
          body: { message },
        })
      ).status,
    ).toBe(409);
    expect(
      oralViewSchema.parse(
        (await call(`/orals/${oral.id}`, { token: user.token })).body,
      ).review?.status,
    ).toBe('open');

    expect((await call('/admin/reviews', { token: user.token })).status).toBe(
      403,
    );
    await db.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
    const list = z
      .array(z.object({ id: z.string(), status: z.string() }))
      .parse((await call('/admin/reviews', { token: admin.token })).body);
    const own = await db.reviewRequest.findFirstOrThrow({
      where: { oralSessionId: oral.id },
    });
    const review = list.find((r) => r.id === own.id && r.status === 'open')!;
    const detail = await call(`/admin/reviews/${review.id}`, {
      token: admin.token,
    });
    // Examiner notes reach the reviewer when the answer keys were seeded
    // (KOMPRI_CONTENT_KEY); CI without the key seeds none.
    const { examinerNotes } = await db.challenge.findUniqueOrThrow({
      where: { id: challengeId },
    });
    expect(detail.body).toMatchObject({ examinerNotes });
    expect(
      (
        await call(`/admin/reviews/${review.id}/decision`, {
          token: admin.token,
          body: {
            decision: 'overturn',
            response: 'Coupure confirmée, compétence validée.',
          },
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await call(`/admin/reviews/${review.id}/decision`, {
          token: admin.token,
          body: { decision: 'confirm', response: 'Deuxième décision refusée.' },
        })
      ).status,
    ).toBe(409);
    const after = oralViewSchema.parse(
      (await call(`/orals/${oral.id}`, { token: user.token })).body,
    );
    expect(after.result?.verdict).toBe('PASSED');
    expect(after.review?.status).toBe('overturned');
    expect(after.result?.validationExpiresAt).not.toBeNull();
    expect(mails.findLast((m) => m.to === user.email)?.text).toContain(
      'Coupure confirmée',
    );
    const stats = adminStatsSchema.parse(
      (await call('/admin/stats', { token: admin.token })).body,
    );
    const row = stats.challenges.find((c) => c.challengeId === challengeId)!;
    expect(row.overturned).toBeGreaterThanOrEqual(1);
    expect(row.orals).toBeGreaterThanOrEqual(row.reviews);
    expect((await call('/admin/stats', { token: user.token })).status).toBe(
      403,
    );
  });
});

describe('daily tasks', () => {
  it('reminds expiring validations once and purges inactive accounts after notice', async () => {
    const user = await register();
    const attempt = await db.attempt.create({
      data: {
        userId: user.id,
        challengeId,
        submittedWork: 'x',
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
        status: 'GRADING_FAILED',
      },
    });
    const at = new Date('2031-01-01T08:00:00Z');
    await db.validation.create({
      data: {
        userId: user.id,
        skillId: 'js-basics',
        oralSessionId: session.id,
        verdict: 'PASSED',
        criteria: [],
        validatedAt: new Date('2030-07-10T00:00:00Z'),
        expiresAt: new Date('2031-01-07T00:00:00Z'),
      },
    });
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date('2029-01-01T00:00:00Z') },
    });
    const sent: Mail[] = [];
    const run = (now: Date) =>
      runDailyTasks({
        db,
        mailer: { send: async (mail) => void sent.push(mail) },
        now,
        webUrl: 'https://kompri.example',
        reminderDays: 14,
        inactiveAccountDays: 365,
        // Other test or development accounts in the database must stay untouched.
        onlyUserIds: [user.id],
      });
    const first = await run(at);
    expect(
      sent.filter((m) => m.to === user.email).map((m) => m.subject),
    ).toEqual([
      'Des compétences Kompri arrivent à expiration',
      'Ton compte Kompri va être supprimé',
    ]);
    expect(first.reminders).toBeGreaterThanOrEqual(1);
    const second = await run(at);
    expect(sent.filter((m) => m.to === user.email)).toHaveLength(2);
    expect(await db.user.count({ where: { id: user.id } })).toBe(1);
    void second;
    await run(new Date(at.getTime() + 15 * 86_400_000));
    expect(await db.user.count({ where: { id: user.id } })).toBe(0);
  });
});

describe('password reset', () => {
  it('sends a single-use link, changes the password and ends every session', async () => {
    const user = await register();
    expect(
      (
        await call('/auth/password/forgot', {
          body: { email: 'nobody@example.invalid' },
        })
      ).status,
    ).toBe(202);
    const resets = () =>
      mails.filter((m) => m.subject.startsWith('Réinitialisation'));
    expect(
      resets().filter((m) => m.to === 'nobody@example.invalid'),
    ).toHaveLength(0);
    expect(
      (await call('/auth/password/forgot', { body: { email: user.email } }))
        .status,
    ).toBe(202);
    const mail = resets().at(-1)!;
    expect(mail.to).toBe(user.email);
    const token = new URL(
      /https?:\/\/\S+/.exec(mail.text)![0],
    ).searchParams.get('jeton')!;
    expect(await db.passwordReset.count({ where: { tokenHash: token } })).toBe(
      0,
    );
    const body = { token, password: 'a brand new pass phrase' };
    expect((await call('/auth/password/reset', { body })).status).toBe(204);
    expect((await call('/me', { token: user.token })).status).toBe(401);
    const reuse = await call('/auth/password/reset', { body });
    expect(reuse.status).toBe(400);
    expect(reuse.body).toMatchObject({ code: 'reset_link_invalid' });
    expect(
      (
        await call('/auth/login', {
          body: { email: user.email, password: 'a brand new pass phrase' },
        })
      ).status,
    ).toBe(200);
    for (let i = 0; i < 4; i++)
      await call('/auth/password/forgot', { body: { email: user.email } });
    expect(resets().filter((m) => m.to === user.email)).toHaveLength(3);
    advance(2 * 3600);
    const expired = new URL(
      /https?:\/\/\S+/.exec(resets().at(-1)!.text)![0],
    ).searchParams.get('jeton')!;
    expect(
      (
        await call('/auth/password/reset', {
          body: { ...body, token: expired },
        })
      ).status,
    ).toBe(400);
  });
});

describe('lesson progress', () => {
  it('marks lessons as read idempotently and reports them', async () => {
    const user = await register();
    const lesson = await db.lesson.findFirstOrThrow({
      where: { skillId: 'js-basics', archivedAt: null },
      orderBy: { position: 'asc' },
    });
    const path = `/me/lessons/js-basics/${lesson.slug}`;
    expect((await call(path, { method: 'PUT' })).status).toBe(401);
    expect(
      (await call(path, { method: 'PUT', token: user.token })).status,
    ).toBe(204);
    expect(
      (await call(path, { method: 'PUT', token: user.token })).status,
    ).toBe(204);
    expect(
      (
        await call('/me/lessons/js-basics/absent', {
          method: 'PUT',
          token: user.token,
        })
      ).status,
    ).toBe(404);
    let progress = progressResponseSchema.parse(
      (await call('/me/progress', { token: user.token })).body,
    );
    expect(progress.completedLessons).toEqual([lesson.id]);
    const second = await db.lesson.findFirstOrThrow({
      where: { skillId: 'js-basics', archivedAt: null },
      orderBy: { position: 'asc' },
      skip: 1,
    });
    expect(progress.nextLesson).toEqual({
      skillId: 'js-basics',
      slug: second.slug,
      title: second.title,
    });
    expect((await call('/me/export', { token: user.token })).text).toContain(
      lesson.id,
    );
    expect(
      (await call(path, { method: 'DELETE', token: user.token })).status,
    ).toBe(204);
    progress = progressResponseSchema.parse(
      (await call('/me/progress', { token: user.token })).body,
    );
    expect(progress.completedLessons).toEqual([]);
    const entry = await db.lesson.findFirstOrThrow({
      where: {
        archivedAt: null,
        skill: {
          status: 'PUBLISHED',
          archivedAt: null,
          prerequisites: { none: {} },
        },
      },
      orderBy: [{ skill: { position: 'asc' } }, { position: 'asc' }],
    });
    expect(progress.nextLesson).toMatchObject({
      skillId: entry.skillId,
      slug: entry.slug,
    });
  });
});

it('suggests the next lesson from the latest reading, then the tree', () => {
  const lesson = (skillId: string, slug: string) => ({
    id: `${skillId}/${slug}`,
    skillId,
    slug,
    title: slug,
  });
  const lessons = [lesson('a', 'a1'), lesson('a', 'a2'), lesson('b', 'b1')];
  const at = (day: number) => new Date(Date.UTC(2030, 0, day));
  const states = [
    { skillId: 'a', state: 'validated' as const },
    { skillId: 'b', state: 'available' as const },
  ];
  expect(nextLesson(lessons, [], states)?.slug).toBe('b1');
  expect(
    nextLesson(lessons, [{ lessonId: 'a/a1', completedAt: at(1) }], states)
      ?.slug,
  ).toBe('a2');
  expect(
    nextLesson(
      lessons,
      [
        { lessonId: 'a/a1', completedAt: at(1) },
        { lessonId: 'a/a2', completedAt: at(2) },
      ],
      states,
    )?.slug,
  ).toBe('b1');
  expect(
    nextLesson(
      lessons,
      lessons.map((l, i) => ({ lessonId: l.id, completedAt: at(i + 1) })),
      states,
    ),
  ).toBeNull();
});

describe('placement', () => {
  it('requires prerequisites unless the oral is taken as a placement', async () => {
    const user = await register();
    const attempt = z.object({ id: z.string() }).parse(
      (
        await call('/attempts', {
          token: user.token,
          body: {
            challengeId: 'js-functions-sans-ia',
            work: 'function f() {}',
          },
        })
      ).body,
    );
    const refused = await call(`/attempts/${attempt.id}/oral`, {
      method: 'POST',
      token: user.token,
    });
    expect(refused.status).toBe(403);
    expect(refused.body).toMatchObject({ code: 'prerequisites_missing' });
    const placement = await call(`/attempts/${attempt.id}/oral`, {
      token: user.token,
      body: { placement: true },
    });
    expect(placement.status).toBe(201);
    const oral = oralViewSchema.parse(placement.body);
    for (let i = 0; i < 3; i++) {
      advance(20);
      await call(`/orals/${oral.id}/answers`, {
        token: user.token,
        body: { text: long },
      });
    }
    const progress = progressResponseSchema.parse(
      (await call('/me/progress', { token: user.token })).body,
    );
    const state = (id: string) =>
      progress.skills.find((s) => s.skillId === id)?.state;
    expect(state('js-functions')).toBe('validated');
    expect(state('js-control-flow')).toBe('available');
    expect(state('js-data')).toBe('available');
  });
});

describe('monthly AI budget', () => {
  it('accumulates the estimated cost of paid calls only', async () => {
    const at = new Date('2099-03-15T00:00:00Z');
    await db.llmMonthlySpend.deleteMany({ where: { month: '2099-03' } });
    await recordSpend(db, { estimatedCostUsd: 0 }, at);
    await recordSpend(db, { estimatedCostUsd: null }, at);
    expect(
      await db.llmMonthlySpend.findUnique({ where: { month: '2099-03' } }),
    ).toBeNull();
    await recordSpend(db, { estimatedCostUsd: 0.25 }, at);
    await recordSpend(db, { estimatedCostUsd: 0.5 }, at);
    const row = await db.llmMonthlySpend.findUniqueOrThrow({
      where: { month: '2099-03' },
    });
    expect(Number(row.costUsd)).toBe(0.75);
    expect(row.calls).toBe(2);
    await db.llmMonthlySpend.delete({ where: { month: '2099-03' } });
  });

  it('refuses new orals and tutor messages once the budget is spent', async () => {
    const user = await register();
    const month = monthOf(now);
    await db.llmMonthlySpend.create({ data: { month, costUsd: 5, calls: 1 } });
    try {
      const attempt = z.object({ id: z.string() }).parse(
        (
          await call('/attempts', {
            token: user.token,
            body: { challengeId, work: 'work' },
          })
        ).body,
      );
      const oral = await call(`/attempts/${attempt.id}/oral`, {
        method: 'POST',
        token: user.token,
      });
      expect(oral.status).toBe(503);
      expect(oral.body).toMatchObject({ code: 'llm_budget_exhausted' });
      const tutor = await call('/tutor/messages', {
        token: user.token,
        body: {
          skillId: 'js-basics',
          messages: [{ role: 'user', content: 'Une question' }],
        },
      });
      expect(tutor.status).toBe(503);
      expect(tutor.body).toMatchObject({ code: 'llm_budget_exhausted' });
      // A refused message does not consume the learner's tutor quota.
      expect(
        (await call('/tutor/quota', { token: user.token })).body,
      ).toMatchObject({ used: 0 });
    } finally {
      await db.llmMonthlySpend.delete({ where: { month } });
    }
  });
});

describe('tutor', () => {
  it('keeps the tutor quota under parallel messages', async () => {
    const user = await register();
    const body = {
      skillId: 'js-basics',
      messages: [{ role: 'user', content: 'Une question rapide' }],
    };
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        call('/tutor/messages', { token: user.token, body }),
      ),
    );
    // TUTOR_LIMIT_PER_WINDOW is 2 in this suite.
    expect(results.filter((r) => r.status === 200)).toHaveLength(2);
    expect(await db.tutorUsage.count({ where: { userId: user.id } })).toBe(2);
  });

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

it('unlocks the skills built on what a placement validated', () => {
  const states = skillStates(
    [
      { id: 'a', status: 'PUBLISHED', prerequisites: [] },
      { id: 'b', status: 'PUBLISHED', prerequisites: ['a'] },
      { id: 'c', status: 'PUBLISHED', prerequisites: ['b'] },
      { id: 'd', status: 'PUBLISHED', prerequisites: ['b'] },
      { id: 'e', status: 'PUBLISHED', prerequisites: ['d'] },
    ],
    [
      {
        skillId: 'c',
        validatedAt: new Date('2030-01-01T00:00:00Z'),
        expiresAt: new Date('2031-01-01T00:00:00Z'),
      },
    ],
    new Date('2030-06-01T00:00:00Z'),
  );
  expect(states.map((s) => s.state)).toEqual([
    'available',
    'available',
    'validated',
    'available',
    'locked',
  ]);
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
