import { readdir, readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from 'zod';
import { lintMarkdown, splitFrontMatter } from './markdown.ts';
import {
  challengeFileEntrySchema,
  challengeSchema,
  domainSchema,
  lessonFrontMatterSchema,
  lessonSchema,
  rubricSchema,
  skillSchema,
} from './schemas.ts';
import type { Challenge, Lesson, Rubric } from './schemas.ts';

export * from './schemas.ts';
export { codeLanguages, calloutKinds, lintMarkdown } from './markdown.ts';

const families = ['SANS_IA', 'AVEC_IA', 'CONTRE_IA', 'APRES_IA'] as const;

export const contentSchema = z
  .object({
    domains: z.array(domainSchema).min(1),
    skills: z.array(skillSchema).min(1),
    lessons: z.array(lessonSchema),
    challenges: z.array(challengeSchema),
    rubrics: z.array(rubricSchema),
  })
  .superRefine((content, ctx) => {
    const error = (message: string) =>
      ctx.addIssue({ code: 'custom', message });
    const unique = (ids: string[], label: string) => {
      const seen = new Set<string>();
      for (const id of ids) {
        if (seen.has(id)) error(`Duplicate ${label} ${id}`);
        seen.add(id);
      }
    };
    unique(
      content.domains.map((d) => d.id),
      'domain',
    );
    unique(
      content.skills.map((s) => s.id),
      'skill',
    );
    unique(
      content.lessons.map((l) => l.id),
      'lesson',
    );
    unique(
      content.challenges.map((c) => c.id),
      'challenge',
    );
    unique(
      content.rubrics.map((r) => r.id),
      'rubric',
    );
    const domains = new Set(content.domains.map((d) => d.id));
    const skills = new Map(content.skills.map((s) => [s.id, s]));
    for (const skill of content.skills) {
      if (!domains.has(skill.domain))
        error(`Unknown domain ${skill.domain} in ${skill.id}`);
      unique(skill.prerequisites, `prerequisite in ${skill.id}`);
      for (const id of skill.prerequisites) {
        if (!skills.has(id)) error(`Unknown prerequisite ${id}`);
        else if (
          skill.status === 'published' &&
          skills.get(id)!.status !== 'published'
        )
          error(`Published ${skill.id} requires draft ${id}`);
      }
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
    for (const lesson of content.lessons)
      if (!skills.has(lesson.skillId))
        error(`Lesson ${lesson.id} has unknown skill ${lesson.skillId}`);
    for (const skill of content.skills)
      unique(
        content.lessons
          .filter((l) => l.skillId === skill.id)
          .map((l) => String(l.position)),
        `lesson position in ${skill.id}`,
      );
    for (const challenge of content.challenges) {
      if (!skills.has(challenge.skillId))
        error(`Unknown skill ${challenge.skillId}`);
      if (!content.rubrics.some((r) => r.id === challenge.rubricId))
        error(`Missing rubric ${challenge.rubricId}`);
    }
    for (const skill of content.skills) {
      if (skill.status !== 'published') continue;
      const lessons = content.lessons.filter((l) => l.skillId === skill.id);
      if (lessons.length < 2)
        error(`Published ${skill.id} needs at least two lessons`);
      for (const family of families)
        if (
          !content.challenges.some(
            (c) => c.skillId === skill.id && c.family === family,
          )
        )
          error(`Published ${skill.id} has no ${family} challenge`);
    }
  });

export type Content = z.infer<typeof contentSchema>;

/** Markdown issues are reported separately so that authors get precise locations. */
export function lintContent(content: Content): string[] {
  const issues: string[] = [];
  for (const lesson of content.lessons)
    for (const issue of lintMarkdown(lesson.body, { allowCallouts: true }))
      issues.push(`${lesson.id}: ${issue}`);
  for (const challenge of content.challenges)
    for (const [field, value] of [
      ['instructions', challenge.instructions],
      ['deliverable', challenge.deliverable],
      ['examinerNotes', challenge.examinerNotes],
    ] as const)
      if (value)
        for (const issue of lintMarkdown(value))
          issues.push(`${challenge.id}.${field}: ${issue}`);
  return issues;
}

async function readYaml(url: URL): Promise<unknown> {
  return parse(await readFile(url, 'utf8')) as unknown;
}

async function listDirectory(url: URL): Promise<string[]> {
  try {
    return (await readdir(url)).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

function located<T>(schema: z.ZodType<T>, value: unknown, where: string): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new Error(`${where}: ${z.prettifyError(result.error)}`);
  return result.data;
}

export async function loadContent(
  directory = new URL('../data/', import.meta.url),
): Promise<Content> {
  const domains = await readYaml(new URL('domains.yaml', directory));
  const skills = located(
    z.array(z.object({ id: z.string() }).loose()),
    await readYaml(new URL('skills.yaml', directory)),
    'skills.yaml',
  );
  const known = new Set(skills.map((s) => s.id));
  for (const name of await listDirectory(new URL('skills/', directory)))
    if (!known.has(name))
      throw new Error(`skills/${name} is not declared in skills.yaml`);
  const lessons: Lesson[] = [];
  const challenges: Challenge[] = [];
  const rubrics: Rubric[] = [];
  for (const { id: skillId } of skills) {
    const skillDirectory = new URL(`skills/${skillId}/`, directory);
    const lessonDirectory = new URL('lessons/', skillDirectory);
    for (const file of await listDirectory(lessonDirectory)) {
      const where = `skills/${skillId}/lessons/${file}`;
      const match = /^(\d{2})-([a-z0-9][a-z0-9-]*)\.md$/.exec(file);
      if (!match) throw new Error(`${where}: expected NN-slug.md`);
      const { data, body } = splitFrontMatter(
        await readFile(new URL(file, lessonDirectory), 'utf8'),
      );
      const frontMatter = located(lessonFrontMatterSchema, data, where);
      lessons.push({
        ...frontMatter,
        id: `${skillId}/${match[2]!}`,
        skillId,
        slug: match[2]!,
        position: Number(match[1]),
        body,
      });
    }
    const challengeFile = new URL('challenges.yaml', skillDirectory);
    if (!(await listDirectory(skillDirectory)).includes('challenges.yaml'))
      continue;
    const entries = located(
      z.array(challengeFileEntrySchema),
      await readYaml(challengeFile),
      `skills/${skillId}/challenges.yaml`,
    );
    for (const { rubric, ...challenge } of entries) {
      challenges.push({ ...challenge, skillId, rubricId: challenge.id });
      rubrics.push({ ...rubric, id: challenge.id });
    }
  }
  return located(
    contentSchema,
    { domains, skills, lessons, challenges, rubrics },
    'content',
  );
}
