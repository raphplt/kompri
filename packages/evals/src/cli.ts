import { readFile, readdir } from 'node:fs/promises';
import { parse } from 'yaml';
import { loadContent } from '@kompri/content';
import { loadEnvironment } from '@kompri/shared/load-env';
import { createRegistry } from '@kompri/llm';
import { examinerMockResponder } from '@kompri/examiner/testing';
import { evaluate, referenceSchema } from './index.ts';
loadEnvironment();
const live = process.argv.includes('--live');
const env = live
  ? process.env
  : {
      ...process.env,
      LLM_EXAMINER_PROVIDER: 'mock',
      LLM_TUTOR_PROVIDER: 'mock',
      LLM_CONTENT_GENERATION_PROVIDER: 'mock',
    };
if (
  live &&
  (!env.LLM_EXAMINER_PROVIDER || env.LLM_EXAMINER_PROVIDER === 'mock')
)
  throw new Error(
    'Live evals require an explicit non-mock LLM_EXAMINER_PROVIDER configuration',
  );
// Call metrics stay out of stdout so the report remains valid JSON.
const usage = { calls: 0, estimatedCostUsd: 0, maxDurationMs: 0, errors: 0 };
const client = createRegistry(
  env,
  (metric) => {
    usage.calls += 1;
    usage.estimatedCostUsd += metric.estimatedCostUsd ?? 0;
    usage.maxDurationMs = Math.max(usage.maxDurationMs, metric.durationMs);
    if (metric.status !== 'ok') usage.errors += 1;
  },
  examinerMockResponder,
).forUsage('examiner');
const directory = new URL('../references/', import.meta.url);
const files = (await readdir(directory))
  .filter((name) => name.endsWith('.yaml'))
  .sort();
const references = await Promise.all(
  files.map(async (name) =>
    referenceSchema.parse(
      parse(await readFile(new URL(name, directory), 'utf8')),
    ),
  ),
);
const runsArgument = process.argv.find((arg) => arg.startsWith('--runs='));
const report = await evaluate(
  references,
  await loadContent(),
  client,
  runsArgument ? Number(runsArgument.slice('--runs='.length)) : undefined,
);
console.log(JSON.stringify({ ...report, usage }, null, 2));
console.error(
  `${report.model}: ${report.cases.length} références × ${report.runs}, ` +
    `faux positifs ${report.falsePasses}, faux négatifs ${report.falseFails}, ` +
    `accord ${(report.verdictAccuracy * 100).toFixed(1)} %, ` +
    `écart moyen ${report.meanAbsoluteError.toFixed(2)} pt, ` +
    `${usage.calls} appels, ${usage.estimatedCostUsd.toFixed(3)} $`,
);
// With the mock, only `exact` references are a pass/fail check.
const exact = report.cases.filter((item) => item.mock === 'exact');
if (
  !live &&
  exact.some(
    (item) =>
      item.meanAbsoluteError !== 0 ||
      !item.stableVerdict ||
      item.verdictAgreement !== 1,
  )
)
  process.exitCode = 1;
