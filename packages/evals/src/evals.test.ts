import { expect, it } from 'vitest';
import { loadContent } from '@kompri/content';
import { createExaminerMock } from '@kompri/examiner/testing';
import { evaluate } from './index.ts';
it('measures a grading disagreement instead of hiding it in a total score', async () => {
  const content = await loadContent();
  const rubric = content.rubrics.find((r) => r.id === 'js-basics-sans-ia')!;
  const result = await evaluate(
    [
      {
        id: 'disagreement',
        challengeId: 'js-basics-sans-ia',
        submission: 'a + b',
        humanReview: 'pending',
        transcript: [
          { speaker: 'examiner', text: 'Explain', at: '2026-01-01T00:00:00Z' },
          { speaker: 'learner', text: 'addition', at: '2026-01-01T00:00:01Z' },
          { speaker: 'examiner', text: 'Test', at: '2026-01-01T00:00:02Z' },
          { speaker: 'learner', text: '3', at: '2026-01-01T00:00:03Z' },
        ],
        expectedHumanGrade: {
          criteria: rubric.criteria.map((criterion) => ({
            criterionId: criterion.id,
            score: criterion.maxScore,
            justification: 'Reference',
          })),
          verdict: 'PASSED',
        },
      },
    ],
    content,
    createExaminerMock(),
    3,
  );
  expect(result.meanAbsoluteError).toBe(2.5);
  expect(result.cases[0]?.verdictAgreement).toBe(0);
  expect(result.stable).toBe(true);
});
