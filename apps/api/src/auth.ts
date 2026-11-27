import { createHash, randomBytes } from 'node:crypto';
import {
  Body,
  Controller,
  createParamDecorator,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PrismaClient } from '@kompri/db';
import { deleteUserData } from '@kompri/db';
import {
  authResponseSchema,
  deleteAccountRequestSchema,
  changeEmailRequestSchema,
  changePasswordRequestSchema,
  forgotPasswordRequestSchema,
  verifyEmailRequestSchema,
  loginRequestSchema,
  resetPasswordRequestSchema,
  registerRequestSchema,
  userResponseSchema,
} from '@kompri/shared';
import { CLOCK, DATABASE, days, hours, MAILER, SETTINGS } from './context.ts';
import type { Mailer } from './mailer.ts';
import type { Clock, Settings } from './context.ts';
import {
  ApiException,
  conflict,
  isUniqueViolation,
  parseInput,
  unauthorized,
} from './errors.ts';
import { dummyHash, hashPassword, verifyPassword } from './password.ts';

export const maxFailedLogins = 5;
export const lockMinutes = 15;
export const resetLinkMinutes = 60;
export const maxResetsPerHour = 3;

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  emailVerifiedAt: Date | null;
  role: 'LEARNER' | 'ADMIN';
  sessionId: string;
}

export const verificationLinkHours = 24;
export const maxVerificationsPerHour = 3;

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const toUserResponse = (user: {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  emailVerifiedAt: Date | null;
  role: 'LEARNER' | 'ADMIN';
}) =>
  userResponseSchema.parse({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
    emailVerified: user.emailVerifiedAt !== null,
    role: user.role === 'ADMIN' ? 'admin' : 'learner',
  });

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');
  constructor(
    @Inject(DATABASE) private readonly db: PrismaClient,
    @Inject(SETTINGS) private readonly settings: Settings,
    @Inject(CLOCK) private readonly now: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  /** Always succeeds from the caller's view, so that accounts cannot be probed. */
  async forgotPassword(input: unknown) {
    const { email } = parseInput(forgotPasswordRequestSchema, input);
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) return;
    const now = this.now();
    const recent = await this.db.passwordReset.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(now.getTime() - hours(1)) },
      },
    });
    if (recent >= maxResetsPerHour) return;
    const token = randomBytes(32).toString('base64url');
    await this.db.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        createdAt: now,
        expiresAt: new Date(now.getTime() + resetLinkMinutes * 60_000),
      },
    });
    const link = new URL('/mot-de-passe/nouveau', this.settings.WEB_URL);
    link.searchParams.set('jeton', token);
    await this.mailer.send({
      to: user.email,
      subject: 'Réinitialisation de ton mot de passe Kompri',
      text: [
        `Bonjour ${user.displayName ?? ''},`.trim(),
        '',
        'Tu as demandé à réinitialiser ton mot de passe Kompri. Ce lien est valable une heure et ne fonctionne qu’une fois :',
        '',
        link.toString(),
        '',
        'Si tu n’es pas à l’origine de cette demande, ignore ce message : ton mot de passe reste inchangé.',
      ].join('\n'),
    });
  }

  async resetPassword(input: unknown) {
    const { token, password } = parseInput(resetPasswordRequestSchema, input);
    const now = this.now();
    const reset = await this.db.passwordReset.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!reset || reset.usedAt || reset.expiresAt <= now)
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'reset_link_invalid',
        'This reset link is invalid or expired',
      );
    const passwordHash = await hashPassword(password);
    await this.db.$transaction(async (tx) => {
      // Marking the link as used inside the transaction forbids a double use.
      const used = await tx.passwordReset.updateMany({
        where: { id: reset.id, usedAt: null },
        data: { usedAt: now },
      });
      if (used.count !== 1)
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          'reset_link_invalid',
          'This reset link is invalid or expired',
        );
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      });
      // Every open session ends: whoever knew the old password is logged out.
      await tx.authSession.deleteMany({ where: { userId: reset.userId } });
      await tx.passwordReset.deleteMany({
        where: { userId: reset.userId, usedAt: null },
      });
    });
  }

  private async openSession(user: {
    id: string;
    email: string;
    displayName: string | null;
    createdAt: Date;
    emailVerifiedAt: Date | null;
    role: 'LEARNER' | 'ADMIN';
  }) {
    const token = randomBytes(32).toString('base64url');
    const createdAt = this.now();
    const expiresAt = new Date(
      createdAt.getTime() + days(this.settings.SESSION_DAYS),
    );
    await this.db.authSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        createdAt,
        lastSeenAt: createdAt,
        expiresAt,
      },
    });
    return authResponseSchema.parse({
      token,
      expiresAt: expiresAt.toISOString(),
      user: toUserResponse(user),
    });
  }

  async register(input: unknown) {
    const { email, password, displayName } = parseInput(
      registerRequestSchema,
      input,
    );
    const passwordHash = await hashPassword(password);
    let user;
    try {
      user = await this.db.user.create({
        data: { email, displayName, passwordHash, createdAt: this.now() },
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw conflict('email_taken', 'An account already uses this email');
      throw error;
    }
    // The account exists: a mail outage must not fail the sign-up. The learner
    // can ask for a new link from the account page.
    await this.sendVerification(user, email).catch(() =>
      this.logger.warn('Verification e-mail not sent at sign-up'),
    );
    return this.openSession(user);
  }

  async login(input: unknown) {
    const { email, password } = parseInput(loginRequestSchema, input);
    const user = await this.db.user.findUnique({ where: { email } });
    const now = this.now();
    const refused = () =>
      // A locked account answers like a wrong password: no enumeration.
      unauthorized('invalid_credentials', 'Invalid email or password');
    if (user) {
      // Count the attempt before the costly check, atomically: parallel
      // requests cannot all pass on the same counter value.
      const [claim] = await this.db.$queryRaw<{ failures: number }[]>`
        UPDATE "User" SET "failedLoginCount" = "failedLoginCount" + 1
        WHERE "id" = ${user.id}
          AND ("lockedUntil" IS NULL OR "lockedUntil" <= ${now})
        RETURNING "failedLoginCount" AS failures`;
      if (!claim) {
        await verifyPassword(password, dummyHash);
        throw refused();
      }
      if (claim.failures > maxFailedLogins) {
        await this.lock(user.id, now);
        await verifyPassword(password, dummyHash);
        throw refused();
      }
    }
    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? dummyHash,
    );
    if (!user || !user.passwordHash || !valid) {
      if (user) {
        const { failedLoginCount } = await this.db.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { failedLoginCount: true },
        });
        if (failedLoginCount >= maxFailedLogins) await this.lock(user.id, now);
      }
      throw refused();
    }
    await this.db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    return this.openSession(user);
  }

  private async lock(userId: string, now: Date) {
    await this.db.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: 0,
        lockedUntil: new Date(now.getTime() + lockMinutes * 60_000),
      },
    });
  }

  async authenticate(token: string): Promise<AuthenticatedUser | null> {
    const session = await this.db.authSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= this.now()) return null;
    const { user } = session;
    const now = this.now();
    // Activity feeds the inactive-account purge; one write per hour at most.
    if (
      !user.lastActiveAt ||
      now.getTime() - user.lastActiveAt.getTime() > hours(1)
    )
      await this.db.user.update({
        where: { id: user.id },
        // Coming back cancels a pending inactivity notice.
        data: { lastActiveAt: now, inactivityNoticeAt: null },
      });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt,
      role: user.role,
      sessionId: session.id,
    };
  }

  /** Sends a link proving control of `email`; the account switches to it once used. */
  private async sendVerification(
    user: { id: string; displayName: string | null },
    email: string,
  ) {
    const now = this.now();
    const recent = await this.db.emailVerification.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(now.getTime() - hours(1)) },
      },
    });
    if (recent >= maxVerificationsPerHour) return false;
    const token = randomBytes(32).toString('base64url');
    await this.db.emailVerification.create({
      data: {
        userId: user.id,
        email,
        tokenHash: hashToken(token),
        createdAt: now,
        expiresAt: new Date(now.getTime() + hours(verificationLinkHours)),
      },
    });
    const link = new URL('/compte/verifier', this.settings.WEB_URL);
    link.searchParams.set('jeton', token);
    await this.mailer.send({
      to: email,
      subject: 'Confirme ton adresse e-mail Kompri',
      text: [
        `Bonjour ${user.displayName ?? ''},`.trim(),
        '',
        'Pour confirmer ton adresse e-mail, ouvre ce lien (valable 24 heures) :',
        '',
        link.toString(),
        '',
        'Si tu n’as pas créé de compte Kompri, ignore ce message.',
      ].join('\n'),
    });
    return true;
  }

  async resendVerification(user: AuthenticatedUser) {
    if (user.emailVerifiedAt)
      throw conflict('email_already_verified', 'Email already verified');
    if (!(await this.sendVerification(user, user.email)))
      throw new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'verification_rate_limited',
        'Too many verification e-mails, try again later',
      );
  }

  async verifyEmail(input: unknown) {
    const { token } = parseInput(verifyEmailRequestSchema, input);
    const now = this.now();
    const check = await this.db.emailVerification.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    const invalid = () =>
      new ApiException(
        HttpStatus.BAD_REQUEST,
        'verification_link_invalid',
        'This verification link is invalid or expired',
      );
    if (!check || check.usedAt || check.expiresAt <= now) throw invalid();
    try {
      await this.db.$transaction(async (tx) => {
        const used = await tx.emailVerification.updateMany({
          where: { id: check.id, usedAt: null },
          data: { usedAt: now },
        });
        if (used.count !== 1) throw invalid();
        await tx.user.update({
          where: { id: check.userId },
          data: { email: check.email, emailVerifiedAt: now },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw conflict('email_taken', 'An account already uses this email');
      throw error;
    }
  }

  async changePassword(user: AuthenticatedUser, input: unknown) {
    const { currentPassword, newPassword } = parseInput(
      changePasswordRequestSchema,
      input,
    );
    await this.assertPassword(user.id, currentPassword);
    const passwordHash = await hashPassword(newPassword);
    await this.db.$transaction([
      this.db.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // Other devices are logged out; the current session stays open.
      this.db.authSession.deleteMany({
        where: { userId: user.id, id: { not: user.sessionId } },
      }),
    ]);
  }

  async changeEmail(user: AuthenticatedUser, input: unknown) {
    const { password, newEmail } = parseInput(changeEmailRequestSchema, input);
    await this.assertPassword(user.id, password);
    if (newEmail === user.email)
      throw conflict('email_unchanged', 'This is already your email');
    if (await this.db.user.count({ where: { email: newEmail } }))
      throw conflict('email_taken', 'An account already uses this email');
    if (!(await this.sendVerification(user, newEmail)))
      throw new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'verification_rate_limited',
        'Too many verification e-mails, try again later',
      );
    await this.mailer.send({
      to: user.email,
      subject: 'Changement d’adresse e-mail demandé sur Kompri',
      text: [
        'Un changement d’adresse e-mail a été demandé pour ton compte Kompri.',
        'Il ne prendra effet qu’après confirmation depuis la nouvelle adresse.',
        '',
        'Si tu n’es pas à l’origine de cette demande, change ton mot de passe.',
      ].join('\n'),
    });
  }

  private async assertPassword(userId: string, password: string) {
    const stored = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (
      !stored.passwordHash ||
      !(await verifyPassword(password, stored.passwordHash))
    )
      throw unauthorized('invalid_credentials', 'Invalid password');
  }

  async logout(user: AuthenticatedUser) {
    await this.db.authSession.deleteMany({ where: { id: user.sessionId } });
  }

  async deleteAccount(user: AuthenticatedUser, input: unknown) {
    const { password } = parseInput(deleteAccountRequestSchema, input);
    const stored = await this.db.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    if (
      !stored.passwordHash ||
      !(await verifyPassword(password, stored.passwordHash))
    )
      throw unauthorized('invalid_credentials', 'Invalid password');
    await deleteUserData(this.db, user.id);
  }

  async exportData(user: AuthenticatedUser) {
    const data = await this.db.user.findUniqueOrThrow({
      where: { id: user.id },
      // Every table holding personal rows is exported (a test checks it
      // against the database). Password hashes and lock counters are omitted:
      // they are security internals, not information about the person.
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        emailVerifiedAt: true,
        lastActiveAt: true,
        inactivityNoticeAt: true,
        createdAt: true,
        authSessions: {
          orderBy: { createdAt: 'asc' },
          select: {
            createdAt: true,
            lastSeenAt: true,
            expiresAt: true,
          },
        },
        passwordResets: {
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true, expiresAt: true, usedAt: true },
        },
        emailChecks: {
          orderBy: { createdAt: 'asc' },
          select: {
            email: true,
            createdAt: true,
            expiresAt: true,
            usedAt: true,
          },
        },
        reviewRequests: {
          orderBy: { createdAt: 'asc' },
          select: {
            oralSessionId: true,
            message: true,
            status: true,
            response: true,
            createdAt: true,
            decidedAt: true,
          },
        },
        reviewsDecided: {
          select: { oralSessionId: true, status: true, decidedAt: true },
        },
        tutorUsage: {
          orderBy: { consumedAt: 'asc' },
          select: { consumedAt: true },
        },
        attempts: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            challengeId: true,
            submittedWork: true,
            createdAt: true,
          },
        },
        sessions: {
          orderBy: { startedAt: 'asc' },
          select: {
            id: true,
            attemptId: true,
            provider: true,
            model: true,
            status: true,
            verdict: true,
            grade: true,
            startedAt: true,
            endedAt: true,
            turns: {
              orderBy: { sequence: 'asc' },
              select: {
                speaker: true,
                text: true,
                createdAt: true,
                signals: true,
              },
            },
          },
        },
        validations: {
          orderBy: { validatedAt: 'asc' },
          select: {
            skillId: true,
            verdict: true,
            validatedAt: true,
            expiresAt: true,
          },
        },
        oralUsage: { select: { sessionId: true, consumedAt: true } },
        lessonProgress: { select: { lessonId: true, completedAt: true } },
      },
    });
    return { exportedAt: this.now().toISOString(), ...data };
  }
}

type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const header = request.headers.authorization;
    const match =
      typeof header === 'string'
        ? /^Bearer ([\w-]{20,200})$/.exec(header)
        : null;
    if (!match) throw unauthorized();
    const user = await this.auth.authenticate(match[1]!);
    if (!user) throw unauthorized('session_expired', 'Session expired');
    request.user = user;
    return true;
  }
}

/** Requires an authenticated administrator; use after AuthGuard. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (request.user?.role !== 'ADMIN')
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'admin_only',
        'Administrator access required',
      );
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<RequestWithUser>().user!,
);

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('auth/register')
  register(@Body() body: unknown) {
    return this.auth.register(body);
  }

  @Post('auth/login')
  @HttpCode(200)
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  @Post('auth/password/forgot')
  @HttpCode(202)
  async forgotPassword(@Body() body: unknown) {
    await this.auth.forgotPassword(body);
    return {};
  }

  @Post('auth/password/reset')
  @HttpCode(204)
  async resetPassword(@Body() body: unknown) {
    await this.auth.resetPassword(body);
  }

  @Post('auth/email/verify')
  @HttpCode(204)
  async verifyEmail(@Body() body: unknown) {
    await this.auth.verifyEmail(body);
  }

  @Post('me/email/verification')
  @HttpCode(202)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async resendVerification(@CurrentUser() user: AuthenticatedUser) {
    await this.auth.resendVerification(user);
    return {};
  }

  @Post('me/password')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    await this.auth.changePassword(user, body);
  }

  @Post('me/email')
  @HttpCode(202)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async changeEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    await this.auth.changeEmail(user, body);
    return {};
  }

  @Post('auth/logout')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.auth.logout(user);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthenticatedUser) {
    return toUserResponse(user);
  }

  @Get('me/export')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  exportData(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.exportData(user);
  }

  @Delete('me')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    await this.auth.deleteAccount(user, body);
  }
}
