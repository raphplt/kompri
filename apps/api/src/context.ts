import type { ApiEnv } from '@kompri/shared/env';
import type { LlmClient } from '@kompri/llm';

export const DATABASE = Symbol('DATABASE');
export const SETTINGS = Symbol('SETTINGS');
export const EXAMINER = Symbol('EXAMINER');
export const CLOCK = Symbol('CLOCK');

export type Settings = Pick<
  ApiEnv,
  | 'ORAL_QUESTION_COUNT'
  | 'ORAL_ANSWER_SECONDS'
  | 'ORAL_LIMIT_PER_WINDOW'
  | 'ORAL_WINDOW_HOURS'
  | 'VALIDATION_DAYS'
  | 'SESSION_DAYS'
>;
export const defaultSettings: Settings = {
  ORAL_QUESTION_COUNT: 3,
  ORAL_ANSWER_SECONDS: 240,
  ORAL_LIMIT_PER_WINDOW: 5,
  ORAL_WINDOW_HOURS: 24,
  VALIDATION_DAYS: 180,
  SESSION_DAYS: 30,
};

export interface Examiner {
  provider: string;
  client: LlmClient;
}

export type Clock = () => Date;

export const hours = (count: number) => count * 60 * 60 * 1000;
export const days = (count: number) => count * 24 * hours(1);
