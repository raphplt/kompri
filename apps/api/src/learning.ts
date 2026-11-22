import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PrismaClient } from '@kompri/db';
import { challengeSchema, rubricSchema } from '@kompri/content';
import type { Rubric } from '@kompri/content';
import {
  abandonOral,
  answerOral,
  gradeOral,
  gradeSchema,
  prepareOral,
} from '@kompri/examiner';
import type { Grade, OralState } from '@kompri/examiner';
import {
  answerRequestSchema,
  attemptCreateSchema,
  attemptResponseSchema,
  contentIdSchema,
  oralViewSchema,
  z,
} from '@kompri/shared';
import { AuthGuard, CurrentUser } from './auth.ts';
import { acquiredSkills } from './progress.ts';
import type { AuthenticatedUser } from './auth.ts';
import { CLOCK, DATABASE, days, EXAMINER, hours, SETTINGS } from './context.ts';
import type { Clock, Examiner, Settings } from './context.ts';
import {
  ApiException,
  conflict,
  forbidden,
  isUniqueViolation,
  notFound,
  parseInput,
} from './errors.ts';

/** Network latency allowance after the displayed deadline. */
export const graceSeconds = 15;
export const maxGradingTries = 3;
const planSchema = z.object({ questions: z.array(z.string()).min(1) });
const uuidSchema = z.uuid();
const startOralSchema = z
  .object({ placement: z.boolean().default(false) })
  .strict();

const oralStatus = {
  ACTIVE: 'active',
  GRADING_FAILED: 'grading_failed',
  COMPLETED: 'completed',
} as const;

type SessionWithContext = Awaited<ReturnType<LearningService['loadSession']>>;

@Injectable()
export class LearningService {
  private readonly logger = new Logger('Oral');
  constructor(
    @Inject(DATABASE) private readonly db: PrismaClient,
    @Inject(SETTINGS) private readonly settings: Settings,
    @Inject(EXAMINER) private readonly examiner: Examiner,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  // Attempts ---------------------------------------------------------------

  async createAttempt(user: AuthenticatedUser, input: unknown) {
    const { challengeId, work } = parseInput(attemptCreateSchema, input);
    const challenge = await this.db.challenge.findFirst({
      where: {
        id: challengeId,
        archivedAt: null,
        skill: { archivedAt: null, status: 'PUBLISHED' },
      },
    });
    if (!challenge) throw notFound('Challenge');
    // The snapshot freezes the exact statement, answer key and rubric of the attempt.
    const snapshot = challengeSchema.parse({
      id: challenge.id,
      skillId: challenge.skillId,
      family: challenge.family,
      title: challenge.title,
      summary: challenge.summary ?? undefined,
      estimatedMinutes: challenge.estimatedMinutes ?? undefined,
      instructions: challenge.instructions,
      deliverable: challenge.deliverable ?? undefined,
      examinerNotes: challenge.examinerNotes ?? undefined,
      rubricId: challenge.rubricId,
    });
    const attempt = await this.db.attempt.create({
      data: {
        userId: user.id,
        challengeId,
        submittedWork: work,
        challengeSnapshot: { ...snapshot, rubric: challenge.rubricSnapshot },
        createdAt: this.now(),
      },
      include: { sessions: true },
    });
    return this.toAttemptResponse(attempt);
  }

  private toAttemptResponse(attempt: {
    id: string;
    challengeId: string;
    submittedWork: string;
    createdAt: Date;
    challengeSnapshot: unknown;
    sessions: { id: string; status: keyof typeof oralStatus }[];
  }) {
    const snapshot = challengeSchema.parse(attempt.challengeSnapshot);
    const oral = attempt.sessions[0];
    return attemptResponseSchema.parse({
      id: attempt.id,
      challengeId: attempt.challengeId,
      challengeTitle: snapshot.title,
      skillId: snapshot.skillId,
      work: attempt.submittedWork,
      createdAt: attempt.createdAt.toISOString(),
      oral: oral ? { id: oral.id, status: oralStatus[oral.status] } : null,
    });
  }

  async listAttempts(user: AuthenticatedUser, query: unknown) {
    const { challengeId } = parseInput(
      z.object({ challengeId: contentIdSchema.optional() }).strict(),
      query,
    );
    const attempts = await this.db.attempt.findMany({
      where: { userId: user.id, ...(challengeId ? { challengeId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { sessions: true },
    });
    return attempts.map((attempt) => this.toAttemptResponse(attempt));
  }

  async getAttempt(user: AuthenticatedUser, rawId: string) {
    const attempt = await this.db.attempt.findFirst({
      where: { id: parseInput(uuidSchema, rawId), userId: user.id },
      include: { sessions: true },
    });
    if (!attempt) throw notFound('Attempt');
    return this.toAttemptResponse(attempt);
  }

  // Orals --------------------------------------------------------------------

  private windowStart() {
    return new Date(
      this.now().getTime() - hours(this.settings.ORAL_WINDOW_HOURS),
    );
  }

  async startOral(
    user: AuthenticatedUser,
    rawAttemptId: string,
    input: unknown = {},
  ) {
    const { placement } = parseInput(startOralSchema, input ?? {});
    const attempt = await this.db.attempt.findFirst({
      where: { id: parseInput(uuidSchema, rawAttemptId), userId: user.id },
      include: {
        sessions: { select: { id: true } },
        challenge: {
          include: {
            skill: { include: { prerequisites: true } },
          },
        },
      },
    });
    if (!attempt) throw notFound('Attempt');
    if (attempt.sessions.length)
      throw conflict(
        'oral_exists',
        'This attempt already has an oral; submit a new attempt to try again',
      );
    const { skill } = attempt.challenge;
    if (skill.archivedAt || skill.status !== 'PUBLISHED')
      throw forbidden('skill_unavailable', 'This skill is not available');
    const prerequisites = skill.prerequisites.map((p) => p.prerequisiteId);
    if (prerequisites.length) {
      const [edges, validated] = await Promise.all([
        this.db.skillPrerequisite.findMany({
          select: { skillId: true, prerequisiteId: true },
        }),
        this.db.validation.findMany({
          where: { userId: user.id, verdict: 'PASSED' },
          distinct: ['skillId'],
          select: { skillId: true },
        }),
      ]);
      const graph = new Map<string, string[]>();
      for (const edge of edges)
        graph.set(edge.skillId, [
          ...(graph.get(edge.skillId) ?? []),
          edge.prerequisiteId,
        ]);
      const acquired = acquiredSkills(
        graph,
        validated.map((v) => v.skillId),
      );
      // A placement oral lets an experienced learner skip the prerequisites.
      if (!placement && prerequisites.some((id) => !acquired.has(id)))
        throw forbidden(
          'prerequisites_missing',
          'Validate the prerequisite skills or take a placement oral',
        );
    }
    const active = await this.db.oralSession.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      select: { id: true },
    });
    if (active)
      throw conflict('oral_in_progress', `Oral ${active.id} is in progress`);
    await this.assertQuota(this.db, user.id);

    const snapshot = attempt.challengeSnapshot as Record<string, unknown>;
    const challenge = challengeSchema.parse(snapshot);
    const rubric = rubricSchema.parse(snapshot.rubric);
    const startedAt = this.now();
    let state: OralState;
    try {
      state = await prepareOral(
        {
          challenge,
          rubric,
          submission: attempt.submittedWork,
          at: startedAt.toISOString(),
          questionCount: this.settings.ORAL_QUESTION_COUNT,
        },
        this.examiner.client,
      );
    } catch {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'examiner_unavailable',
        'The examiner could not prepare the oral, please retry',
      );
    }
    try {
      const session = await this.db.$transaction(async (tx) => {
        // Serialize quota reservations of one learner across concurrent requests.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
        await this.assertQuota(tx, user.id);
        const created = await tx.oralSession.create({
          data: {
            userId: user.id,
            attemptId: attempt.id,
            model: state.model,
            provider: this.examiner.provider,
            rubricSnapshot: rubric,
            plan: { questions: state.questions },
            status: 'ACTIVE',
            startedAt,
            questionDeadline: this.deadlineFrom(startedAt),
            turns: {
              create: {
                sequence: 0,
                speaker: 'EXAMINER',
                text: state.turns[0]!.text,
                model: state.model,
                createdAt: startedAt,
              },
            },
          },
        });
        await tx.oralUsage.create({
          data: {
            userId: user.id,
            sessionId: created.id,
            consumedAt: startedAt,
          },
        });
        return created;
      });
      return this.view(user, session.id);
    } catch (error) {
      if (isUniqueViolation(error))
        throw conflict('oral_in_progress', 'Another oral is in progress');
      throw error;
    }
  }

  private async assertQuota(
    db: Pick<PrismaClient, 'oralUsage'>,
    userId: string,
  ) {
    const used = await db.oralUsage.count({
      where: { userId, consumedAt: { gte: this.windowStart() } },
    });
    if (used >= this.settings.ORAL_LIMIT_PER_WINDOW)
      throw new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'quota_exceeded',
        'Oral quota reached for the current period',
      );
  }

  private deadlineFrom(at: Date) {
    return new Date(at.getTime() + this.settings.ORAL_ANSWER_SECONDS * 1000);
  }

  private async loadSession(user: AuthenticatedUser, rawId: string) {
    const session = await this.db.oralSession.findFirst({
      where: { id: parseInput(uuidSchema, rawId), userId: user.id },
      include: {
        turns: { orderBy: { sequence: 'asc' } },
        attempt: true,
        validation: true,
      },
    });
    if (!session) throw notFound('Oral');
    return session;
  }

  private toState(session: SessionWithContext): OralState {
    const snapshot = session.attempt.challengeSnapshot as Record<
      string,
      unknown
    >;
    const questions = planSchema.parse(session.plan).questions;
    const answered = session.turns.filter((t) => t.speaker === 'LEARNER');
    return {
      challenge: challengeSchema.parse(snapshot),
      rubric: rubricSchema.parse(session.rubricSnapshot),
      submission: session.attempt.submittedWork,
      model: session.model,
      questions,
      turns: session.turns.map((turn) => ({
        speaker: turn.speaker === 'EXAMINER' ? 'examiner' : 'learner',
        text: turn.text,
        at: turn.createdAt.toISOString(),
      })),
      status:
        session.status === 'ACTIVE' && answered.length < questions.length
          ? 'active'
          : 'ready',
    };
  }

  async view(user: AuthenticatedUser, rawId: string) {
    const session = await this.loadSession(user, rawId);
    const snapshot = challengeSchema.parse(session.attempt.challengeSnapshot);
    const rubric = rubricSchema.parse(session.rubricSnapshot);
    const questions = planSchema.parse(session.plan).questions;
    const grade = session.grade ? gradeSchema.parse(session.grade) : null;
    return oralViewSchema.parse({
      id: session.id,
      attemptId: session.attemptId,
      challengeId: snapshot.id,
      challengeTitle: snapshot.title,
      skillId: snapshot.skillId,
      status: oralStatus[session.status],
      questionCount: questions.length,
      answeredCount: session.turns.filter((t) => t.speaker === 'LEARNER')
        .length,
      answerTimeLimitSeconds: this.settings.ORAL_ANSWER_SECONDS,
      deadline:
        session.status === 'ACTIVE'
          ? (session.questionDeadline?.toISOString() ?? null)
          : null,
      serverTime: this.now().toISOString(),
      startedAt: session.startedAt.toISOString(),
      turns: this.toState(session).turns,
      result:
        grade && session.verdict
          ? this.toResult(grade, rubric, session.validation?.expiresAt ?? null)
          : null,
    });
  }

  private toResult(grade: Grade, rubric: Rubric, expiresAt: Date | null) {
    return {
      verdict: grade.verdict,
      score: grade.criteria.reduce((sum, c) => sum + c.score, 0),
      maxScore: rubric.criteria.reduce((sum, c) => sum + c.maxScore, 0),
      passRatio: rubric.passRatio,
      feedback: grade.feedback ?? null,
      criteria: rubric.criteria.map((criterion) => {
        const score = grade.criteria.find(
          (c) => c.criterionId === criterion.id,
        )!;
        return {
          criterionId: criterion.id,
          description: criterion.description,
          score: score.score,
          maxScore: criterion.maxScore,
          justification: score.justification,
        };
      }),
      validationExpiresAt: expiresAt?.toISOString() ?? null,
    };
  }

  async answer(user: AuthenticatedUser, rawId: string, input: unknown) {
    const { text } = parseInput(answerRequestSchema, input);
    const session = await this.loadSession(user, rawId);
    if (session.status !== 'ACTIVE')
      throw conflict('oral_closed', 'This oral is no longer in progress');
    const now = this.now();
    const late =
      !session.questionDeadline ||
      now.getTime() > session.questionDeadline.getTime() + graceSeconds * 1000;
    const state = this.toState(session);
    let next: OralState;
    try {
      next =
        late || !text.trim()
          ? await this.skipQuestion(state, now)
          : await answerOral(
              state,
              text,
              now.toISOString(),
              this.examiner.client,
            );
    } catch (error) {
      if (error instanceof Error && error.message.includes('switch model'))
        throw conflict(
          'examiner_changed',
          'The examiner model changed during this oral',
        );
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'examiner_unavailable',
        'The examiner is unavailable, please resend your answer',
      );
    }
    await this.persistTurns(session, next, now);
    if (next.status === 'ready') await this.grade(session.id, next, now);
    return this.view(user, session.id);
  }

  /** An empty or late answer is recorded as unanswered and the oral moves on. */
  private async skipQuestion(state: OralState, now: Date): Promise<OralState> {
    const skipped = abandonOral(state, now.toISOString());
    const answered = skipped.turns.filter((t) => t.speaker === 'learner');
    if (answered.length >= state.questions.length) return skipped;
    const question = state.questions[answered.length]!;
    return {
      ...skipped,
      status: 'active',
      turns: [
        ...skipped.turns,
        { speaker: 'examiner', text: question, at: now.toISOString() },
      ],
    };
  }

  private async persistTurns(
    session: SessionWithContext,
    next: OralState,
    now: Date,
  ) {
    const added = next.turns.slice(session.turns.length);
    try {
      await this.db.$transaction(async (tx) => {
        await tx.oralTurn.createMany({
          data: added.map((turn, index) => ({
            sessionId: session.id,
            sequence: session.turns.length + index,
            speaker: turn.speaker === 'examiner' ? 'EXAMINER' : 'LEARNER',
            text: turn.text,
            model: turn.speaker === 'examiner' ? session.model : null,
            createdAt: new Date(turn.at),
          })),
        });
        await tx.oralSession.update({
          where: { id: session.id },
          data: {
            questionDeadline:
              next.status === 'active' ? this.deadlineFrom(now) : null,
          },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw conflict('answer_conflict', 'This question was already answered');
      throw error;
    }
  }

  private async grade(sessionId: string, state: OralState, now: Date) {
    let grade: Grade | null = null;
    let tries = 0;
    while (!grade && tries < maxGradingTries) {
      tries++;
      try {
        grade = await gradeOral(state, this.examiner.client);
      } catch {
        this.logger.warn(`Grading attempt ${tries} failed`);
      }
    }
    const session = await this.db.oralSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { attempt: { select: { challengeSnapshot: true } } },
    });
    if (!grade) {
      await this.db.oralSession.update({
        where: { id: sessionId },
        data: {
          status: 'GRADING_FAILED',
          gradingAttempts: { increment: tries },
          questionDeadline: null,
          endedAt: now,
        },
      });
      return;
    }
    const skillId = challengeSchema.parse(
      session.attempt.challengeSnapshot,
    ).skillId;
    await this.db.$transaction(async (tx) => {
      await tx.oralSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          verdict: grade.verdict,
          grade,
          gradedAt: now,
          gradingAttempts: { increment: tries },
          questionDeadline: null,
          endedAt: session.endedAt ?? now,
        },
      });
      if (grade.verdict === 'PASSED')
        await tx.validation.create({
          data: {
            userId: session.userId,
            skillId,
            oralSessionId: sessionId,
            verdict: 'PASSED',
            criteria: grade.criteria,
            validatedAt: now,
            expiresAt: new Date(
              now.getTime() + days(this.settings.VALIDATION_DAYS),
            ),
          },
        });
    });
  }

  async abandon(user: AuthenticatedUser, rawId: string) {
    const session = await this.loadSession(user, rawId);
    if (session.status !== 'ACTIVE')
      throw conflict('oral_closed', 'This oral is no longer in progress');
    const now = this.now();
    const next = abandonOral(this.toState(session), now.toISOString());
    await this.persistTurns(session, next, now);
    await this.grade(session.id, next, now);
    return this.view(user, session.id);
  }

  async retryGrading(user: AuthenticatedUser, rawId: string) {
    const session = await this.loadSession(user, rawId);
    if (session.status !== 'GRADING_FAILED' || !session.plan)
      throw conflict('not_retryable', 'This oral does not need grading');
    const state = this.toState(session);
    if (state.status !== 'ready')
      throw conflict('not_retryable', 'This oral is incomplete');
    await this.grade(session.id, state, this.now());
    return this.view(user, session.id);
  }
}

@ApiTags('learning')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class LearningController {
  constructor(
    @Inject(LearningService) private readonly learning: LearningService,
  ) {}

  @Post('attempts')
  createAttempt(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.learning.createAttempt(user, body);
  }

  @Get('attempts')
  listAttempts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: unknown,
  ) {
    return this.learning.listAttempts(user, query);
  }

  @Get('attempts/:id')
  getAttempt(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.learning.getAttempt(user, id);
  }

  @Post('attempts/:id/oral')
  startOral(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.learning.startOral(user, id, body);
  }

  @Get('orals/:id')
  view(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.learning.view(user, id);
  }

  @Post('orals/:id/answers')
  @HttpCode(200)
  answer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.learning.answer(user, id, body);
  }

  @Post('orals/:id/abandon')
  @HttpCode(200)
  abandon(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.learning.abandon(user, id);
  }

  @Post('orals/:id/grade')
  @HttpCode(200)
  retryGrading(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.learning.retryGrading(user, id);
  }
}
