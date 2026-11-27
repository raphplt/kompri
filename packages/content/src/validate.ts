import { defectFindingFamilies, lintContent, loadContent } from './index.ts';
const content = await loadContent();
const issues = lintContent(content);
// Answer keys are private: without the key or the unlocked copy, they are
// not checked. With them, every challenge must be complete.
const withNotes = content.challenges.filter((c) => c.examinerNotes);
const answers = withNotes.length > 0;
if (answers)
  for (const challenge of content.challenges) {
    if (!challenge.examinerNotes)
      issues.push(`${challenge.id}: missing examiner notes in the answers`);
    const rubric = content.rubrics.find((r) => r.id === challenge.rubricId)!;
    if ((defectFindingFamilies as readonly string[]).includes(challenge.family))
      for (const criterion of rubric.criteria)
        if (!criterion.levels)
          issues.push(
            `${challenge.id}.${criterion.id}: missing levels in the answers`,
          );
  }
for (const issue of issues) console.error(issue);
const published = content.skills.filter((s) => s.status === 'published');
const words = content.lessons.reduce(
  (sum, lesson) => sum + lesson.body.split(/\s+/).length,
  0,
);
console.log(
  `Content ${issues.length ? 'INVALID' : 'valid'}: ${content.domains.length} domains, ` +
    `${content.skills.length} skills (${published.length} published), ` +
    `${content.lessons.length} lessons (~${words} words), ` +
    `${content.challenges.length} challenges` +
    (answers
      ? ', answer keys checked.'
      : '; answer keys not loaded (set KOMPRI_CONTENT_KEY to check them).'),
);
if (issues.length) process.exitCode = 1;
