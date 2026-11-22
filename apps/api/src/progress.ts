import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PrismaClient } from '@kompri/db';
import { challengeSchema } from '@kompri/content';
import { contentIdSchema, progressResponseSchema, z } from '@kompri/shared';
import { notFound, parseInput } from './errors.ts';
import type { SkillState } from '@kompri/shared';
import { AuthGuard, CurrentUser } from './auth.ts';
import type { AuthenticatedUser } from './auth.ts';
import { CLOCK, DATABASE, hours, SETTINGS } from './context.ts';
import type { Clock, Settings } from './context.ts';

/**
 * Skills that count as acquired for unlocking: every skill validated at least
 * once, and every transitive prerequisite of such a skill. Passing a placement
 * oral on an advanced skill therefore unlocks what it builds on.
 */
export function acquiredSkills(
  prerequisitesOf: Map<string, string[]>,
  validated: Iterable<string>,
): Set<string> {
  const acquired = new Set<string>();
  const visit = (id: string) => {
    if (acquired.has(id)) return;
    acquired.add(id);
    for (const next of prerequisitesOf.get(id) ?? []) visit(next);
  };
  for (const id of validated) visit(id);
  return acquired;
}

/**
 * A skill is validated while one passed validation is current. Prerequisites
 * only need to be acquired: an expired prerequisite asks for a renewal but
 * does not lock the skills built on it.
 */
export function skillStates(
  skills: { id: string; status: string; prerequisites: string[] }[],
  validations: { skillId: string; validatedAt: Date; expiresAt: Date }[],
  now: Date,
) {
  const latest = new Map<string, { validatedAt: Date; expiresAt: Date }>();
  for (const validation of validations) {
    const current = latest.get(validation.skillId);
    if (!current || validation.expiresAt > current.expiresAt)
      latest.set(validation.skillId, validation);
  }
  const acquired = acquiredSkills(
    new Map(skills.map((skill) => [skill.id, skill.prerequisites])),
    latest.keys(),
  );
  return skills.map((skill) => {
    const validation = latest.get(skill.id) ?? null;
    let state: SkillState;
    if (validation)
      state = validation.expiresAt > now ? 'validated' : 'expired';
    else if (skill.status !== 'PUBLISHED') state = 'upcoming';
    else
      state = skill.prerequisites.every((id) => acquired.has(id))
        ? 'available'
        : 'locked';
    return {
      skillId: skill.id,
      state,
      validatedAt: validation?.validatedAt.toISOString() ?? null,
      expiresAt: validation?.expiresAt.toISOString() ?? null,
    };
  });
}

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class ProgressController {
  constructor(
    @Inject(DATABASE) private readonly db: PrismaClient,
    @Inject(SETTINGS) private readonly settings: Settings,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  private async lessonId(rawSkill: string, rawSlug: string) {
    const skillId = parseInput(contentIdSchema, rawSkill);
    const slug = parseInput(z.string().regex(/^[a-z0-9][a-z0-9-]*$/), rawSlug);
    const lesson = await this.db.lesson.findFirst({
      where: { skillId, slug, archivedAt: null },
      select: { id: true },
    });
    if (!lesson) throw notFound('Lesson');
    return lesson.id;
  }

  @Put('me/lessons/:skillId/:slug')
  @HttpCode(204)
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('skillId') skillId: string,
    @Param('slug') slug: string,
  ) {
    const lessonId = await this.lessonId(skillId, slug);
    await this.db.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      create: { userId: user.id, lessonId, completedAt: this.now() },
      update: {},
    });
  }

  @Delete('me/lessons/:skillId/:slug')
  @HttpCode(204)
  async markUnread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('skillId') skillId: string,
    @Param('slug') slug: string,
  ) {
    const lessonId = await this.lessonId(skillId, slug);
    await this.db.lessonProgress.deleteMany({
      where: { userId: user.id, lessonId },
    });
  }

  @Get('me/progress')
  async progress(@CurrentUser() user: AuthenticatedUser) {
    const now = this.now();
    const [skills, validations, used, sessions, read] = await Promise.all([
      this.db.skill.findMany({
        where: { archivedAt: null },
        orderBy: { position: 'asc' },
        select: { id: true, status: true, prerequisites: true },
      }),
      this.db.validation.findMany({
        where: { userId: user.id, verdict: 'PASSED' },
        select: { skillId: true, validatedAt: true, expiresAt: true },
      }),
      this.db.oralUsage.count({
        where: {
          userId: user.id,
          consumedAt: {
            gte: new Date(
              now.getTime() - hours(this.settings.ORAL_WINDOW_HOURS),
            ),
          },
        },
      }),
      this.db.oralSession.findMany({
        where: { userId: user.id },
        orderBy: { startedAt: 'desc' },
        take: 20,
        include: { attempt: { select: { challengeSnapshot: true } } },
      }),
      this.db.lessonProgress.findMany({
        where: { userId: user.id, lesson: { archivedAt: null } },
        select: { lessonId: true },
      }),
    ]);
    const statuses = {
      ACTIVE: 'active',
      GRADING_FAILED: 'grading_failed',
      COMPLETED: 'completed',
    } as const;
    return progressResponseSchema.parse({
      skills: skillStates(
        skills.map((skill) => ({
          id: skill.id,
          status: skill.status,
          prerequisites: skill.prerequisites.map((p) => p.prerequisiteId),
        })),
        validations,
        now,
      ),
      quota: {
        used,
        limit: this.settings.ORAL_LIMIT_PER_WINDOW,
        windowHours: this.settings.ORAL_WINDOW_HOURS,
      },
      activeOralId: sessions.find((s) => s.status === 'ACTIVE')?.id ?? null,
      completedLessons: read.map((r) => r.lessonId).sort(),
      recentOrals: sessions.map((session) => {
        const challenge = challengeSchema.parse(
          session.attempt.challengeSnapshot,
        );
        return {
          id: session.id,
          challengeId: challenge.id,
          challengeTitle: challenge.title,
          skillId: challenge.skillId,
          status: statuses[session.status],
          verdict: session.verdict,
          startedAt: session.startedAt.toISOString(),
        };
      }),
    });
  }
}
