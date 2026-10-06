import { z } from 'zod';
import type { Grade } from '@kompri/examiner';
import {
  gradeReference,
  gradeSchema,
  turnSchema,
  validateGrade,
} from '@kompri/examiner';
import type { Content } from '@kompri/content';
import type { LlmClient } from '@kompri/llm';
export const referenceSchema = z.object({
  id: z.string().min(1),
  challengeId: z.string(),
  submission: z.string().min(1),
  transcript: z.array(turnSchema).min(4),
  humanReview: z.enum(['pending', 'reviewed']),
  expectedHumanGrade: gradeSchema,
});
export type ReferenceOral = z.infer<typeof referenceSchema>;
export async function evaluate(
  references: ReferenceOral[],
  content: Content,
  client: LlmClient,
  runs = 3,
) {
  z.number().int().min(2).max(20).parse(runs);
  z.array(referenceSchema).min(1).parse(references);
  const cases = [];
  for (const reference of references) {
    const challenge = content.challenges.find(
      (c) => c.id === reference.challengeId,
    );
    const rubric = content.rubrics.find((r) => r.id === challenge?.rubricId);
    if (!challenge || !rubric)
      throw new Error(`Missing content for ${reference.id}`);
    const expected = validateGrade(reference.expectedHumanGrade, rubric);
    const grades: Grade[] = [];
    for (let run = 0; run < runs; run++)
      grades.push(
        await gradeReference(
          {
            challenge,
            rubric,
            submission: reference.submission,
            turns: reference.transcript,
          },
          client,
        ),
      );
    const criteria = expected.criteria.map((expectedCriterion) => {
      const scores = grades.map(
        (grade) =>
          grade.criteria.find(
            (c) => c.criterionId === expectedCriterion.criterionId,
          )!.score,
      );
      const mean = scores.reduce((sum, score) => sum + score, 0) / runs;
      return {
        criterionId: expectedCriterion.criterionId,
        meanAbsoluteError:
          scores.reduce(
            (sum, score) => sum + Math.abs(score - expectedCriterion.score),
            0,
          ) / runs,
        standardDeviation: Math.sqrt(
          scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / runs,
        ),
        range: Math.max(...scores) - Math.min(...scores),
      };
    });
    cases.push({
      id: reference.id,
      humanReview: reference.humanReview,
      criteria,
      meanAbsoluteError:
        criteria.reduce(
          (sum, criterion) => sum + criterion.meanAbsoluteError,
          0,
        ) / criteria.length,
      verdictAgreement:
        grades.filter((grade) => grade.verdict === expected.verdict).length /
        runs,
      stableVerdict: new Set(grades.map((grade) => grade.verdict)).size === 1,
    });
  }
  return {
    model: client.model,
    runs,
    cases,
    meanAbsoluteError:
      cases.reduce((sum, item) => sum + item.meanAbsoluteError, 0) /
      cases.length,
    stable: cases.every(
      (item) =>
        item.stableVerdict &&
        item.criteria.every((criterion) => criterion.range === 0),
    ),
  };
}
