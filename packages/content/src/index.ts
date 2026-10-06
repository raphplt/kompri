import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from 'zod';
import { challengeFamilySchema, skillSchema } from '@kompri/shared';
export const criterionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  maxScore: z.number().int().positive(),
});
export const rubricSchema = z.object({
  id: z.string().min(1),
  passRatio: z.number().min(0).max(1),
  criteria: z.array(criterionSchema).min(1),
});
export const challengeSchema = z.object({
  id: z.string().min(1),
  skillId: z.string(),
  family: challengeFamilySchema,
  title: z.string().min(1),
  instructions: z.string().min(1),
  rubricId: z.string(),
});
export const contentSchema = z
  .object({
    skills: z.array(skillSchema).min(1),
    challenges: z.array(challengeSchema).min(1),
    rubrics: z.array(rubricSchema).min(1),
  })
  .superRefine((content, ctx) => {
    const error = (message: string) =>
      ctx.addIssue({ code: 'custom', message });
    const unique = (ids: string[], label: string) => {
      if (new Set(ids).size !== ids.length) error(`Duplicate ${label}`);
    };
    unique(
      content.skills.map((s) => s.id),
      'skill',
    );
    unique(
      content.challenges.map((c) => c.id),
      'challenge',
    );
    unique(
      content.rubrics.map((r) => r.id),
      'rubric',
    );
    const skills = new Map(content.skills.map((s) => [s.id, s]));
    for (const skill of content.skills) {
      unique(skill.prerequisites, `prerequisite in ${skill.id}`);
      for (const id of skill.prerequisites)
        if (!skills.has(id)) error(`Unknown prerequisite ${id}`);
    }
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (id: string) => {
      if (visiting.has(id)) {
        error(`Cycle at ${id}`);
        return;
      }
      if (visited.has(id)) return;
      visiting.add(id);
      for (const next of skills.get(id)?.prerequisites ?? []) visit(next);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of skills.keys()) visit(id);
    for (const rubric of content.rubrics)
      unique(
        rubric.criteria.map((c) => c.id),
        `criterion in ${rubric.id}`,
      );
    for (const challenge of content.challenges) {
      if (!skills.has(challenge.skillId))
        error(`Unknown skill ${challenge.skillId}`);
      if (!content.rubrics.some((r) => r.id === challenge.rubricId))
        error(`Missing rubric ${challenge.rubricId}`);
    }
  });
export type Content = z.infer<typeof contentSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type Rubric = z.infer<typeof rubricSchema>;
export async function loadContent(
  directory = new URL('../data/', import.meta.url),
): Promise<Content> {
  const [skills, challenges, rubrics] = await Promise.all(
    ['skills.yaml', 'challenges.yaml', 'rubrics.yaml'].map(
      async (name) =>
        parse(await readFile(new URL(name, directory), 'utf8')) as unknown,
    ),
  );
  return contentSchema.parse({ skills, challenges, rubrics });
}
