import { loadContent } from './index.ts';
const content = await loadContent();
console.log(
  `Content valid: ${content.skills.length} skills, ${content.challenges.length} challenges, ${content.rubrics.length} rubric.`,
);
