import { z } from 'zod';
import { createClient, createMockAdapter } from '@kompri/llm';
import type { MockResponder } from '@kompri/llm';
// Synthetic behavior for plumbing tests only; this is not an assessment model.
export const examinerMockResponder: MockResponder = (request) => {
  if (request.operation === 'prepare')
    return {
      questions: [
        'Explique le résultat de add(1, 2).',
        'Modifie la fonction et donne un cas de test.',
      ],
    };
  if (request.operation === 'follow-up')
    return {
      question:
        'Comment vérifierais-tu cette modification avec un cas concret ?',
    };
  if (request.operation === 'grade') {
    const input = z
      .object({
        submission: z.string(),
        turns: z.array(z.object({ speaker: z.string(), text: z.string() })),
      })
      .parse(JSON.parse(request.messages.at(-1)!.content));
    const answers = input.turns.filter((t) => t.speaker === 'learner');
    const explanation = answers[0]?.text.toLowerCase().includes('addition')
      ? 2
      : 0;
    const modification =
      input.submission.includes('+') && answers[1]?.text.includes('3') ? 2 : 0;
    return {
      criteria: [
        {
          criterionId: 'explanation',
          score: explanation,
          justification: 'Signal synthétique : présence du mot addition.',
        },
        {
          criterionId: 'modification',
          score: modification,
          justification: 'Signal synthétique : opérateur + et résultat 3.',
        },
      ],
      verdict: explanation + modification >= 3 ? 'PASSED' : 'FAILED',
    };
  }
  throw new Error('Unsupported mock operation');
};
export function createExaminerMock() {
  return createClient({
    adapter: createMockAdapter(examinerMockResponder),
    usage: 'examiner',
    model: 'mock-v1',
    inputRate: 0,
    outputRate: 0,
    log: () => {},
  });
}
