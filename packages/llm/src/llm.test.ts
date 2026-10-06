import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createClient, createMockAdapter, createRegistry } from './index.ts';
import type { CallMetric } from './index.ts';
import { createMistralAdapter } from './mistral.ts';
const request = {
  messages: [{ role: 'user' as const, content: 'private submission' }],
};
const env = {
  LLM_EXAMINER_PROVIDER: 'mock',
  LLM_TUTOR_PROVIDER: 'mock',
  LLM_CONTENT_GENERATION_PROVIDER: 'mock',
};
describe('LLM contracts', () => {
  it('validates structured output and logs only metadata once per call', async () => {
    const metrics: CallMetric[] = [];
    const client = createRegistry(
      env,
      (m) => metrics.push(m),
      () => ({ answer: 42 }),
    ).forUsage('examiner');
    expect(
      await client.generateStructured(
        request,
        z.object({ answer: z.number() }),
      ),
    ).toEqual({ answer: 42 });
    await expect(
      client.generateStructured(request, z.object({ answer: z.string() })),
    ).rejects.toThrow('invalid response');
    expect(metrics.map((m) => m.status)).toEqual(['ok', 'error']);
    expect(JSON.stringify(metrics)).not.toContain('private');
    expect(JSON.stringify(metrics)).not.toContain('answer');
  });
  it('supports deterministic text and streaming', async () => {
    const client = createRegistry(
      env,
      () => {},
      () => 'hello',
    ).forUsage('tutor');
    expect(await client.generateText(request)).toBe('hello');
    let output = '';
    for await (const chunk of client.stream(request)) output += chunk;
    expect(output).toBe('hello');
  });
  it('rejects missing provider configuration and live access in CI', () => {
    expect(() => createRegistry({})).toThrow('provider');
    expect(() =>
      createRegistry({
        ...env,
        CI: 'true',
        LLM_EXAMINER_PROVIDER: 'mistral',
        LLM_EXAMINER_MODEL: 'example',
        LLM_BASE_URL: 'https://example.test/v1',
        LLM_API_KEY: 'secret',
        LLM_EXAMINER_INPUT_USD_PER_MILLION: '1',
        LLM_EXAMINER_OUTPUT_USD_PER_MILLION: '2',
      }),
    ).toThrow('disabled');
  });
  it('redacts provider failures', async () => {
    const metrics: CallMetric[] = [];
    const client = createClient({
      adapter: {
        ...createMockAdapter(),
        complete: async () => {
          throw new Error('private submission');
        },
      },
      usage: 'examiner',
      model: 'fake',
      inputRate: 1,
      outputRate: 2,
      log: (m) => metrics.push(m),
    });
    await expect(client.generateText(request)).rejects.toThrow(
      'LLM call failed',
    );
    expect(JSON.stringify(metrics)).not.toContain('private');
    expect(metrics[0]?.estimatedCostUsd).toBeNull();
  });
  it('sends a JSON schema and measures token cost with a mocked HTTP transport', async () => {
    let body = '';
    const metrics: CallMetric[] = [];
    const adapter = createMistralAdapter(
      {
        baseUrl: 'https://example.test/v1',
        apiKey: 'secret',
        model: 'example',
      },
      async (_url, init) => {
        body = String(init?.body);
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"answer":42}' } }],
            usage: { prompt_tokens: 100, completion_tokens: 50 },
          }),
        );
      },
    );
    const client = createClient({
      adapter,
      usage: 'examiner',
      model: 'example',
      inputRate: 1,
      outputRate: 2,
      log: (m) => metrics.push(m),
    });
    expect(
      await client.generateStructured(
        request,
        z.object({ answer: z.number() }),
      ),
    ).toEqual({ answer: 42 });
    expect(JSON.parse(body).response_format.type).toBe('json_schema');
    expect(metrics[0]?.estimatedCostUsd).toBe(0.0002);
  });
  it('decodes fragmented SSE and UTF-8, including token usage', async () => {
    const text =
      'data: {"choices":[{"delta":{"content":"été"}}]}\r\n\r\ndata: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2}}\n\ndata: [DONE]\n\n';
    const bytes = new TextEncoder().encode(text);
    const adapter = createMistralAdapter(
      { baseUrl: 'https://example.test', apiKey: 'secret', model: 'example' },
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              for (const byte of bytes)
                controller.enqueue(new Uint8Array([byte]));
              controller.close();
            },
          }),
        ),
    );
    const events = [];
    for await (const event of adapter.stream(request)) events.push(event);
    expect(events).toEqual([
      { text: 'été' },
      { tokens: { inputTokens: 1, outputTokens: 2 } },
    ]);
  });
});
