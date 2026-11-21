import { describe, expect, it } from 'vitest';
import {
  contentSchema,
  lintContent,
  lintMarkdown,
  loadContent,
} from './index.ts';
import { splitFrontMatter } from './markdown.ts';

describe('versioned content', () => {
  it('loads the tree with domains, challenges and inline rubrics', async () => {
    const content = await loadContent();
    expect(content.skills.length).toBeGreaterThanOrEqual(20);
    expect(content.domains.length).toBeGreaterThanOrEqual(5);
    expect(new Set(content.challenges.map((c) => c.family)).size).toBe(4);
    for (const challenge of content.challenges)
      expect(content.rubrics.map((r) => r.id)).toContain(challenge.rubricId);
    expect(lintContent(content)).toEqual([]);
  });

  it('requires every published skill to be complete', async () => {
    const content = await loadContent();
    for (const skill of content.skills.filter((s) => s.status === 'published'))
      expect(
        new Set(
          content.challenges
            .filter((c) => c.skillId === skill.id)
            .map((c) => c.family),
        ).size,
      ).toBe(4);
    const skill = content.skills.find((s) => s.prerequisites.length === 0)!;
    const publish = (overrides: Partial<typeof content>) =>
      contentSchema.safeParse({
        ...content,
        skills: content.skills.map((s) =>
          s.id === skill.id ? { ...s, status: 'published' } : s,
        ),
        ...overrides,
      }).success;
    expect(
      publish({
        lessons: content.lessons.filter((l) => l.skillId !== skill.id),
      }),
    ).toBe(false);
    expect(
      publish({
        challenges: content.challenges.filter(
          (c) => c.skillId !== skill.id || c.family !== 'CONTRE_IA',
        ),
      }),
    ).toBe(false);
  });

  it.each(['missing', 'cycle', 'rubric', 'duplicate', 'domain'] as const)(
    'rejects %s corruption',
    async (kind) => {
      const content = await loadContent();
      const [first, second] = content.skills;
      if (kind === 'missing') first!.prerequisites = ['absent'];
      if (kind === 'cycle') {
        first!.prerequisites = [second!.id];
        second!.prerequisites = [first!.id];
      }
      if (kind === 'rubric') content.challenges[0]!.rubricId = 'absent';
      if (kind === 'duplicate') content.skills.push(first!);
      if (kind === 'domain') first!.domain = 'absent';
      expect(contentSchema.safeParse(content).success).toBe(false);
    },
  );
});

describe('restricted Markdown dialect', () => {
  it('accepts the documented syntax', () => {
    expect(
      lintMarkdown(
        '## Titre\n\n```js\nconst a = `<b>`;\n```\n\n:::solution[Corrigé]\nTexte `<div>`\n:::\n',
        { allowCallouts: true },
      ),
    ).toEqual([]);
  });

  it.each([
    ['# Titre', 'level-1'],
    ['```\ncode\n```', 'language'],
    ['```js\ncode', 'unclosed code'],
    [':::danger\nx\n:::', 'unknown callout'],
    [':::note\nx', 'unclosed'],
    [':::note\n:::note\n:::', 'nested'],
    ['Texte <div>brut</div>', 'raw HTML'],
    [':::note\n1. item\n   :::', 'start the line'],
  ])('reports %j', (markdown, issue) => {
    expect(lintMarkdown(markdown, { allowCallouts: true }).join()).toContain(
      issue,
    );
  });

  it('rejects callouts where they are not rendered', () => {
    expect(lintMarkdown(':::note\nx\n:::').join()).toContain('not allowed');
  });

  it('splits front matter', () => {
    expect(splitFrontMatter('---\ntitle: A\n---\n\nCorps\n')).toEqual({
      data: { title: 'A' },
      body: 'Corps',
    });
    expect(() => splitFrontMatter('Corps')).toThrow('front matter');
  });
});
