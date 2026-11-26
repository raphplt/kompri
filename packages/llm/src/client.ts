import { toStrictJsonSchema } from './schema.ts';
import type {
  Adapter,
  CallMetric,
  LlmClient,
  MetricLogger,
  Request,
  TokenUsage,
  Usage,
} from './types.ts';
/**
 * Whether a failed non-streaming call is worth another attempt: overloads,
 * rate limits, server and network errors, and unusable output. A refusal, a
 * truncated answer, a timeout or a client error (4xx other than 408, 409 and
 * 429) would fail the same way or keep the learner waiting too long.
 */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  if (/refused|truncated/i.test(error.message)) return false;
  if (
    ['TimeoutError', 'AbortError', 'APIConnectionTimeoutError'].includes(
      error.name,
    )
  )
    return false;
  const status =
    'status' in error && typeof error.status === 'number'
      ? error.status
      : Number(/HTTP (\d{3})/.exec(error.message)?.[1] ?? NaN);
  return !(status >= 400 && status < 500 && ![408, 409, 429].includes(status));
}

export function createClient(options: {
  adapter: Adapter;
  usage: Usage;
  model: string;
  inputRate: number;
  outputRate: number;
  log: MetricLogger;
  /** Extra attempts for retryable failures of non-streaming calls (default 0). */
  maxRetries?: number;
  /** Pause before each retry; the last value repeats. */
  retryDelaysMs?: number[];
  sleep?: (ms: number) => Promise<void>;
}): LlmClient {
  const maxRetries = options.maxRetries ?? 0;
  const delays = options.retryDelaysMs ?? [1000, 3000];
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
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
    for (let attempt = 0; ; attempt++) {
      let failure: unknown;
      try {
        return await attemptOnce(request, parse, jsonSchema);
      } catch (error) {
        failure = error;
      }
      // Provider errors may quote personal data: they are never propagated.
      if (attempt >= maxRetries || !isRetryable(failure))
        throw new Error('LLM call failed or returned an invalid response');
      await sleep(delays[Math.min(attempt, delays.length - 1)] ?? 0);
    }
  };
  const attemptOnce = async <T>(
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
        toStrictJsonSchema(schema),
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
