import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createAnthropicAdapter,
  createRegistry,
  toStrictJsonSchema,
  UnusableCompletionError,
} from './index.ts';
import type { CallMetric } from './index.ts';

const mockEnv = {
  LLM_EXAMINER_PROVIDER: 'mock',
  LLM_TUTOR_PROVIDER: 'mock',
  LLM_CONTENT_GENERATION_PROVIDER: 'mock',
};
const request = {
  messages: [
    { role: 'system' as const, content: 'Rules' },
    { role: 'user' as const, content: '{"submission":"x"}' },
  ],
};

interface Captured {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
}
function capture(response: () => Response) {
  const calls: Captured[] = [];
  const transport = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = input instanceof Request ? input.url : String(input);
    calls.push({
      url,
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return response();
  }) as typeof fetch;
  return { calls, transport };
}

const chatResponse = () =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: '{"answer":42}' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

/** A complete Claude answer, served as the event stream the SDK reads. */
const claudeMessage = ({
  stop_reason = 'end_turn',
  text = '{"answer":42}',
}: { stop_reason?: string; text?: string } = {}) =>
  new Response(
    [
      [
        'message_start',
        {
          type: 'message_start',
          message: {
            id: 'msg_test',
            type: 'message',
            role: 'assistant',
            model: 'claude-opus-5-5',
            content: [],
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: 100, output_tokens: 0 },
          },
        },
      ],
      [
        'content_block_start',
        {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' },
        },
      ],
      [
        'content_block_delta',
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text },
        },
      ],
      ['content_block_stop', { type: 'content_block_stop', index: 0 }],
      [
        'message_delta',
        {
          type: 'message_delta',
          delta: { stop_reason, stop_sequence: null },
          usage: { output_tokens: 20 },
        },
      ],
      ['message_stop', { type: 'message_stop' }],
    ]
      .map(
        ([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
      )
      .join(''),
    { headers: { 'Content-Type': 'text/event-stream' } },
  );

describe('strict JSON schema', () => {
  it('closes objects, requires every key and drops unsupported keywords', () => {
    const schema = toStrictJsonSchema(
      z.object({
        questions: z.array(z.string().min(1).max(10)).length(2),
        nested: z.object({ score: z.number().int().min(0) }),
      }),
    );
    expect(schema).toEqual({
      type: 'object',
      properties: {
        questions: { type: 'array', items: { type: 'string' } },
        nested: {
          type: 'object',
          properties: { score: { type: 'integer' } },
          additionalProperties: false,
          required: ['score'],
        },
      },
      additionalProperties: false,
      required: ['questions', 'nested'],
    });
  });
});

describe('provider presets', () => {
  it.each([
    ['mistral', 'MISTRAL', 'https://api.mistral.ai/v1/chat/completions'],
    ['openai', 'OPENAI', 'https://api.openai.com/v1/chat/completions'],
    [
      'gemini',
      'GEMINI',
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    ],
  ])(
    'routes %s to its endpoint with its own key',
    async (provider, prefix, url) => {
      const { calls, transport } = capture(chatResponse);
      const client = createRegistry(
        {
          ...mockEnv,
          LLM_EXAMINER_PROVIDER: provider,
          LLM_EXAMINER_MODEL: 'some-model',
          LLM_EXAMINER_INPUT_USD_PER_MILLION: '1',
          LLM_EXAMINER_OUTPUT_USD_PER_MILLION: '2',
          [`${prefix}_API_KEY`]: 'provider-key',
        },
        () => {},
        undefined,
        transport,
      ).forUsage('examiner');
      expect(
        await client.generateStructured(
          request,
          z.object({ answer: z.number() }),
        ),
      ).toEqual({ answer: 42 });
      expect(calls[0]!.url).toBe(url);
      expect(calls[0]!.headers.get('authorization')).toBe(
        'Bearer provider-key',
      );
      expect(calls[0]!.body.model).toBe('some-model');
      expect(calls[0]!.body.temperature).toBe(
        provider === 'openai' ? undefined : 0,
      );
    },
  );

  it('serves a local Ollama model over loopback HTTP without key or rates', async () => {
    const { calls, transport } = capture(chatResponse);
    const client = createRegistry(
      { ...mockEnv, LLM_TUTOR_PROVIDER: 'ollama', LLM_TUTOR_MODEL: 'local' },
      () => {},
      undefined,
      transport,
    ).forUsage('tutor');
    await client.generateText(request);
    expect(calls[0]!.url).toBe('http://127.0.0.1:11434/v1/chat/completions');
    expect(calls[0]!.headers.get('authorization')).toBeNull();
  });

  it('refuses plain HTTP to a remote host and missing keys', () => {
    const base = {
      ...mockEnv,
      LLM_EXAMINER_MODEL: 'm',
      LLM_EXAMINER_INPUT_USD_PER_MILLION: '1',
      LLM_EXAMINER_OUTPUT_USD_PER_MILLION: '1',
    };
    expect(() =>
      createRegistry({
        ...base,
        LLM_EXAMINER_PROVIDER: 'openai-compatible',
        OPENAI_COMPATIBLE_BASE_URL: 'http://models.example.com/v1',
      }),
    ).toThrow('baseUrl');
    expect(() =>
      createRegistry({ ...base, LLM_EXAMINER_PROVIDER: 'anthropic' }),
    ).toThrow('apiKey');
    expect(() =>
      createRegistry({ ...base, LLM_EXAMINER_PROVIDER: 'unknown' }),
    ).toThrow('provider');
  });
});

describe('Anthropic adapter', () => {
  it('sends system separately, a JSON schema format and the fallback beta', async () => {
    const { calls, transport } = capture(() => claudeMessage());
    const adapter = createAnthropicAdapter(
      { apiKey: 'secret', model: 'claude-opus-5-5' },
      transport,
    );
    const result = await adapter.complete(request, { type: 'object' });
    expect(result).toEqual({
      text: '{"answer":42}',
      tokens: { inputTokens: 100, outputTokens: 20 },
    });
    const call = calls[0]!;
    expect(call.url).toBe('https://api.anthropic.com/v1/messages');
    expect(call.headers.get('authorization')).toBe('Bearer secret');
    expect(call.headers.get('anthropic-version')).toBeTruthy();
    expect(call.headers.get('anthropic-beta')).toBe(
      'server-side-fallback-2026-07-01',
    );
    expect(call.body).toMatchObject({
      model: 'claude-opus-5-5',
      system: 'Rules',
      messages: [{ role: 'user', content: '{"submission":"x"}' }],
      fallbacks: 'default',
      max_tokens: 32_000,
      stream: true,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: { type: 'object' } },
      },
    });
    expect(call.body).not.toHaveProperty('temperature');
    expect(call.body).not.toHaveProperty('thinking');
  });

  it('treats refusals and truncation as failures that keep their usage', async () => {
    for (const stop_reason of ['refusal', 'max_tokens']) {
      const { transport } = capture(() => claudeMessage({ stop_reason }));
      const failure = await createAnthropicAdapter(
        { apiKey: 's', model: 'm' },
        transport,
      )
        .complete(request)
        .catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(UnusableCompletionError);
      expect((failure as UnusableCompletionError).tokens).toEqual({
        inputTokens: 100,
        outputTokens: 20,
      });
    }
  });

  it('counts the spend of a truncated grading and does not retry it', async () => {
    const { calls, transport } = capture(() =>
      claudeMessage({ stop_reason: 'max_tokens' }),
    );
    const metrics: CallMetric[] = [];
    const client = createRegistry(
      {
        ...mockEnv,
        LLM_EXAMINER_PROVIDER: 'anthropic',
        LLM_EXAMINER_MODEL: 'claude-sonnet-5-5',
        LLM_EXAMINER_INPUT_USD_PER_MILLION: '2',
        LLM_EXAMINER_OUTPUT_USD_PER_MILLION: '10',
        ANTHROPIC_API_KEY: 'secret',
        ANTHROPIC_EFFORT: 'low',
      },
      (m) => metrics.push(m),
      undefined,
      transport,
    ).forUsage('examiner');
    await expect(client.generateText(request)).rejects.toThrow(
      'LLM call failed',
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body.output_config).toEqual({ effort: 'low' });
    expect(metrics[0]).toMatchObject({
      status: 'error',
      estimatedCostUsd: 0.0004,
    });
  });

  it('streams text deltas and final usage', async () => {
    const events = [
      [
        'message_start',
        {
          type: 'message_start',
          message: {
            id: 'msg',
            type: 'message',
            role: 'assistant',
            model: 'm',
            content: [],
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: 7, output_tokens: 0 },
          },
        },
      ],
      [
        'content_block_start',
        {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' },
        },
      ],
      [
        'content_block_delta',
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'Bon' },
        },
      ],
      [
        'content_block_delta',
        {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'jour' },
        },
      ],
      ['content_block_stop', { type: 'content_block_stop', index: 0 }],
      [
        'message_delta',
        {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', stop_sequence: null },
          usage: { output_tokens: 3 },
        },
      ],
      ['message_stop', { type: 'message_stop' }],
    ] as const;
    const body = events
      .map(
        ([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
      )
      .join('');
    const { calls, transport } = capture(
      () =>
        new Response(body, {
          headers: { 'Content-Type': 'text/event-stream' },
        }),
    );
    const output = [];
    for await (const event of createAnthropicAdapter(
      { apiKey: 's', model: 'm', fallbacks: 'none' },
      transport,
    ).stream(request))
      output.push(event);
    expect(output).toEqual([
      { text: 'Bon' },
      { text: 'jour' },
      { tokens: { inputTokens: 7, outputTokens: 3 } },
    ]);
    expect(calls[0]!.body.stream).toBe(true);
    expect(calls[0]!.body).not.toHaveProperty('fallbacks');
  });
});
