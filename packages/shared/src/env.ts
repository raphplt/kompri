import { config } from 'dotenv';
import { z } from 'zod';
export function loadEnvironment() {
  config({ path: new URL('../../../.env', import.meta.url), quiet: true });
}
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
export const apiEnvSchema = databaseEnvSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65535),
});
export const webEnvSchema = z.object({
  API_URL: z
    .url()
    .refine(
      (value) =>
        URL.canParse(value) &&
        ['http:', 'https:'].includes(new URL(value).protocol),
    ),
});
