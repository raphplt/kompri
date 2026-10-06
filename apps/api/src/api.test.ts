import { afterAll, beforeAll, expect, it } from 'vitest';
import { createDatabase } from '@kompri/db';
import { skillsResponseSchema, z } from '@kompri/shared';
import { createApi } from './app.ts';
let app: Awaited<ReturnType<typeof createApi>>;
let base: string;
beforeAll(async () => {
  app = await createApi();
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
});
it('checks the database and returns the seeded skill tree', async () => {
  expect(await (await fetch(`${base}/health`)).json()).toEqual({
    status: 'ok',
    database: 'up',
  });
  const skills = skillsResponseSchema.parse(
    await (await fetch(`${base}/skills`)).json(),
  );
  expect(skills.find((s) => s.id === 'http')?.prerequisites).toEqual([
    'functions',
  ]);
  expect((await fetch(`${base}/skills?admin=true`)).status).toBe(400);
  const document = z
    .object({ paths: z.record(z.string(), z.unknown()) })
    .parse(await (await fetch(`${base}/openapi.json`)).json());
  expect(Object.keys(document.paths)).toEqual(['/health', '/skills']);
});
it('reports unavailable when the database check fails', async () => {
  const db = createDatabase();
  const original = db.$queryRaw;
  db.$queryRaw = () => {
    throw new Error('secret connection details');
  };
  const unhealthy = await createApi(db);
  try {
    await unhealthy.listen(0, '127.0.0.1');
    const response = await fetch(`${await unhealthy.getUrl()}/health`);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret');
  } finally {
    db.$queryRaw = original;
    await unhealthy.close();
  }
});
