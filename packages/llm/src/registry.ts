import { z } from 'zod';
import { parseEnvironment } from '@kompri/shared/env';
import { createAnthropicAdapter } from './anthropic.ts';
import { createClient } from './client.ts';
import { createMockAdapter } from './mock.ts';
import type { MockResponder } from './mock.ts';
import { createOpenAiCompatibleAdapter } from './openai-compatible.ts';
import type { Adapter, MetricLogger, Usage } from './types.ts';

export const providers = [
  'mock',
  'mistral',
  'openai',
  'gemini',
  'anthropic',
  'ollama',
  'openai-compatible',
] as const;
export type Provider = (typeof providers)[number];

interface Preset {
  protocol: 'openai' | 'anthropic';
  /** Prefix of the provider-specific variables, e.g. MISTRAL_API_KEY. */
  prefix: string;
  baseUrl?: string;
  keyRequired: boolean;
  /** Local servers are free: rates default to zero. */
  local?: boolean;
  streamUsage?: boolean;
  temperature?: number;
}

export const presets: Record<Exclude<Provider, 'mock'>, Preset> = {
  mistral: {
    protocol: 'openai',
    prefix: 'MISTRAL',
    baseUrl: 'https://api.mistral.ai/v1',
    keyRequired: true,
    temperature: 0,
  },
  openai: {
    protocol: 'openai',
    prefix: 'OPENAI',
    baseUrl: 'https://api.openai.com/v1',
    keyRequired: true,
    streamUsage: true,
  },
  gemini: {
    protocol: 'openai',
    prefix: 'GEMINI',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyRequired: true,
    streamUsage: true,
    temperature: 0,
  },
  anthropic: {
    protocol: 'anthropic',
    prefix: 'ANTHROPIC',
    keyRequired: true,
  },
  ollama: {
    protocol: 'openai',
    prefix: 'OLLAMA',
    baseUrl: 'http://127.0.0.1:11434/v1',
    keyRequired: false,
    local: true,
    temperature: 0,
  },
  'openai-compatible': {
    protocol: 'openai',
    prefix: 'OPENAI_COMPATIBLE',
    keyRequired: false,
    temperature: 0,
  },
};

const loopback = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
// HTTPS is mandatory except for a model served on this machine.
const endpointSchema = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    url.protocol === 'https:' ||
    (url.protocol === 'http:' && loopback.has(url.hostname))
  );
}, 'HTTPS required outside loopback');

const rateSchema = z.coerce.number().nonnegative();

export function createRegistry(
  env: Record<string, string | undefined>,
  log: MetricLogger = (metric) => console.info(JSON.stringify(metric)),
  respond?: MockResponder,
  /** Replaces fetch for contract tests; production uses the global fetch. */
  transport?: typeof fetch,
) {
  const timeoutMs =
    parseEnvironment(
      z.object({
        LLM_TIMEOUT_SECONDS: z.coerce
          .number()
          .int()
          .min(5)
          .max(600)
          .default(60),
      }),
      env,
    ).LLM_TIMEOUT_SECONDS * 1000;
  const maxRetries = parseEnvironment(
    z.object({
      LLM_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    }),
    env,
  ).LLM_MAX_RETRIES;
  const entries = (['examiner', 'tutor', 'content-generation'] as const).map(
    (usage) => {
      const prefix = `LLM_${usage.replaceAll('-', '_').toUpperCase()}`;
      const { provider } = parseEnvironment(
        z.object({ provider: z.enum(providers) }),
        { provider: env[`${prefix}_PROVIDER`] },
      );
      if (provider === 'mock')
        return [
          usage,
          createClient({
            usage,
            log,
            model: 'mock-v1',
            adapter: createMockAdapter(respond),
            inputRate: 0,
            outputRate: 0,
          }),
        ] as const;
      if (env.CI || env.NODE_ENV === 'test')
        throw new Error('Live LLM providers are disabled in tests and CI');
      const preset = presets[provider];
      const rate = preset.local ? rateSchema.default(0) : rateSchema;
      const config = parseEnvironment(
        z.object({
          model: z.string().min(1),
          baseUrl: preset.baseUrl ? endpointSchema.optional() : endpointSchema,
          apiKey: preset.keyRequired
            ? z.string().min(1)
            : z.string().min(1).optional(),
          inputRate: rate,
          outputRate: rate,
        }),
        {
          model: env[`${prefix}_MODEL`],
          // Provider-specific variables win over the generic LLM_* ones.
          baseUrl: env[`${preset.prefix}_BASE_URL`] ?? env.LLM_BASE_URL,
          apiKey: env[`${preset.prefix}_API_KEY`] ?? env.LLM_API_KEY,
          inputRate: env[`${prefix}_INPUT_USD_PER_MILLION`],
          outputRate: env[`${prefix}_OUTPUT_USD_PER_MILLION`],
        },
      );
      const baseUrl = config.baseUrl ?? preset.baseUrl;
      const adapter: Adapter =
        preset.protocol === 'anthropic'
          ? createAnthropicAdapter(
              {
                apiKey: config.apiKey!,
                model: config.model,
                timeoutMs,
                ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
                fallbacks:
                  env.ANTHROPIC_FALLBACKS === 'none' ? 'none' : 'default',
              },
              transport,
            )
          : createOpenAiCompatibleAdapter(
              {
                baseUrl: baseUrl!,
                model: config.model,
                timeoutMs,
                ...(config.apiKey ? { apiKey: config.apiKey } : {}),
                ...(preset.streamUsage ? { streamUsage: true } : {}),
                ...(preset.temperature === undefined
                  ? {}
                  : { temperature: preset.temperature }),
              },
              transport,
            );
      return [
        usage,
        createClient({
          usage,
          log,
          model: config.model,
          adapter,
          inputRate: config.inputRate,
          outputRate: config.outputRate,
          maxRetries,
        }),
      ] as const;
    },
  );
  const clients = new Map(entries);
  const configured = Object.fromEntries(
    (['examiner', 'tutor', 'content-generation'] as const).map((usage) => [
      usage,
      env[
        `LLM_${usage.replaceAll('-', '_').toUpperCase()}_PROVIDER`
      ] as Provider,
    ]),
  ) as Record<Usage, Provider>;
  return {
    forUsage(usage: Usage) {
      return clients.get(usage)!;
    },
    providerFor(usage: Usage): Provider {
      return configured[usage];
    },
  };
}
