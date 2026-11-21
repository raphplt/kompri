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
import { AuthController, AuthGuard, AuthService } from './auth.ts';
import { ContentController } from './content.ts';
import {
  CLOCK,
  DATABASE,
  defaultSettings,
  EXAMINER,
  SETTINGS,
} from './context.ts';
import type { Clock, Examiner, Settings } from './context.ts';
import { ErrorFilter } from './errors.ts';
import { LearningController, LearningService } from './learning.ts';
import { ProgressController } from './progress.ts';

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

export function createExaminerFromEnvironment(
  env: Record<string, string | undefined>,
): Examiner {
  return {
    provider: env.LLM_EXAMINER_PROVIDER ?? 'mock',
    client: createRegistry(env, undefined, examinerMockResponder).forUsage(
      'examiner',
    ),
  };
}

export async function createApi(
  options: {
    db?: PrismaClient;
    examiner?: Examiner;
    settings?: Partial<Settings>;
    clock?: Clock;
  } = {},
) {
  const db = options.db ?? createDatabase();
  const app = await NestFactory.create<NestExpressApplication>(
    {
      module: AppModule,
      controllers: [
        HealthController,
        ContentController,
        AuthController,
        LearningController,
        ProgressController,
      ],
      providers: [
        { provide: DATABASE, useValue: db },
        {
          provide: SETTINGS,
          useValue: { ...defaultSettings, ...options.settings },
        },
        {
          provide: EXAMINER,
          useValue:
            options.examiner ?? createExaminerFromEnvironment(process.env),
        },
        { provide: CLOCK, useValue: options.clock ?? (() => new Date()) },
        AuthService,
        AuthGuard,
        LearningService,
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
