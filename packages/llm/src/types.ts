import type { z } from 'zod';
export type Usage = 'examiner' | 'tutor' | 'content-generation';
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
export interface Request {
  messages: readonly Message[];
  operation?: string;
}
export interface LlmClient {
  readonly model: string;
  generateText(request: Request): Promise<string>;
  generateStructured<T>(request: Request, schema: z.ZodType<T>): Promise<T>;
  stream(request: Request): AsyncGenerator<string>;
}
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}
export interface Completion {
  text: string;
  tokens: TokenUsage | null;
}
export type StreamEvent = { text: string } | { tokens: TokenUsage };
export interface Adapter {
  complete(
    request: Request,
    jsonSchema?: Record<string, unknown>,
  ): Promise<Completion>;
  stream(request: Request): AsyncGenerator<StreamEvent>;
}
export interface CallMetric {
  usage: Usage;
  model: string;
  durationMs: number;
  tokens: TokenUsage | null;
  estimatedCostUsd: number | null;
  status: 'ok' | 'error' | 'cancelled';
}
export type MetricLogger = (metric: CallMetric) => void;
// Reserved contracts only. No voice implementation in this foundation.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SpeechToText {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TextToSpeech {}
