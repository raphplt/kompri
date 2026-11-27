/**
 * Live probe of question generation, for prompt changes: prepares an oral on
 * several references, asks the follow-up after the reference's first answer,
 * and prints the questions, their latency and any long passage copied from the
 * examiner notes. It calls the configured examiner model; never run in CI.
 */
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { loadContent } from '@kompri/content';
import { loadEnvironment } from '@kompri/shared/load-env';
import { createRegistry } from '@kompri/llm';
import { answerOral, prepareOral } from '@kompri/examiner';
import { referenceSchema } from './index.ts';

loadEnvironment();
if (
  !process.env.LLM_EXAMINER_PROVIDER ||
  process.env.LLM_EXAMINER_PROVIDER === 'mock'
)
  throw new Error('The question probe needs a non-mock LLM_EXAMINER_PROVIDER');

const ids = [
  'clear-pass',
  'contre-ia-borderline',
  'avec-ia-pass',
  'apres-ia-pass',
  'typescript-pass',
  'sql-pass',
  'react-borderline-fail',
  'security-partial-fail',
];

/** Longest passage (in characters) shared by two texts, case-insensitive. */
export function sharedPassage(a: string, b: string) {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  let best = '';
  for (let i = 0; i < left.length; i++)
    for (let j = i + best.length + 1; j <= left.length; j++) {
      if (!right.includes(left.slice(i, j))) break;
      best = left.slice(i, j);
    }
  return best;
}

const content = await loadContent();
let cost = 0;
const client = createRegistry(process.env, (metric) => {
  cost += metric.estimatedCostUsd ?? 0;
}).forUsage('examiner');
for (const id of ids) {
  const reference = referenceSchema.parse(
    parse(
      await readFile(
        new URL(`../references/${id}.yaml`, import.meta.url),
        'utf8',
      ),
    ),
  );
  const challenge = content.challenges.find(
    (c) => c.id === reference.challengeId,
  )!;
  const rubric = content.rubrics.find((r) => r.id === challenge.rubricId)!;
  let start = performance.now();
  const state = await prepareOral(
    {
      challenge,
      rubric,
      submission: reference.submission,
      at: '2026-01-01T10:00:00Z',
    },
    client,
  );
  const preparation = (performance.now() - start) / 1000;
  start = performance.now();
  const next = await answerOral(
    state,
    reference.transcript[1]!.text,
    '2026-01-01T10:02:00Z',
    client,
  );
  const followUp = (performance.now() - start) / 1000;
  console.log(
    `\n### ${id} (${challenge.id}) — préparation ${preparation.toFixed(1)} s, relance ${followUp.toFixed(1)} s`,
  );
  state.questions.forEach((q, i) => console.log(`Q${i + 1}: ${q}`));
  const asked = next.turns.at(-1)!.text;
  console.log(`Relance: ${asked}`);
  for (const question of [...state.questions, asked]) {
    const passage = sharedPassage(question, challenge.examinerNotes ?? '');
    if (passage.length >= 40)
      console.log(
        `  ! passage repris des notes (${passage.length}) : « ${passage} »`,
      );
  }
}
console.log(`\nCoût estimé : ${cost.toFixed(3)} $`);
