import { describe, expect, it } from 'vitest';
import { contentSchema, loadContent } from './index.ts';
describe('versioned content', () => {
  it('loads three nodes and all four families', async () => {
    const content = await loadContent();
    expect(content.skills).toHaveLength(3);
    expect(new Set(content.challenges.map((c) => c.family)).size).toBe(4);
  });
  it.each(['missing', 'cycle', 'rubric', 'duplicate'] as const)(
    'rejects %s corruption',
    async (kind) => {
      const content = await loadContent();
      if (kind === 'missing') content.skills[0]!.prerequisites = ['absent'];
      if (kind === 'cycle') content.skills[0]!.prerequisites = ['http'];
      if (kind === 'rubric') content.challenges[0]!.rubricId = 'absent';
      if (kind === 'duplicate') content.skills.push(content.skills[0]!);
      expect(contentSchema.safeParse(content).success).toBe(false);
    },
  );
});
