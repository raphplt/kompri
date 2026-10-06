import { describe, expect, it } from 'vitest';
import { loadContent } from '@kompri/content';
import { answerOral, gradeOral, prepareOral, validateGrade } from './index.ts';
import { createExaminerMock } from './testing.ts';
describe('complete oral with an injected deterministic LLM', () => {
  it('prepares, asks, follows up and grades without database or network', async () => {
    const content = await loadContent();
    const client = createExaminerMock();
    const initial = await prepareOral(
      {
        challenge: content.challenges[0]!,
        rubric: content.rubrics[0]!,
        submission: 'const add = (a, b) => a + b;',
        at: '2026-01-01T10:00:00Z',
      },
      client,
    );
    const second = await answerOral(
      initial,
      'Une addition de deux nombres.',
      '2026-01-01T10:01:00Z',
      client,
    );
    const done = await answerOral(
      second,
      'Je vérifie que add(1, 2) vaut 3.',
      '2026-01-01T10:02:00Z',
      client,
    );
    expect(initial.turns).toHaveLength(1);
    expect(second.turns).toHaveLength(3);
    expect(done.status).toBe('ready');
    expect((await gradeOral(done, client)).verdict).toBe('PASSED');
    await expect(
      answerOral(done, 'extra', '2026-01-01T10:03:00Z', client),
    ).rejects.toThrow('complete');
    await expect(gradeOral(initial, client)).rejects.toThrow('unfinished');
  });
  it.each(['duplicate', 'overflow', 'verdict', 'unknown'] as const)(
    'rejects %s grading',
    async (kind) => {
      const { rubrics } = await loadContent();
      const grade = {
        criteria: [
          { criterionId: 'explanation', score: 2, justification: 'Evidence' },
          { criterionId: 'modification', score: 2, justification: 'Evidence' },
        ],
        verdict: 'PASSED',
      };
      if (kind === 'duplicate') grade.criteria[1]!.criterionId = 'explanation';
      if (kind === 'overflow') grade.criteria[0]!.score = 3;
      if (kind === 'verdict') grade.verdict = 'FAILED';
      if (kind === 'unknown') grade.criteria[0]!.criterionId = 'other';
      expect(() => validateGrade(grade, rubrics[0]!)).toThrow();
    },
  );
});
