import { expect, it } from 'vitest';
import { skillsQuerySchema } from './index.ts';
import { apiEnvSchema, parseEnvironment } from './env.ts';
it('rejects unexpected query parameters and unsupported locales', () => {
  expect(skillsQuerySchema.safeParse({ locale: 'de' }).success).toBe(false);
  expect(skillsQuerySchema.safeParse({ admin: true }).success).toBe(false);
});
it('fails explicitly on missing configuration without exposing values', () => {
  expect(() =>
    parseEnvironment(apiEnvSchema, { DATABASE_URL: 'private-value' }),
  ).toThrow('Invalid environment: DATABASE_URL, API_PORT');
});
