import { z } from 'zod';
import { challengeFamilySchema, contentIdSchema } from '@kompri/shared';

export const domainSchema = z.object({
  id: contentIdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
});

export const skillSchema = z.object({
  id: contentIdSchema,
  domain: contentIdSchema,
  status: z.enum(['draft', 'published']),
  title: z.string().min(1),
  description: z.string().min(1),
  estimatedHours: z.number().int().min(1).max(100),
  prerequisites: z.array(contentIdSchema).default([]),
  objectives: z.array(z.string().min(1)).min(1),
  rncpBlockReference: z.string().min(1).optional(),
});

export const sourceSchema = z.object({
  title: z.string().min(1),
  url: z.url().refine((url) => url.startsWith('https://'), 'HTTPS required'),
});

export const lessonFrontMatterSchema = z
  .object({
    title: z.string().min(1),
    summary: z.string().min(1),
    durationMinutes: z.number().int().min(5).max(120),
    sources: z.array(sourceSchema).max(8).default([]),
  })
  .strict();

export const lessonSchema = lessonFrontMatterSchema.extend({
  id: z.string().min(1),
  skillId: contentIdSchema,
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  position: z.number().int().positive(),
  body: z.string().min(1),
});

export const criterionLevelSchema = z.object({
  score: z.number().int().nonnegative(),
  description: z.string().min(1),
});

export const criterionSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    maxScore: z.number().int().positive(),
    levels: z.array(criterionLevelSchema).optional(),
  })
  .refine(
    (criterion) =>
      !criterion.levels ||
      (criterion.levels.length === criterion.maxScore + 1 &&
        criterion.levels.every((level, index) => level.score === index)),
    'Levels must describe every score from 0 to maxScore in order',
  );

export const rubricSchema = z.object({
  id: z.string().min(1),
  passRatio: z.number().min(0).max(1),
  criteria: z.array(criterionSchema).min(1),
});

export const challengeSchema = z.object({
  id: contentIdSchema,
  skillId: contentIdSchema,
  family: challengeFamilySchema,
  title: z.string().min(1),
  summary: z.string().min(1).optional(),
  estimatedMinutes: z.number().int().min(5).max(600).optional(),
  instructions: z.string().min(1),
  deliverable: z.string().min(1).optional(),
  examinerNotes: z.string().min(1).optional(),
  rubricId: z.string(),
});

/** Shape of one entry in `skills/<id>/challenges.yaml`. */
export const challengeFileEntrySchema = challengeSchema
  .omit({ skillId: true, rubricId: true })
  .extend({
    summary: z.string().min(1),
    estimatedMinutes: z.number().int().min(5).max(600),
    deliverable: z.string().min(1),
    rubric: rubricSchema.omit({ id: true }).extend({
      passRatio: z.number().min(0.5).max(0.9),
      criteria: z.array(criterionSchema).min(2).max(6),
    }),
  })
  .strict();

/** Families whose task is to find defects: their detailed levels name them. */
export const defectFindingFamilies = ['CONTRE_IA', 'APRES_IA'] as const;

/**
 * Private answer keys, by challenge id: examiner notes, and the detailed
 * levels of defect-finding rubrics by criterion id (see src/private.ts).
 */
export const answersSchema = z.record(
  z.string(),
  z
    .object({
      examinerNotes: z.string().min(1),
      levels: z
        .record(z.string(), z.array(criterionLevelSchema).min(2))
        .optional(),
    })
    .strict(),
);
export type Answers = z.infer<typeof answersSchema>;

export type Domain = z.infer<typeof domainSchema>;
export type SkillContent = z.infer<typeof skillSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type Rubric = z.infer<typeof rubricSchema>;
export type Criterion = z.infer<typeof criterionSchema>;
