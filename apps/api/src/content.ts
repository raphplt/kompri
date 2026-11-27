import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { PrismaClient } from '@kompri/db';
import { rubricSchema } from '@kompri/content';
import {
  challengeDetailSchema,
  contentIdSchema,
  lessonDetailSchema,
  skillDetailSchema,
  skillsQuerySchema,
  skillsResponseSchema,
  treeResponseSchema,
  z,
} from '@kompri/shared';
import { DATABASE } from './context.ts';
import { notFound, parseInput } from './errors.ts';

const live = { archivedAt: null };
const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

/**
 * The rubric shown to learners. In challenges where finding the defects is the
 * task (CONTRE_IA, APRES_IA), the detailed levels name those defects: only the
 * criteria are shown, and the examiner keeps the full rubric.
 */
export const toPublicRubric = (snapshot: unknown, family: string) => {
  const rubric = rubricSchema.parse(snapshot);
  const levelsArePublic = family === 'SANS_IA' || family === 'AVEC_IA';
  return {
    passRatio: rubric.passRatio,
    criteria: rubric.criteria.map(({ levels, ...criterion }) =>
      levelsArePublic && levels ? { ...criterion, levels } : criterion,
    ),
  };
};

@ApiTags('content')
@Controller()
export class ContentController {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  private async summaries(where: { id?: string } = {}) {
    const skills = await this.db.skill.findMany({
      where: { ...live, ...where },
      orderBy: { position: 'asc' },
      include: {
        prerequisites: { orderBy: { prerequisiteId: 'asc' } },
        _count: {
          select: { lessons: { where: live }, challenges: { where: live } },
        },
      },
    });
    return skills.map((skill) => ({
      id: skill.id,
      domain: skill.domainId ?? 'other',
      status: skill.status === 'PUBLISHED' ? 'published' : 'draft',
      title: skill.title,
      description: skill.description,
      estimatedHours: skill.estimatedHours,
      prerequisites: skill.prerequisites.map((edge) => edge.prerequisiteId),
      objectives: z.array(z.string()).parse(skill.objectives),
      lessonCount: skill._count.lessons,
      challengeCount: skill._count.challenges,
      ...(skill.rncpBlockReference
        ? { rncpBlockReference: skill.rncpBlockReference }
        : {}),
    }));
  }

  @Get('tree')
  async tree() {
    const domains = await this.db.domain.findMany({
      where: live,
      orderBy: { position: 'asc' },
      select: { id: true, title: true, description: true },
    });
    return treeResponseSchema.parse({
      domains,
      skills: await this.summaries(),
    });
  }

  @Get('skills')
  async skills(@Query() query: unknown) {
    parseInput(skillsQuerySchema, query);
    return skillsResponseSchema.parse(await this.summaries());
  }

  @Get('skills/:skillId')
  async skill(@Param('skillId') rawId: string) {
    const id = parseInput(contentIdSchema, rawId);
    const [summary] = await this.summaries({ id });
    if (!summary) throw notFound('Skill');
    const [lessons, challenges] = await Promise.all([
      this.db.lesson.findMany({
        where: { ...live, skillId: id },
        orderBy: { position: 'asc' },
        select: {
          slug: true,
          position: true,
          title: true,
          summary: true,
          durationMinutes: true,
        },
      }),
      this.db.challenge.findMany({
        where: { ...live, skillId: id },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          family: true,
          title: true,
          summary: true,
          estimatedMinutes: true,
        },
      }),
    ]);
    return skillDetailSchema.parse({ ...summary, lessons, challenges });
  }

  @Get('skills/:skillId/lessons/:slug')
  async lesson(
    @Param('skillId') rawId: string,
    @Param('slug') rawSlug: string,
  ) {
    const skillId = parseInput(contentIdSchema, rawId);
    const slug = parseInput(slugSchema, rawSlug);
    const lessons = await this.db.lesson.findMany({
      where: { ...live, skillId, skill: live },
      orderBy: { position: 'asc' },
      include: { skill: { select: { title: true } } },
    });
    const index = lessons.findIndex((lesson) => lesson.slug === slug);
    const lesson = lessons[index];
    if (!lesson) throw notFound('Lesson');
    const link = (other?: { slug: string; title: string }) =>
      other ? { slug: other.slug, title: other.title } : null;
    return lessonDetailSchema.parse({
      slug: lesson.slug,
      position: lesson.position,
      title: lesson.title,
      summary: lesson.summary,
      durationMinutes: lesson.durationMinutes,
      skillId,
      skillTitle: lesson.skill.title,
      sources: lesson.sources,
      body: lesson.body,
      previous: link(lessons[index - 1]),
      next: link(lessons[index + 1]),
    });
  }

  @Get('challenges/:challengeId')
  async challenge(@Param('challengeId') rawId: string) {
    const id = parseInput(contentIdSchema, rawId);
    const challenge = await this.db.challenge.findFirst({
      where: { ...live, id, skill: live },
      include: { skill: { select: { title: true } } },
    });
    if (!challenge) throw notFound('Challenge');
    // examinerNotes are deliberately omitted: they are the answer key.
    return challengeDetailSchema.parse({
      id: challenge.id,
      family: challenge.family,
      title: challenge.title,
      summary: challenge.summary,
      estimatedMinutes: challenge.estimatedMinutes,
      skillId: challenge.skillId,
      skillTitle: challenge.skill.title,
      instructions: challenge.instructions,
      deliverable: challenge.deliverable,
      rubric: toPublicRubric(challenge.rubricSnapshot, challenge.family),
    });
  }
}
