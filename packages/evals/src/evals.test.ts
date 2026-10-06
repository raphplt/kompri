import { expect, it } from 'vitest';
import { loadContent } from '@kompri/content';
import { createExaminerMock } from '@kompri/examiner/testing';
import { evaluate } from './index.ts';
it('measures a grading disagreement instead of hiding it in a total score', async () => {
  const result = await evaluate(
    [
      {
        id: 'disagreement',
        challengeId: 'add-without-ai',
        submission: 'a + b',
        humanReview: 'pending',
        transcript: [
          { speaker: 'examiner', text: 'Explain', at: '2026-01-01T00:00:00Z' },
          { speaker: 'learner', text: 'addition', at: '2026-01-01T00:00:01Z' },
          { speaker: 'examiner', text: 'Test', at: '2026-01-01T00:00:02Z' },
          { speaker: 'learner', text: '3', at: '2026-01-01T00:00:03Z' },
        ],
        expectedHumanGrade: {
          criteria: [
            {
              criterionId: 'explanation',
              score: 0,
              justification: 'Reference',
            },
            {
              criterionId: 'modification',
              score: 0,
              justification: 'Reference',
            },
          ],
          verdict: 'FAILED',
        },
      },
    ],
    await loadContent(),
    createExaminerMock(),
    3,
  );
  expect(result.meanAbsoluteError).toBe(2);
  expect(result.cases[0]?.verdictAgreement).toBe(0);
  expect(result.stable).toBe(true);
});
