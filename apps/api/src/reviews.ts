import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PrismaClient } from '@kompri/db';
import { challengeSchema, rubricSchema } from '@kompri/content';
import { gradeSchema } from '@kompri/examiner';
import {
  adminReviewDetailSchema,
  adminStatsSchema,
  adminReviewSummarySchema,
  reviewDecisionSchema,
  reviewRequestSchema,
  z,
} from '@kompri/shared';
import { AdminGuard, AuthGuard, CurrentUser } from './auth.ts';
import type { AuthenticatedUser } from './auth.ts';
import { CLOCK, DATABASE, days, MAILER, SETTINGS } from './context.ts';
import type { Clock, Settings } from './context.ts';
import { conflict, notFound, parseInput } from './errors.ts';
import { buildResult, reviewStatus } from './learning.ts';
import type { Mailer } from './mailer.ts';

const uuidSchema = z.uuid();

@Injectable()
export class ReviewService {
  constructor(
    @Inject(DATABASE) private readonly db: PrismaClient,
    @Inject(SETTINGS) private readonly settings: Settings,
    @Inject(CLOCK) private readonly now: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /** A learner contests one completed oral, once, within the review window. */
  async request(user: AuthenticatedUser, rawOralId: string, input: unknown) {
    const { message } = parseInput(reviewRequestSchema, input);
    const session = await this.db.oralSession.findFirst({
      where: { id: parseInput(uuidSchema, rawOralId), userId: user.id },
      include: { reviewRequest: true },
    });
    if (!session) throw notFound('Oral');
    if (session.status !== 'COMPLETED' || !session.gradedAt)
      throw conflict('review_not_allowed', 'Only graded orals can be reviewed');
    if (session.reviewRequest)
      throw conflict('review_exists', 'A review was already requested');
    const now = this.now();
    if (
      now.getTime() >
      session.gradedAt.getTime() + days(this.settings.REVIEW_WINDOW_DAYS)
    )
      throw conflict('review_window_closed', 'The review window has closed');
    await this.db.reviewRequest.create({
      data: {
        userId: user.id,
        oralSessionId: session.id,
        message,
        createdAt: now,
      },
    });
  }

  /** Aggregates only: no individual learner data leaves this method. */
  async stats() {
    const now = this.now();
    const [learners, active, orals7d, openReviews, completed, challenges] =
      await Promise.all([
        this.db.user.count({ where: { role: 'LEARNER' } }),
        this.db.user.count({
          where: {
            role: 'LEARNER',
            lastActiveAt: { gte: new Date(now.getTime() - days(30)) },
          },
        }),
        this.db.oralSession.count({
          where: { startedAt: { gte: new Date(now.getTime() - days(7)) } },
        }),
        this.db.reviewRequest.count({ where: { status: 'OPEN' } }),
        this.db.oralSession.findMany({
          where: { status: 'COMPLETED' },
          select: {
            verdict: true,
            grade: true,
            rubricSnapshot: true,
            attempt: { select: { challengeId: true } },
            reviewRequest: { select: { status: true } },
          },
        }),
        this.db.challenge.findMany({
          where: { archivedAt: null },
          orderBy: [{ skillId: 'asc' }, { position: 'asc' }],
          select: { id: true, title: true, skillId: true, family: true },
        }),
      ]);
    const rows = challenges.map((challenge) => {
      const orals = completed.filter(
        (o) => o.attempt.challengeId === challenge.id,
      );
      const ratios = orals.map((o) => {
        const grade = gradeSchema.parse(o.grade);
        const rubric = rubricSchema.parse(o.rubricSnapshot);
        const max = rubric.criteria.reduce((sum, c) => sum + c.maxScore, 0);
        return grade.criteria.reduce((sum, c) => sum + c.score, 0) / max;
      });
      return {
        challengeId: challenge.id,
        title: challenge.title,
        skillId: challenge.skillId,
        family: challenge.family,
        orals: orals.length,
        passRate: orals.length
          ? orals.filter((o) => o.verdict === 'PASSED').length / orals.length
          : null,
        averageScore: ratios.length
          ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length
          : null,
        reviews: orals.filter((o) => o.reviewRequest).length,
        overturned: orals.filter(
          (o) => o.reviewRequest?.status === 'OVERTURNED',
        ).length,
      };
    });
    return adminStatsSchema.parse({
      learners,
      activeLearners30d: active,
      orals7d,
      openReviews,
      challenges: rows,
    });
  }

  async list(status: 'open' | 'all') {
    const reviews = await this.db.reviewRequest.findMany({
      where: status === 'open' ? { status: 'OPEN' } : {},
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        user: { select: { displayName: true, email: true } },
        session: {
          select: {
            verdict: true,
            attempt: { select: { challengeSnapshot: true } },
          },
        },
      },
    });
    return reviews.map((review) => this.summary(review));
  }

  private summary(review: {
    id: string;
    status: 'OPEN' | 'CONFIRMED' | 'OVERTURNED';
    createdAt: Date;
    user: { displayName: string | null; email: string };
    session: {
      verdict: 'PASSED' | 'FAILED' | null;
      attempt: { challengeSnapshot: unknown };
    };
  }) {
    const challenge = challengeSchema.parse(
      review.session.attempt.challengeSnapshot,
    );
    return adminReviewSummarySchema.parse({
      id: review.id,
      status: reviewStatus[review.status],
      createdAt: review.createdAt.toISOString(),
      learner: review.user.displayName ?? review.user.email,
      challengeTitle: challenge.title,
      skillId: challenge.skillId,
      verdict: review.session.verdict ?? 'FAILED',
    });
  }

  private async load(rawId: string) {
    const review = await this.db.reviewRequest.findUnique({
      where: { id: parseInput(uuidSchema, rawId) },
      include: {
        user: { select: { displayName: true, email: true } },
        session: {
          include: {
            attempt: true,
            turns: { orderBy: { sequence: 'asc' } },
            validation: true,
          },
        },
      },
    });
    if (!review) throw notFound('Review');
    return review;
  }

  async detail(rawId: string) {
    const review = await this.load(rawId);
    const { session } = review;
    const challenge = challengeSchema.parse(session.attempt.challengeSnapshot);
    const rubric = rubricSchema.parse(session.rubricSnapshot);
    const grade = gradeSchema.parse(session.grade);
    return adminReviewDetailSchema.parse({
      ...this.summary(review),
      message: review.message,
      response: review.response,
      oralId: session.id,
      instructions: challenge.instructions,
      examinerNotes: challenge.examinerNotes ?? null,
      submission: session.attempt.submittedWork,
      turns: session.turns.map((turn) => ({
        speaker: turn.speaker === 'EXAMINER' ? 'examiner' : 'learner',
        text: turn.text,
        at: turn.createdAt.toISOString(),
      })),
      result: buildResult(
        grade,
        rubric,
        session.verdict ?? grade.verdict,
        session.validation?.expiresAt ?? null,
      ),
    });
  }

  /**
   * Confirming keeps the result. Overturning flips the verdict: a pass creates
   * the validation, a fail removes the validation the oral had produced.
   */
  async decide(admin: AuthenticatedUser, rawId: string, input: unknown) {
    const { decision, response } = parseInput(reviewDecisionSchema, input);
    const review = await this.load(rawId);
    if (review.status !== 'OPEN')
      throw conflict('review_closed', 'This review was already decided');
    const { session } = review;
    const challenge = challengeSchema.parse(session.attempt.challengeSnapshot);
    const now = this.now();
    const verdict = session.verdict ?? 'FAILED';
    const overturned = verdict === 'PASSED' ? 'FAILED' : 'PASSED';
    await this.db.$transaction(async (tx) => {
      const closed = await tx.reviewRequest.updateMany({
        where: { id: review.id, status: 'OPEN' },
        data: {
          status: decision === 'confirm' ? 'CONFIRMED' : 'OVERTURNED',
          response,
          decidedById: admin.id,
          decidedAt: now,
        },
      });
      if (closed.count !== 1)
        throw conflict('review_closed', 'This review was already decided');
      if (decision === 'confirm') return;
      await tx.oralSession.update({
        where: { id: session.id },
        data: { verdict: overturned },
      });
      if (overturned === 'PASSED')
        await tx.validation.create({
          data: {
            userId: session.userId,
            skillId: challenge.skillId,
            oralSessionId: session.id,
            verdict: 'PASSED',
            criteria: gradeSchema.parse(session.grade).criteria,
            validatedAt: now,
            expiresAt: new Date(
              now.getTime() + days(this.settings.VALIDATION_DAYS),
            ),
          },
        });
      else
        await tx.validation.deleteMany({
          where: { oralSessionId: session.id },
        });
    });
    const link = new URL(`/oraux/${session.id}`, this.settings.WEB_URL);
    await this.mailer.send({
      to: review.user.email,
      subject: 'Ta demande de réexamen sur Kompri a été traitée',
      text: [
        `Ta demande de réexamen de l’oral « ${challenge.title} » a été traitée :`,
        decision === 'confirm'
          ? 'le résultat est confirmé.'
          : `le résultat est modifié (${overturned === 'PASSED' ? 'compétence validée' : 'compétence non validée'}).`,
        '',
        response,
        '',
        `Détails : ${link.toString()}`,
      ].join('\n'),
    });
  }
}

@ApiTags('reviews')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class ReviewController {
  constructor(@Inject(ReviewService) private readonly reviews: ReviewService) {}

  @Post('orals/:id/review')
  @HttpCode(201)
  async request(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.reviews.request(user, id, body);
    return {};
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(@Inject(ReviewService) private readonly reviews: ReviewService) {}

  @Get('stats')
  stats() {
    return this.reviews.stats();
  }

  @Get('reviews')
  list(@Query() query: unknown) {
    const { status } = parseInput(
      z.object({ status: z.enum(['open', 'all']).default('open') }).strict(),
      query,
    );
    return this.reviews.list(status);
  }

  @Get('reviews/:id')
  detail(@Param('id') id: string) {
    return this.reviews.detail(id);
  }

  @Post('reviews/:id/decision')
  @HttpCode(204)
  async decide(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.reviews.decide(admin, id, body);
  }
}
