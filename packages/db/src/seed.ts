import { loadContent } from '@kompri/content';
import { createDatabase } from './index.ts';
import { syncContent } from './sync-content.ts';

const content = await loadContent();
const db = createDatabase();
try {
  await syncContent(db, content);
  console.log(
    `Seed complete: ${content.domains.length} domains, ${content.skills.length} skills, ` +
      `${content.lessons.length} lessons, ${content.challenges.length} challenges.`,
  );
} finally {
  await db.$disconnect();
}
