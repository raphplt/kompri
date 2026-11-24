import { z } from 'zod';
import { challengeSchema, rubricSchema } from '@kompri/content';
import type { Challenge, Rubric } from '@kompri/content';
import type { LlmClient, Request } from '@kompri/llm';
import {
  followUpInstructions,
  gradeInstructions,
  prepareInstructions,
} from './prompts.ts';

export const turnSchema = z.object({
  speaker: z.enum(['examiner', 'learner']),
  text: z.string().trim().min(1).max(20_000),
  at: z.iso.datetime(),
});
export type Turn = z.infer<typeof turnSchema>;

const criterionScoreSchema = z.object({
  criterionId: z.string(),
  score: z.number().int().nonnegative(),
  justification: z.string().min(1),
});
export const gradeSchema = z.object({
  criteria: z.array(criterionScoreSchema).min(1),
  verdict: z.enum(['PASSED', 'FAILED']),
  feedback: z.string().min(1).optional(),
});
export type Grade = z.infer<typeof gradeSchema>;
/**
 * What the model returns: one required entry per rubric criterion, keyed by its
 * id, so a structured output cannot skip or repeat a criterion. The verdict is
 * computed from the scores, never asked of the model.
 */
export function modelGradeSchema(rubric: Rubric) {
  return z.object({
    criteria: z.object(
      Object.fromEntries(
        rubric.criteria.map((criterion) => [
          criterion.id,
          z.object({
            score: z.number().int().nonnegative(),
            justification: z.string().min(1),
          }),
        ]),
      ),
    ),
    feedback: z.string().min(1),
  });
}

export const minQuestions = 2;
export const maxQuestions = 5;
export const defaultQuestionCount = 3;

export interface OralState {
  challenge: Challenge;
  rubric: Rubric;
  submission: string;
  model: string;
  questions: string[];
  turns: Turn[];
  status: 'active' | 'ready';
}

function request(
  operation: string,
  instructions: string,
  context: unknown,
): Request {
  return {
    operation,
    messages: [
      { role: 'system', content: instructions },
      // Untrusted learner content is only ever sent as JSON data.
      { role: 'user', content: JSON.stringify(context) },
    ],
  };
}

export function validateGrade(value: unknown, rubric: Rubric): Grade {
  const grade = gradeSchema.parse(value);
  if (
    grade.criteria.length !== rubric.criteria.length ||
    new Set(grade.criteria.map((c) => c.criterionId)).size !==
      rubric.criteria.length
  )
    throw new Error('Grade must cover every rubric criterion exactly once');
  for (const score of grade.criteria) {
    const criterion = rubric.criteria.find((c) => c.id === score.criterionId);
    if (!criterion || score.score > criterion.maxScore)
      throw new Error('Grade criterion or score is invalid');
  }
  if (grade.verdict !== expectedVerdict(grade, rubric))
    throw new Error('Verdict contradicts the rubric threshold');
  return grade;
}

export function expectedVerdict(
  grade: Pick<Grade, 'criteria'>,
  rubric: Rubric,
): Grade['verdict'] {
  const total = grade.criteria.reduce((sum, c) => sum + c.score, 0);
  const maximum = rubric.criteria.reduce((sum, c) => sum + c.maxScore, 0);
  return total / maximum >= rubric.passRatio ? 'PASSED' : 'FAILED';
}

export async function prepareOral(
  input: {
    challenge: Challenge;
    rubric: Rubric;
    submission: string;
    at: string;
    questionCount?: number;
  },
  client: LlmClient,
): Promise<OralState> {
  const challenge = challengeSchema.parse(input.challenge);
  const rubric = rubricSchema.parse(input.rubric);
  if (challenge.rubricId !== rubric.id)
    throw new Error('Challenge and rubric do not match');
  const submission = z
    .string()
    .trim()
    .min(1)
    .max(100_000)
    .parse(input.submission);
  const at = z.iso.datetime().parse(input.at);
  const questionCount = z
    .number()
    .int()
    .min(minQuestions)
    .max(maxQuestions)
    .parse(input.questionCount ?? defaultQuestionCount);
  const plan = await client.generateStructured(
    request('prepare', prepareInstructions(questionCount), {
      challenge,
      rubric,
      submission,
      questionCount,
    }),
    z.object({
      questions: z
        .array(z.string().trim().min(1).max(2_000))
        .length(questionCount),
    }),
  );
  return {
    challenge,
    rubric,
    submission,
    model: client.model,
    questions: plan.questions,
    status: 'active',
    turns: [{ speaker: 'examiner', text: plan.questions[0]!, at }],
  };
}

export async function answerOral(
  state: OralState,
  answer: string,
  at: string,
  client: LlmClient,
): Promise<OralState> {
  if (state.status !== 'active') throw new Error('Oral is already complete');
  if (client.model !== state.model)
    throw new Error('Cannot switch model during an oral');
  const turn = turnSchema.parse({ speaker: 'learner', text: answer, at });
  if (Date.parse(turn.at) < Date.parse(state.turns.at(-1)!.at))
    throw new Error('Turn timestamp precedes previous turn');
  const turns = [...state.turns, turn];
  const count = turns.filter((t) => t.speaker === 'learner').length;
  if (count >= state.questions.length)
    return { ...state, turns, status: 'ready' };
  const followUp = await client.generateStructured(
    request('follow-up', followUpInstructions, {
      challenge: state.challenge,
      rubric: state.rubric,
      submission: state.submission,
      turns,
      nextQuestion: state.questions[count],
    }),
    z.object({ question: z.string().trim().min(1).max(2_000) }),
  );
  return {
    ...state,
    turns: [...turns, { speaker: 'examiner', text: followUp.question, at }],
  };
}

export const unansweredMarker =
  '[Aucune réponse : temps écoulé ou oral abandonné]';

/** Ends an oral early: the pending question is recorded as unanswered. */
export function abandonOral(state: OralState, at: string): OralState {
  if (state.status !== 'active') throw new Error('Oral is already complete');
  const turn = turnSchema.parse({
    speaker: 'learner',
    text: unansweredMarker,
    at,
  });
  if (Date.parse(turn.at) < Date.parse(state.turns.at(-1)!.at))
    throw new Error('Turn timestamp precedes previous turn');
  return { ...state, turns: [...state.turns, turn], status: 'ready' };
}

export async function gradeOral(
  state: OralState,
  client: LlmClient,
): Promise<Grade> {
  if (state.status !== 'ready')
    throw new Error('Cannot grade an unfinished oral');
  if (client.model !== state.model)
    throw new Error('Cannot switch model during an oral');
  const output = await client.generateStructured(
    request('grade', gradeInstructions, {
      challenge: state.challenge,
      rubric: state.rubric,
      submission: state.submission,
      turns: state.turns,
    }),
    modelGradeSchema(state.rubric),
  );
  const criteria = state.rubric.criteria.map((criterion) => ({
    criterionId: criterion.id,
    ...output.criteria[criterion.id]!,
  }));
  return validateGrade(
    {
      criteria,
      verdict: expectedVerdict({ criteria }, state.rubric),
      feedback: output.feedback,
    },
    state.rubric,
  );
}

// Replay preserves the reference examiner questions: different live follow-ups
// must not silently be paired with answers written for another question.
export async function gradeReference(
  input: {
    challenge: Challenge;
    rubric: Rubric;
    submission: string;
    turns: Turn[];
  },
  client: LlmClient,
): Promise<Grade> {
  const challenge = challengeSchema.parse(input.challenge);
  const rubric = rubricSchema.parse(input.rubric);
  if (challenge.rubricId !== rubric.id)
    throw new Error('Challenge and rubric do not match');
  const submission = z.string().min(1).max(100_000).parse(input.submission);
  const turns = z.array(turnSchema).min(4).parse(input.turns);
  if (
    turns.length % 2 !== 0 ||
    turns.some(
      (turn, index) =>
        turn.speaker !== (index % 2 === 0 ? 'examiner' : 'learner') ||
        (index > 0 && Date.parse(turn.at) < Date.parse(turns[index - 1]!.at)),
    )
  )
    throw new Error('Invalid reference turn order');
  return gradeOral(
    {
      challenge,
      rubric,
      submission,
      turns,
      questions: [],
      status: 'ready',
      model: client.model,
    },
    client,
  );
}
