import 'reflect-metadata';
import {
  Controller,
  Get,
  Inject,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import { createDatabase } from '@kompri/db';
import type { PrismaClient } from '@kompri/db';
import { createRegistry } from '@kompri/llm';
import { examinerMockResponder } from '@kompri/examiner/testing';
import { AdminGuard, AuthController, AuthGuard, AuthService } from './auth.ts';
import { AdminController, ReviewController, ReviewService } from './reviews.ts';
import { ContentController } from './content.ts';
import {
  CLOCK,
  DATABASE,
  defaultSettings,
  EXAMINER,
  SETTINGS,
  TUTOR,
  MAILER,
} from './context.ts';
import { createMailer } from './mailer.ts';
import type { Mailer } from './mailer.ts';
import type { Clock, Examiner, Settings } from './context.ts';
import { ErrorFilter } from './errors.ts';
import { LearningController, LearningService } from './learning.ts';
import { ProgressController } from './progress.ts';
import { TutorController, TutorService } from './tutor.ts';
import type { LlmClient, MockResponder } from '@kompri/llm';

@Controller()
class HealthController implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}
  @Get('health')
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok'] },
        database: { type: 'string', enum: ['up'] },
      },
      required: ['status', 'database'],
    },
  })
  @ApiServiceUnavailableResponse({ description: 'Database unavailable' })
  async health() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        database: 'down',
      });
    }
  }
  async onApplicationShutdown() {
    await this.db.$disconnect();
  }
}

@Module({})
class AppModule {}

interface HttpExchange {
  method: string;
  path: string;
  route?: { path?: string };
}

/**
 * One JSON line per request: method, route pattern, status and duration.
 * Never the query string, body, headers or user identity.
 */
function requestLog(
  request: HttpExchange,
  response: {
    statusCode: number;
    on(event: 'finish', listener: () => void): void;
  },
  next: () => void,
) {
  const start = performance.now();
  response.on('finish', () => {
    console.info(
      JSON.stringify({
        level: 'info',
        msg: 'request',
        method: request.method,
        route: request.route?.path ?? 'unmatched',
        status: response.statusCode,
        durationMs: Math.round(performance.now() - start),
      }),
    );
  });
  next();
}

/** Deterministic answers for local development without any model. */
export const developmentResponder: MockResponder = (request) => {
  if (request.operation !== 'tutor') return examinerMockResponder(request);
  const question = request.messages.at(-1)?.content ?? '';
  return `Je suis le tuteur de démonstration : aucun modèle n’est configuré, je ne peux donc pas répondre vraiment à « ${question.slice(0, 120)} ». Configure un fournisseur pour l’usage tutor (voir .env.example).`;
};

export function createLlmFromEnvironment(
  env: Record<string, string | undefined>,
) {
  const registry = createRegistry(env, undefined, developmentResponder);
  return {
    examiner: {
      provider: registry.providerFor('examiner'),
      client: registry.forUsage('examiner'),
    } satisfies Examiner,
    tutor: registry.forUsage('tutor'),
  };
}

export async function createApi(
  options: {
    db?: PrismaClient;
    examiner?: Examiner;
    tutor?: LlmClient;
    mailer?: Mailer;
    settings?: Partial<Settings>;
    clock?: Clock;
  } = {},
) {
  const db = options.db ?? createDatabase();
  const llm =
    options.examiner && options.tutor
      ? null
      : createLlmFromEnvironment(process.env);
  const app = await NestFactory.create<NestExpressApplication>(
    {
      module: AppModule,
      controllers: [
        HealthController,
        ContentController,
        AuthController,
        LearningController,
        ProgressController,
        TutorController,
        ReviewController,
        AdminController,
      ],
      providers: [
        { provide: DATABASE, useValue: db },
        {
          provide: SETTINGS,
          useValue: { ...defaultSettings, ...options.settings },
        },
        {
          provide: EXAMINER,
          useValue: options.examiner ?? llm!.examiner,
        },
        { provide: TUTOR, useValue: options.tutor ?? llm!.tutor },
        {
          provide: MAILER,
          useValue:
            options.mailer ??
            createMailer({
              MAIL_TRANSPORT: 'log',
              MAIL_FROM: 'Kompri <no-reply@localhost>',
            }),
        },
        { provide: CLOCK, useValue: options.clock ?? (() => new Date()) },
        AuthService,
        AuthGuard,
        LearningService,
        TutorService,
        ReviewService,
        AdminGuard,
      ],
    },
    { logger: ['error', 'warn'], bodyParser: false },
  );
  // Submissions reach 100 000 characters; UTF-8 needs room beyond Express defaults.
  app.useBodyParser('json', { limit: '512kb' });
  app.useGlobalFilters(new ErrorFilter());
  if (process.env.NODE_ENV !== 'test') app.use(requestLog);
  app.enableShutdownHooks();
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Kompri API')
      .setDescription('API REST de Kompri')
      .setVersion('0.2.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'openapi.json',
  });
  return app;
}
