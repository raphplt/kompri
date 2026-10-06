import { createHash } from 'node:crypto';
import { loadContent } from '@kompri/content';
import { createDatabase } from './index.ts';
const content = await loadContent();
const contentVersion = createHash('sha256')
  .update(JSON.stringify(content))
  .digest('hex');
const db = createDatabase();
try {
  await db.$transaction(async (tx) => {
    for (const skill of content.skills) {
      const { prerequisites: _prerequisites, ...data } = skill;
      void _prerequisites;
      const values = {
        ...data,
        rncpBlockReference: data.rncpBlockReference ?? null,
      };
      await tx.skill.upsert({
        where: { id: skill.id },
        create: values,
        update: values,
      });
    }
    for (const skill of content.skills) {
      await tx.skillPrerequisite.deleteMany({ where: { skillId: skill.id } });
      await tx.skillPrerequisite.createMany({
        data: skill.prerequisites.map((prerequisiteId) => ({
          skillId: skill.id,
          prerequisiteId,
        })),
      });
    }
    for (const challenge of content.challenges) {
      const data = {
        ...challenge,
        contentVersion,
        rubricSnapshot: content.rubrics.find(
          (r) => r.id === challenge.rubricId,
        )!,
      };
      await tx.challenge.upsert({
        where: { id: challenge.id },
        create: data,
        update: data,
      });
    }
  });
  console.log(
    `Seed complete: ${content.skills.length} skills, ${content.challenges.length} challenges.`,
  );
} finally {
  await db.$disconnect();
}
