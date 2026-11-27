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
  /**
   * `exact`: the deterministic mock must reproduce the expected grade (plumbing
   * check run in CI). `report`: a realistic oral the mock cannot judge; it is
   * replayed and reported with the mock, and only meaningful with a real model.
   */
  mock: z.enum(['exact', 'report']).default('exact'),
  expectedHumanGrade: gradeSchema,
});
export type ReferenceOral = z.infer<typeof referenceSchema>;
/** Grading tries per run, as `maxGradingTries` in apps/api/src/learning.ts. */
export const gradingTries = 2;
export async function evaluate(
  input: z.input<typeof referenceSchema>[],
  content: Content,
  client: LlmClient,
  runs = 3,
) {
  z.number().int().min(2).max(20).parse(runs);
  const references = z.array(referenceSchema).min(1).parse(input);
  const cases = [];
  for (const reference of references) {
    const challenge = content.challenges.find(
      (c) => c.id === reference.challengeId,
    );
    const rubric = content.rubrics.find((r) => r.id === challenge?.rubricId);
    if (!challenge || !rubric)
      throw new Error(`Missing content for ${reference.id}`);
    const expected = validateGrade(reference.expectedHumanGrade, rubric);
    // As in production: a failed grading is tried again once; a run whose
    // two tries fail counts as a grading failure (the oral would wait for a
    // retry), neither a pass nor a fail.
    const grades: Grade[] = [];
    let gradingFailures = 0;
    for (let run = 0; run < runs; run++) {
      let grade: Grade | null = null;
      for (let attempt = 0; attempt < gradingTries && !grade; attempt++)
        grade = await gradeReference(
          {
            challenge,
            rubric,
            submission: reference.submission,
            turns: reference.transcript,
          },
          client,
        ).catch(() => null);
      if (grade) grades.push(grade);
      else gradingFailures++;
    }
    const graded = Math.max(grades.length, 1);
    const criteria = expected.criteria.map((expectedCriterion) => {
      const scores = grades.map(
        (grade) =>
          grade.criteria.find(
            (c) => c.criterionId === expectedCriterion.criterionId,
          )!.score,
      );
      const mean = scores.reduce((sum, score) => sum + score, 0) / graded;
      return {
        criterionId: expectedCriterion.criterionId,
        meanAbsoluteError:
          scores.reduce(
            (sum, score) => sum + Math.abs(score - expectedCriterion.score),
            0,
          ) / graded,
        standardDeviation: Math.sqrt(
          scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / graded,
        ),
        range: Math.max(...scores) - Math.min(...scores),
      };
    });
    cases.push({
      id: reference.id,
      humanReview: reference.humanReview,
      mock: reference.mock,
      criteria,
      meanAbsoluteError:
        criteria.reduce(
          (sum, criterion) => sum + criterion.meanAbsoluteError,
          0,
        ) / criteria.length,
      expectedVerdict: expected.verdict,
      gradingFailures,
      /** Runs that validated the skill: above zero on a FAILED reference is a false pass. */
      passedRuns: grades.filter((grade) => grade.verdict === 'PASSED').length,
      verdictAgreement:
        grades.filter((grade) => grade.verdict === expected.verdict).length /
        runs,
      stableVerdict:
        gradingFailures === 0 &&
        new Set(grades.map((grade) => grade.verdict)).size === 1,
    });
  }
  const failing = cases.filter((item) => item.expectedVerdict === 'FAILED');
  const passing = cases.filter((item) => item.expectedVerdict === 'PASSED');
  return {
    model: client.model,
    runs,
    /** Validations granted where the reference fails: the costliest error. */
    falsePasses: failing.reduce((sum, item) => sum + item.passedRuns, 0),
    /** Refusals where the reference passes. */
    falseFails: passing.reduce(
      (sum, item) => sum + (runs - item.passedRuns - item.gradingFailures),
      0,
    ),
    /** Runs whose two grading tries failed: the oral would await a retry. */
    gradingFailures: cases.reduce((sum, item) => sum + item.gradingFailures, 0),
    verdictAccuracy:
      cases.reduce((sum, item) => sum + item.verdictAgreement, 0) /
      cases.length,
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
