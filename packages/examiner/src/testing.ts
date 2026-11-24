import { z } from 'zod';
import { createClient, createMockAdapter } from '@kompri/llm';
import type { MockResponder } from '@kompri/llm';

/**
 * Synthetic examiner for plumbing tests, local development and the mock bench.
 * It does not assess understanding: it only reads documented surface signals.
 * - prepare: generic questions built from the challenge title, in requested number;
 * - follow-up: the planned question, unchanged;
 * - grade: criterion i reads learner answer i modulo the number of answers.
 *   At least 25 words gives the maximum score, at least 10 words half of it
 *   (rounded up), fewer gives 0.
 */
export const mockSignalWords = { full: 25, partial: 10 } as const;

const contextSchema = z.object({
  challenge: z.object({ title: z.string() }),
  rubric: z.object({
    passRatio: z.number(),
    criteria: z.array(z.object({ id: z.string(), maxScore: z.number() })),
  }),
});

export const examinerMockResponder: MockResponder = (request) => {
  const input = JSON.parse(request.messages.at(-1)!.content) as unknown;
  if (request.operation === 'prepare') {
    const { challenge, questionCount } = contextSchema
      .extend({ questionCount: z.number().int().positive() })
      .parse(input);
    const templates = [
      `Explique avec tes mots la partie la plus importante de ton travail pour « ${challenge.title} ».`,
      'Quelle modification apporterais-tu pour traiter un cas supplémentaire, et comment la vérifierais-tu ?',
      'Quel cas limite pourrait faire échouer ton travail, et pourquoi ?',
      'Quelle autre solution as-tu envisagée, et pourquoi l’as-tu écartée ?',
      'Quelle notion de ce défi te semble la plus délicate à expliquer ?',
    ];
    return {
      questions: Array.from(
        { length: questionCount },
        (_, index) => templates[index % templates.length],
      ),
    };
  }
  if (request.operation === 'follow-up')
    return {
      question: z.object({ nextQuestion: z.string() }).parse(input)
        .nextQuestion,
    };
  if (request.operation === 'grade') {
    const { rubric, turns } = contextSchema
      .extend({
        turns: z.array(z.object({ speaker: z.string(), text: z.string() })),
      })
      .parse(input);
    const answers = turns.filter((t) => t.speaker === 'learner');
    const criteria = rubric.criteria.map((criterion, index) => {
      const words =
        answers[index % Math.max(answers.length, 1)]?.text
          .split(/\s+/)
          .filter(Boolean).length ?? 0;
      const score =
        words >= mockSignalWords.full
          ? criterion.maxScore
          : words >= mockSignalWords.partial
            ? Math.ceil(criterion.maxScore / 2)
            : 0;
      return [
        criterion.id,
        {
          score,
          justification: `Signal synthétique : réponse de ${words} mots.`,
        },
      ] as const;
    });
    return {
      criteria: Object.fromEntries(criteria),
      feedback:
        'Retour synthétique du mock : il mesure seulement la longueur des réponses, pas leur justesse.',
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
