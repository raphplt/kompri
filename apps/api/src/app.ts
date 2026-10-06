import 'reflect-metadata';
import type { SchemaObject } from '@nestjs/swagger';
import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Module,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import { createDatabase } from '@kompri/db';
import type { PrismaClient } from '@kompri/db';
import { skillsQuerySchema, skillsResponseSchema, z } from '@kompri/shared';
const DATABASE = Symbol('DATABASE');
@Controller()
class ApiController implements OnApplicationShutdown {
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
  @Get('skills')
  @ApiOkResponse({
    schema: z.toJSONSchema(skillsResponseSchema, {
      target: 'openapi-3.0',
      io: 'output',
    }) as SchemaObject,
  })
  @ApiBadRequestResponse({ description: 'Unexpected query parameters' })
  async skills(@Query() query: unknown) {
    const result = skillsQuerySchema.safeParse(query);
    if (!result.success)
      throw new BadRequestException('Invalid query parameters');
    const skills = await this.db.skill.findMany({
      include: { prerequisites: true },
      orderBy: { id: 'asc' },
    });
    return skillsResponseSchema.parse(
      skills.map((skill) => ({
        id: skill.id,
        title: skill.title,
        description: skill.description,
        prerequisites: skill.prerequisites
          .map((edge) => edge.prerequisiteId)
          .sort(),
        ...(skill.rncpBlockReference
          ? { rncpBlockReference: skill.rncpBlockReference }
          : {}),
      })),
    );
  }
  async onApplicationShutdown() {
    await this.db.$disconnect();
  }
}
@Module({})
class AppModule {}
export async function createApi(db = createDatabase()) {
  const app = await NestFactory.create(
    {
      module: AppModule,
      controllers: [ApiController],
      providers: [{ provide: DATABASE, useValue: db }],
    },
    { logger: ['error', 'warn'] },
  );
  app.enableShutdownHooks();
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Kompri API')
      .setDescription('API REST des fondations Kompri')
      .setVersion('0.1.0')
      .build(),
  );
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'openapi.json',
  });
  return app;
}
