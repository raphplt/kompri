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
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PrismaClient } from '@kompri/db';
import { deleteUserData } from '@kompri/db';
import {
  authResponseSchema,
  deleteAccountRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  userResponseSchema,
} from '@kompri/shared';
import { CLOCK, DATABASE, days, SETTINGS } from './context.ts';
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

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  sessionId: string;
}

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const toUserResponse = (user: {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
}) =>
  userResponseSchema.parse({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  });

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: PrismaClient,
    @Inject(SETTINGS) private readonly settings: Settings,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  private async openSession(user: {
    id: string;
    email: string;
    displayName: string | null;
    createdAt: Date;
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
    try {
      const user = await this.db.user.create({
        data: { email, displayName, passwordHash, createdAt: this.now() },
      });
      return await this.openSession(user);
    } catch (error) {
      if (isUniqueViolation(error))
        throw conflict('email_taken', 'An account already uses this email');
      throw error;
    }
  }

  async login(input: unknown) {
    const { email, password } = parseInput(loginRequestSchema, input);
    const user = await this.db.user.findUnique({ where: { email } });
    const now = this.now();
    if (user?.lockedUntil && user.lockedUntil > now)
      throw new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'account_locked',
        'Too many failed attempts, try again later',
      );
    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? dummyHash,
    );
    if (!user || !user.passwordHash || !valid) {
      if (user) {
        const failures = user.failedLoginCount + 1;
        await this.db.user.update({
          where: { id: user.id },
          data:
            failures >= maxFailedLogins
              ? {
                  failedLoginCount: 0,
                  lockedUntil: new Date(now.getTime() + lockMinutes * 60_000),
                }
              : { failedLoginCount: failures },
        });
      }
      throw unauthorized('invalid_credentials', 'Invalid email or password');
    }
    await this.db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    return this.openSession(user);
  }

  async authenticate(token: string): Promise<AuthenticatedUser | null> {
    const session = await this.db.authSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= this.now()) return null;
    const { user } = session;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      sessionId: session.id,
    };
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
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
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
              select: { speaker: true, text: true, createdAt: true },
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
