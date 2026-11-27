import { loadContent } from '@kompri/content';
import { createDatabase } from './index.ts';
import { syncContent } from './sync-content.ts';

const content = await loadContent();
// Without its notes, the examiner grades blind: production needs the key.
if (
  process.env.NODE_ENV === 'production' &&
  !content.challenges.some((c) => c.examinerNotes)
)
  throw new Error(
    'Production requires KOMPRI_CONTENT_KEY to load the examiner notes',
  );
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
