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
const client = createRegistry(env, undefined, examinerMockResponder).forUsage(
  'examiner',
);
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
const report = await evaluate(references, await loadContent(), client);
console.log(JSON.stringify(report, null, 2));
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
