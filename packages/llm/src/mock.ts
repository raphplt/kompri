import type { Adapter, Request } from './types.ts';
export type MockResponder = (request: Request) => unknown;
export function createMockAdapter(
  respond: MockResponder = () => 'Deterministic mock response',
): Adapter {
  const complete = async (request: Request) => {
    const value = respond(request);
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return { text, tokens: { inputTokens: 0, outputTokens: 0 } };
  };
  return {
    complete,
    async *stream(request) {
      const result = await complete(request);
      yield { text: result.text };
      yield { tokens: result.tokens };
    },
  };
}
