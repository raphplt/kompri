import { lintContent, loadContent } from './index.ts';
const content = await loadContent();
const issues = lintContent(content);
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
    `${content.challenges.length} challenges.`,
);
if (issues.length) process.exitCode = 1;
