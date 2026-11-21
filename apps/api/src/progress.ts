import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PrismaClient } from '@kompri/db';
import { challengeSchema } from '@kompri/content';
import { progressResponseSchema } from '@kompri/shared';
import type { SkillState } from '@kompri/shared';
import { AuthGuard, CurrentUser } from './auth.ts';
import type { AuthenticatedUser } from './auth.ts';
import { CLOCK, DATABASE, hours, SETTINGS } from './context.ts';
import type { Clock, Settings } from './context.ts';

/**
 * A skill is validated while one passed validation is current. Prerequisites
 * only need to have been validated once: an expired prerequisite asks for a
 * renewal but does not lock the skills built on it.
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
  return skills.map((skill) => {
    const validation = latest.get(skill.id) ?? null;
    let state: SkillState;
    if (validation)
      state = validation.expiresAt > now ? 'validated' : 'expired';
    else if (skill.status !== 'PUBLISHED') state = 'upcoming';
    else
      state = skill.prerequisites.every((id) => latest.has(id))
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

  @Get('me/progress')
  async progress(@CurrentUser() user: AuthenticatedUser) {
    const now = this.now();
    const [skills, validations, used, sessions] = await Promise.all([
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
