import { readFile, readdir } from 'node:fs/promises';
import { parse } from 'yaml';
import { loadContent } from '@kompri/content';
import { loadEnvironment } from '@kompri/shared/env';
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
if (live && env.LLM_EXAMINER_PROVIDER !== 'mistral')
  throw new Error(
    'Live evals require an explicit LLM_EXAMINER_PROVIDER=mistral configuration',
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
if (
  !live &&
  (report.meanAbsoluteError !== 0 ||
    !report.stable ||
    report.cases.some((item) => item.verdictAgreement !== 1))
)
  process.exitCode = 1;
