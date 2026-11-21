import { z } from 'zod';
export function parseEnvironment<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    // Do not include received values: some fields contain credentials.
    throw new Error(
      `Invalid environment: ${[...new Set(result.error.issues.map((issue) => issue.path.join('.')))].join(', ')}`,
    );
  }
  return result.data;
}
export const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .url()
    .refine(
      (value) =>
        URL.canParse(value) &&
        ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
    ),
});
const positiveInteger = (fallback: number, max: number) =>
  z.coerce.number().int().min(1).max(max).default(fallback);
export const apiEnvSchema = databaseEnvSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65535),
  API_HOST: z.string().min(1).default('127.0.0.1'),
  ORAL_QUESTION_COUNT: z.coerce.number().int().min(2).max(5).default(3),
  ORAL_ANSWER_SECONDS: positiveInteger(240, 3600),
  ORAL_LIMIT_PER_WINDOW: positiveInteger(5, 1000),
  ORAL_WINDOW_HOURS: positiveInteger(24, 24 * 31),
  VALIDATION_DAYS: positiveInteger(180, 3650),
  SESSION_DAYS: positiveInteger(30, 365),
  TUTOR_LIMIT_PER_WINDOW: positiveInteger(60, 10_000),
  TUTOR_WINDOW_HOURS: positiveInteger(24, 24 * 31),
});
export type ApiEnv = z.infer<typeof apiEnvSchema>;
export const webEnvSchema = z.object({
  API_URL: z
    .url()
    .refine(
      (value) =>
        URL.canParse(value) &&
        ['http:', 'https:'].includes(new URL(value).protocol),
    ),
});
