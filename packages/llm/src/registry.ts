import { z } from 'zod';
import { parseEnvironment } from '@kompri/shared/env';
import { createClient } from './client.ts';
import { createMockAdapter } from './mock.ts';
import type { MockResponder } from './mock.ts';
import { createMistralAdapter } from './mistral.ts';
import type { MetricLogger, Usage } from './types.ts';
const configSchema = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('mock') }),
  z.object({
    provider: z.literal('mistral'),
    model: z.string().min(1),
    baseUrl: z
      .url()
      .refine((url) => URL.canParse(url) && new URL(url).protocol === 'https:'),
    apiKey: z.string().min(1),
    inputRate: z.coerce.number().nonnegative(),
    outputRate: z.coerce.number().nonnegative(),
  }),
]);
export function createRegistry(
  env: Record<string, string | undefined>,
  log: MetricLogger = (metric) => console.info(JSON.stringify(metric)),
  respond?: MockResponder,
) {
  const entries = (['examiner', 'tutor', 'content-generation'] as const).map(
    (usage) => {
      const prefix = `LLM_${usage.replaceAll('-', '_').toUpperCase()}`;
      const config = parseEnvironment(configSchema, {
        provider: env[`${prefix}_PROVIDER`],
        model: env[`${prefix}_MODEL`],
        baseUrl: env.LLM_BASE_URL,
        apiKey: env.LLM_API_KEY,
        inputRate: env[`${prefix}_INPUT_USD_PER_MILLION`],
        outputRate: env[`${prefix}_OUTPUT_USD_PER_MILLION`],
      });
      if ((env.CI || env.NODE_ENV === 'test') && config.provider !== 'mock')
        throw new Error('Live LLM providers are disabled in tests and CI');
      return [
        usage,
        createClient({
          usage,
          log,
          model: config.provider === 'mock' ? 'mock-v1' : config.model,
          adapter:
            config.provider === 'mock'
              ? createMockAdapter(respond)
              : createMistralAdapter(config),
          inputRate: config.provider === 'mock' ? 0 : config.inputRate,
          outputRate: config.provider === 'mock' ? 0 : config.outputRate,
        }),
      ] as const;
    },
  );
  const clients = new Map(entries);
  return {
    forUsage(usage: Usage) {
      return clients.get(usage)!;
    },
  };
}
