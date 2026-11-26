import Anthropic from '@anthropic-ai/sdk';
import { UnusableCompletionError } from './types.ts';
import type { Adapter, Request, TokenUsage } from './types.ts';

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Server-side fallback on a policy refusal; "default" lets the API choose. */
  fallbacks?: 'default' | 'none';
  /** Output ceiling, thinking included (default 32 000). */
  maxTokens?: number;
  /** Thinking depth; set explicitly because defaults differ between models. */
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
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
      max_tokens: config.maxTokens ?? 32_000,
      ...(system ? { system } : {}),
      messages,
      ...(config.fallbacks === 'none'
        ? {}
        : { betas: [fallbackBeta], fallbacks: 'default' as const }),
    };
  };
  return {
    async complete(request, jsonSchema) {
      // Streamed so that a large output ceiling never hits an HTTP timeout.
      const message = await client.beta.messages
        .stream({
          ...base(request),
          output_config: {
            effort: config.effort ?? 'medium',
            ...(jsonSchema
              ? { format: { type: 'json_schema', schema: jsonSchema } }
              : {}),
          },
        })
        .finalMessage();
      // A refusal or a truncated answer is billed but not usable.
      if (message.stop_reason === 'refusal')
        throw new UnusableCompletionError(
          'Provider refused the request',
          tokens(message.usage),
        );
      if (message.stop_reason === 'max_tokens')
        throw new UnusableCompletionError(
          'Provider output was truncated',
          tokens(message.usage),
        );
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
        throw new UnusableCompletionError(
          'Provider refused the request',
          tokens(message.usage),
        );
      yield { tokens: tokens(message.usage) };
    },
  };
}
