import { z } from 'zod';
import type {
  Adapter,
  CallMetric,
  LlmClient,
  MetricLogger,
  Request,
  TokenUsage,
  Usage,
} from './types.ts';
export function createClient(options: {
  adapter: Adapter;
  usage: Usage;
  model: string;
  inputRate: number;
  outputRate: number;
  log: MetricLogger;
}): LlmClient {
  const { adapter, usage, model, log } = options;
  const report = (
    start: number,
    tokens: TokenUsage | null,
    status: CallMetric['status'],
  ) => {
    log({
      usage,
      model,
      durationMs: Math.max(0, performance.now() - start),
      tokens,
      estimatedCostUsd: tokens
        ? (tokens.inputTokens * options.inputRate +
            tokens.outputTokens * options.outputRate) /
          1_000_000
        : null,
      status,
    });
  };
  const run = async <T>(
    request: Request,
    parse: (text: string) => T,
    jsonSchema?: Record<string, unknown>,
  ): Promise<T> => {
    const start = performance.now();
    let tokens: TokenUsage | null = null;
    let status: CallMetric['status'] = 'error';
    try {
      const result = await adapter.complete(request, jsonSchema);
      tokens = result.tokens;
      const output = parse(result.text);
      status = 'ok';
      return output;
    } catch {
      throw new Error('LLM call failed or returned an invalid response');
    } finally {
      report(start, tokens, status);
    }
  };
  return {
    model,
    generateText: (request) => run(request, (text) => text),
    generateStructured: (request, schema) =>
      run(
        request,
        (text) => schema.parse(JSON.parse(text)),
        z.toJSONSchema(schema),
      ),
    async *stream(request) {
      const start = performance.now();
      let tokens: TokenUsage | null = null;
      let status: CallMetric['status'] = 'cancelled';
      try {
        for await (const event of adapter.stream(request)) {
          if ('text' in event) yield event.text;
          else tokens = event.tokens;
        }
        status = 'ok';
      } catch {
        status = 'error';
        throw new Error('LLM stream failed');
      } finally {
        report(start, tokens, status);
      }
    },
  };
}
