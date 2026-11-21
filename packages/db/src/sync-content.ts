import { createHash } from 'node:crypto';
import type { Content } from '@kompri/content';
import type { PrismaClient } from './generated/client.ts';

const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Projects versioned content into PostgreSQL. Items removed from the files are
 * archived, never deleted, so that attempts and validations keep their references.
 */
export async function syncContent(
  db: PrismaClient,
  content: Content,
  now = new Date(),
) {
  await db.$transaction(
    async (tx) => {
      const domainIds = content.domains.map((d) => d.id);
      for (const [position, domain] of content.domains.entries()) {
        const data = { ...domain, position, archivedAt: null };
        await tx.domain.upsert({
          where: { id: domain.id },
          create: data,
          update: data,
        });
      }
      await tx.domain.updateMany({
        where: { id: { notIn: domainIds }, archivedAt: null },
        data: { archivedAt: now },
      });

      const skillIds = content.skills.map((s) => s.id);
      for (const [position, skill] of content.skills.entries()) {
        const data = {
          id: skill.id,
          domainId: skill.domain,
          status: skill.status === 'published' ? 'PUBLISHED' : 'DRAFT',
          title: skill.title,
          description: skill.description,
          estimatedHours: skill.estimatedHours,
          objectives: skill.objectives,
          position,
          archivedAt: null,
          rncpBlockReference: skill.rncpBlockReference ?? null,
        } as const;
        await tx.skill.upsert({
          where: { id: skill.id },
          create: data,
          update: data,
        });
      }
      await tx.skill.updateMany({
        where: { id: { notIn: skillIds }, archivedAt: null },
        data: { archivedAt: now },
      });
      for (const skill of content.skills) {
        await tx.skillPrerequisite.deleteMany({ where: { skillId: skill.id } });
        await tx.skillPrerequisite.createMany({
          data: skill.prerequisites.map((prerequisiteId) => ({
            skillId: skill.id,
            prerequisiteId,
          })),
        });
      }

      for (const lesson of content.lessons) {
        const data = {
          id: lesson.id,
          skillId: lesson.skillId,
          slug: lesson.slug,
          position: lesson.position,
          title: lesson.title,
          summary: lesson.summary,
          durationMinutes: lesson.durationMinutes,
          sources: lesson.sources,
          body: lesson.body,
          contentVersion: hash(lesson),
          archivedAt: null,
        };
        await tx.lesson.upsert({
          where: { id: lesson.id },
          create: data,
          update: data,
        });
      }
      await tx.lesson.updateMany({
        where: {
          id: { notIn: content.lessons.map((l) => l.id) },
          archivedAt: null,
        },
        data: { archivedAt: now },
      });

      for (const [position, challenge] of content.challenges.entries()) {
        const rubric = content.rubrics.find(
          (r) => r.id === challenge.rubricId,
        )!;
        const data = {
          id: challenge.id,
          skillId: challenge.skillId,
          family: challenge.family,
          title: challenge.title,
          summary: challenge.summary ?? null,
          estimatedMinutes: challenge.estimatedMinutes ?? null,
          instructions: challenge.instructions,
          deliverable: challenge.deliverable ?? null,
          examinerNotes: challenge.examinerNotes ?? null,
          rubricId: challenge.rubricId,
          rubricSnapshot: rubric,
          contentVersion: hash({ challenge, rubric }),
          position,
          archivedAt: null,
        };
        await tx.challenge.upsert({
          where: { id: challenge.id },
          create: data,
          update: data,
        });
      }
      await tx.challenge.updateMany({
        where: {
          id: { notIn: content.challenges.map((c) => c.id) },
          archivedAt: null,
        },
        data: { archivedAt: now },
      });
    },
    { timeout: 60_000 },
  );
}
