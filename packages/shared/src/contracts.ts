import { z } from 'zod';
import { challengeFamilySchema, contentIdSchema } from './primitives.ts';

// Public API contracts. They never include examiner notes.

export const domainResponseSchema = z.object({
  id: contentIdSchema,
  title: z.string(),
  description: z.string(),
});

export const skillSummarySchema = z.object({
  id: contentIdSchema,
  domain: contentIdSchema,
  status: z.enum(['draft', 'published']),
  title: z.string(),
  description: z.string(),
  estimatedHours: z.number().int(),
  prerequisites: z.array(contentIdSchema),
  objectives: z.array(z.string()),
  lessonCount: z.number().int().nonnegative(),
  challengeCount: z.number().int().nonnegative(),
  rncpBlockReference: z.string().optional(),
});
export type SkillSummary = z.infer<typeof skillSummarySchema>;
export const skillsResponseSchema = z.array(skillSummarySchema);
export const skillsQuerySchema = z.object({}).strict();

export const treeResponseSchema = z.object({
  domains: z.array(domainResponseSchema),
  skills: z.array(skillSummarySchema),
});
export type TreeResponse = z.infer<typeof treeResponseSchema>;

export const lessonSummarySchema = z.object({
  slug: z.string(),
  position: z.number().int(),
  title: z.string(),
  summary: z.string(),
  durationMinutes: z.number().int(),
});
export type LessonSummary = z.infer<typeof lessonSummarySchema>;

export const challengeSummarySchema = z.object({
  id: contentIdSchema,
  family: challengeFamilySchema,
  title: z.string(),
  summary: z.string().nullable(),
  estimatedMinutes: z.number().int().nullable(),
});
export type ChallengeSummary = z.infer<typeof challengeSummarySchema>;

export const skillDetailSchema = skillSummarySchema.extend({
  lessons: z.array(lessonSummarySchema),
  challenges: z.array(challengeSummarySchema),
});
export type SkillDetail = z.infer<typeof skillDetailSchema>;

const lessonLinkSchema = z.object({ slug: z.string(), title: z.string() });
export const lessonDetailSchema = lessonSummarySchema.extend({
  skillId: contentIdSchema,
  skillTitle: z.string(),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
  body: z.string(),
  previous: lessonLinkSchema.nullable(),
  next: lessonLinkSchema.nullable(),
});
export type LessonDetail = z.infer<typeof lessonDetailSchema>;

export const publicRubricSchema = z.object({
  passRatio: z.number(),
  criteria: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      maxScore: z.number().int(),
      levels: z
        .array(z.object({ score: z.number().int(), description: z.string() }))
        .optional(),
    }),
  ),
});
export type PublicRubric = z.infer<typeof publicRubricSchema>;

export const challengeDetailSchema = challengeSummarySchema.extend({
  skillId: contentIdSchema,
  skillTitle: z.string(),
  instructions: z.string(),
  deliverable: z.string().nullable(),
  rubric: publicRubricSchema,
});
export type ChallengeDetail = z.infer<typeof challengeDetailSchema>;

// Accounts. Passwords follow current guidance: length over composition rules.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());
export const passwordSchema = z.string().min(12).max(128);
export const registerRequestSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    displayName: z.string().trim().min(1).max(60),
  })
  .strict();
export const loginRequestSchema = z
  .object({ email: emailSchema, password: z.string().min(1).max(128) })
  .strict();
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;
export const authResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.iso.datetime(),
  user: userResponseSchema,
});
export const deleteAccountRequestSchema = z
  .object({ password: z.string().min(1).max(128) })
  .strict();

// Attempts and orals.
export const attemptCreateSchema = z
  .object({
    challengeId: contentIdSchema,
    work: z.string().trim().min(1).max(100_000),
  })
  .strict();
export const oralStatusSchema = z.enum([
  'active',
  'grading_failed',
  'completed',
]);
export const attemptResponseSchema = z.object({
  id: z.string(),
  challengeId: z.string(),
  challengeTitle: z.string(),
  skillId: z.string(),
  work: z.string(),
  createdAt: z.iso.datetime(),
  oral: z.object({ id: z.string(), status: oralStatusSchema }).nullable(),
});
export type AttemptResponse = z.infer<typeof attemptResponseSchema>;
export const answerRequestSchema = z
  .object({ text: z.string().max(20_000) })
  .strict();
export const oralResultSchema = z.object({
  verdict: z.enum(['PASSED', 'FAILED']),
  score: z.number().int(),
  maxScore: z.number().int(),
  passRatio: z.number(),
  feedback: z.string().nullable(),
  criteria: z.array(
    z.object({
      criterionId: z.string(),
      description: z.string(),
      score: z.number().int(),
      maxScore: z.number().int(),
      justification: z.string(),
    }),
  ),
  validationExpiresAt: z.iso.datetime().nullable(),
});
export type OralResult = z.infer<typeof oralResultSchema>;
export const oralViewSchema = z.object({
  id: z.string(),
  attemptId: z.string(),
  challengeId: z.string(),
  challengeTitle: z.string(),
  skillId: z.string(),
  status: oralStatusSchema,
  questionCount: z.number().int(),
  answeredCount: z.number().int(),
  answerTimeLimitSeconds: z.number().int(),
  deadline: z.iso.datetime().nullable(),
  serverTime: z.iso.datetime(),
  startedAt: z.iso.datetime(),
  turns: z.array(
    z.object({
      speaker: z.enum(['examiner', 'learner']),
      text: z.string(),
      at: z.iso.datetime(),
    }),
  ),
  result: oralResultSchema.nullable(),
});
export type OralView = z.infer<typeof oralViewSchema>;

// Progress.
export const skillStateSchema = z.enum([
  'validated',
  'expired',
  'available',
  'locked',
  'upcoming',
]);
export type SkillState = z.infer<typeof skillStateSchema>;
export const progressResponseSchema = z.object({
  skills: z.array(
    z.object({
      skillId: z.string(),
      state: skillStateSchema,
      validatedAt: z.iso.datetime().nullable(),
      expiresAt: z.iso.datetime().nullable(),
    }),
  ),
  quota: z.object({
    used: z.number().int(),
    limit: z.number().int(),
    windowHours: z.number().int(),
  }),
  activeOralId: z.string().nullable(),
  recentOrals: z.array(
    z.object({
      id: z.string(),
      challengeId: z.string(),
      challengeTitle: z.string(),
      skillId: z.string(),
      status: oralStatusSchema,
      verdict: z.enum(['PASSED', 'FAILED']).nullable(),
      startedAt: z.iso.datetime(),
    }),
  ),
});
export type ProgressResponse = z.infer<typeof progressResponseSchema>;

export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  code: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// Tutor: allowed while learning, refused during an oral.
export const tutorRequestSchema = z
  .object({
    skillId: contentIdSchema,
    lessonSlug: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().trim().min(1).max(4_000),
        }),
      )
      .min(1)
      .max(20)
      .refine((messages) => messages.at(-1)?.role === 'user', {
        message: 'The last message must come from the learner',
      }),
  })
  .strict();
export type TutorRequest = z.infer<typeof tutorRequestSchema>;
export const tutorQuotaSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
  windowHours: z.number().int(),
  available: z.boolean(),
  reason: z.enum(['oral_in_progress', 'quota_exceeded']).nullable(),
});
export type TutorQuota = z.infer<typeof tutorQuotaSchema>;
