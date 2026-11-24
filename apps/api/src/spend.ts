import { HttpStatus } from '@nestjs/common';
import type { PrismaClient } from '@kompri/db';
import type { CallMetric, MetricLogger } from '@kompri/llm';
import { ApiException } from './errors.ts';
import type { Settings } from './context.ts';

/** Calendar month in UTC, e.g. `2026-11`. */
export const monthOf = (at: Date) => at.toISOString().slice(0, 7);

/** Adds the estimated cost of one call to its month. Free calls are not stored. */
export async function recordSpend(
  db: PrismaClient,
  metric: Pick<CallMetric, 'estimatedCostUsd'>,
  at: Date,
) {
  const cost = metric.estimatedCostUsd;
  if (!cost || cost <= 0) return;
  const month = monthOf(at);
  await db.llmMonthlySpend.upsert({
    where: { month },
    create: { month, costUsd: cost, calls: 1 },
    update: { costUsd: { increment: cost }, calls: { increment: 1 } },
  });
}

/** Logs every call as JSON, then records its cost without blocking the caller. */
export function spendLogger(
  db: PrismaClient,
  clock: () => Date = () => new Date(),
): MetricLogger {
  return (metric) => {
    console.info(JSON.stringify(metric));
    recordSpend(db, metric, clock()).catch(() =>
      console.error(
        JSON.stringify({ level: 'error', msg: 'llm_spend_not_recorded' }),
      ),
    );
  };
}

export async function monthlySpend(db: PrismaClient, now: Date) {
  const row = await db.llmMonthlySpend.findUnique({
    where: { month: monthOf(now) },
  });
  return row ? Number(row.costUsd) : 0;
}

/**
 * Refuses new model work once the month's budget is spent. It guards the start
 * of an oral and each tutor message: an oral already started always finishes,
 * so the overshoot is bounded by the orals in progress.
 */
export async function assertBudget(
  db: PrismaClient,
  settings: Pick<Settings, 'LLM_MONTHLY_BUDGET_USD'>,
  now: Date,
) {
  const budget = settings.LLM_MONTHLY_BUDGET_USD;
  if (budget === undefined) return;
  if ((await monthlySpend(db, now)) >= budget)
    throw new ApiException(
      HttpStatus.SERVICE_UNAVAILABLE,
      'llm_budget_exhausted',
      'The monthly AI budget is spent; this resumes next month',
    );
}
