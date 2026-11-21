import Anthropic from '@anthropic-ai/sdk';
import type { Adapter, Request, TokenUsage } from './types.ts';

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Server-side fallback on a policy refusal; "default" lets the API choose. */
  fallbacks?: 'default' | 'none';
  maxTokens?: number;
}

const fallbackBeta = 'server-side-fallback-2026-07-01';

function split(request: Request) {
  const system = request.messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const messages = request.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  return { system, messages };
}

const tokens = (usage: {
  input_tokens: number;
  output_tokens: number;
}): TokenUsage => ({
  inputTokens: usage.input_tokens,
  outputTokens: usage.output_tokens,
});

/**
 * Claude through the official SDK. `transport` replaces fetch so that the
 * contract tests never reach the network.
 */
export function createAnthropicAdapter(
  config: AnthropicConfig,
  transport?: typeof fetch,
): Adapter {
  const client = new Anthropic({
    apiKey: config.apiKey,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    timeout: config.timeoutMs ?? 60_000,
    // The application decides when to retry an oral step.
    maxRetries: 0,
    ...(transport ? { fetch: transport } : {}),
  });
  const base = (request: Request) => {
    const { system, messages } = split(request);
    return {
      model: config.model,
      max_tokens: config.maxTokens ?? 16_000,
      ...(system ? { system } : {}),
      messages,
      ...(config.fallbacks === 'none'
        ? {}
        : { betas: [fallbackBeta], fallbacks: 'default' as const }),
    };
  };
  return {
    async complete(request, jsonSchema) {
      const message = await client.beta.messages.create({
        ...base(request),
        ...(jsonSchema
          ? {
              output_config: {
                format: { type: 'json_schema', schema: jsonSchema },
              },
            }
          : {}),
      });
      // A refusal or a truncated answer is not a usable completion.
      if (message.stop_reason === 'refusal')
        throw new Error('Provider refused the request');
      if (message.stop_reason === 'max_tokens')
        throw new Error('Provider output was truncated');
      const text = message.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('');
      return { text, tokens: tokens(message.usage) };
    },
    async *stream(request) {
      const stream = client.beta.messages.stream(base(request));
      for await (const event of stream)
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        )
          yield { text: event.delta.text };
      const message = await stream.finalMessage();
      if (message.stop_reason === 'refusal')
        throw new Error('Provider refused the request');
      yield { tokens: tokens(message.usage) };
    },
  };
}
