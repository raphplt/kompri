import type { ApiEnv } from '@kompri/shared/env';
import type { LlmClient } from '@kompri/llm';

export const DATABASE = Symbol('DATABASE');
export const SETTINGS = Symbol('SETTINGS');
export const EXAMINER = Symbol('EXAMINER');
export const CLOCK = Symbol('CLOCK');
export const TUTOR = Symbol('TUTOR');
export const MAILER = Symbol('MAILER');

export type Settings = Pick<
  ApiEnv,
  | 'ORAL_QUESTION_COUNT'
  | 'ORAL_ANSWER_SECONDS'
  | 'ORAL_LIMIT_PER_WINDOW'
  | 'ORAL_WINDOW_HOURS'
  | 'VALIDATION_DAYS'
  | 'SESSION_DAYS'
  | 'TUTOR_LIMIT_PER_WINDOW'
  | 'TUTOR_WINDOW_HOURS'
  | 'WEB_URL'
  | 'REQUIRE_EMAIL_VERIFICATION'
  | 'REVIEW_WINDOW_DAYS'
  | 'REMINDER_DAYS'
  | 'LLM_MONTHLY_BUDGET_USD'
  | 'LLM_ORAL_RESERVE_USD'
  | 'AUTH_LOGIN_LIMIT'
  | 'AUTH_SIGNUP_LIMIT'
  | 'AUTH_MAIL_LIMIT'
>;
export const defaultSettings: Settings = {
  ORAL_QUESTION_COUNT: 3,
  ORAL_ANSWER_SECONDS: 240,
  ORAL_LIMIT_PER_WINDOW: 5,
  ORAL_WINDOW_HOURS: 24,
  VALIDATION_DAYS: 180,
  SESSION_DAYS: 30,
  TUTOR_LIMIT_PER_WINDOW: 60,
  TUTOR_WINDOW_HOURS: 24,
  WEB_URL: 'http://localhost:3000',
  REQUIRE_EMAIL_VERIFICATION: true,
  REVIEW_WINDOW_DAYS: 30,
  REMINDER_DAYS: 14,
  LLM_ORAL_RESERVE_USD: 0.1,
  AUTH_LOGIN_LIMIT: 20,
  AUTH_SIGNUP_LIMIT: 10,
  AUTH_MAIL_LIMIT: 10,
};

export interface Examiner {
  provider: string;
  client: LlmClient;
}

export type Clock = () => Date;

export const hours = (count: number) => count * 60 * 60 * 1000;
export const days = (count: number) => count * 24 * hours(1);
