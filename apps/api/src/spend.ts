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

type SpendDb = Pick<PrismaClient, 'llmMonthlySpend' | 'oralSession'>;

export async function monthlySpend(db: SpendDb, now: Date) {
  const row = await db.llmMonthlySpend.findUnique({
    where: { month: monthOf(now) },
  });
  return row ? Number(row.costUsd) : 0;
}

/** Estimated cost reserved for one tutor message. */
export const tutorReserveUsd = 0.01;

/**
 * Refuses new model work when the month's spend, plus a reserve for every
 * oral in progress and for the new work, would exceed the budget. Orals in
 * progress always finish: their reserve keeps room for them. Starting an oral
 * calls it under a global lock, in the transaction that creates the oral, so
 * concurrent starts cannot all pass on the same remaining budget.
 */
export async function assertBudget(
  db: SpendDb,
  settings: Pick<Settings, 'LLM_MONTHLY_BUDGET_USD' | 'LLM_ORAL_RESERVE_USD'>,
  now: Date,
  work: 'oral' | 'tutor',
) {
  const budget = settings.LLM_MONTHLY_BUDGET_USD;
  if (budget === undefined) return;
  const reserve = settings.LLM_ORAL_RESERVE_USD;
  const active = await db.oralSession.count({ where: { status: 'ACTIVE' } });
  const committed = (await monthlySpend(db, now)) + active * reserve;
  if (committed + (work === 'oral' ? reserve : tutorReserveUsd) > budget)
    throw new ApiException(
      HttpStatus.SERVICE_UNAVAILABLE,
      'llm_budget_exhausted',
      'The monthly AI budget is spent; this resumes next month',
    );
}
