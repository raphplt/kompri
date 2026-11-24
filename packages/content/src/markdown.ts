import { parse } from 'yaml';

export const codeLanguages = [
  'html',
  'css',
  'js',
  'json',
  'sql',
  'bash',
  'http',
  'text',
  'diff',
  'ts',
  'tsx',
  'jsx',
  'yaml',
  'dockerfile',
] as const;
export const calloutKinds = ['note', 'tip', 'warning', 'solution'] as const;

export function splitFrontMatter(source: string): {
  data: unknown;
  body: string;
} {
  const text = source.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) throw new Error('Missing front matter');
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) throw new Error('Unterminated front matter');
  return {
    data: parse(text.slice(4, end)) as unknown,
    body: text.slice(end + 5).trim(),
  };
}

const fence = /^(\s*)(`{3,}|~{3,})(.*)$/;
const directiveOpen = /^:::([a-z]+)(\[[^\]]*\])?\s*$/;

/**
 * Checks the restricted Markdown dialect rendered by the web app.
 * Returns human readable issues; an empty list means the text is valid.
 */
export function lintMarkdown(
  markdown: string,
  options: { allowCallouts?: boolean } = {},
): string[] {
  const issues: string[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let openFence = null as { marker: string; line: number } | null;
  let openCallout = null as { kind: string; line: number } | null;
  for (const [index, line] of lines.entries()) {
    const at = `line ${index + 1}`;
    const fenceMatch = fence.exec(line);
    if (openFence) {
      if (
        fenceMatch &&
        fenceMatch[2]!.startsWith(openFence.marker) &&
        !fenceMatch[3]!.trim()
      )
        openFence = null;
      continue;
    }
    if (fenceMatch) {
      const language = fenceMatch[3]!.trim();
      if (!(codeLanguages as readonly string[]).includes(language))
        issues.push(
          `${at}: code block language must be one of ${codeLanguages.join(', ')}`,
        );
      openFence = { marker: fenceMatch[2]!, line: index + 1 };
      continue;
    }
    if (/^#\s/.test(line))
      issues.push(`${at}: level-1 headings are reserved for the title`);
    if (/^\s+:::/.test(line)) {
      issues.push(
        `${at}: callout markers must start the line, after a blank line`,
      );
      continue;
    }
    if (line.startsWith(':::')) {
      if (!options.allowCallouts) {
        issues.push(`${at}: callouts are not allowed here`);
        continue;
      }
      if (line.trim() === ':::') {
        if (!openCallout) issues.push(`${at}: callout closed but never opened`);
        openCallout = null;
        continue;
      }
      const match = directiveOpen.exec(line);
      if (!match || !(calloutKinds as readonly string[]).includes(match[1]!))
        issues.push(
          `${at}: unknown callout, use ${calloutKinds.map((k) => `:::${k}`).join(', ')}`,
        );
      else if (openCallout) issues.push(`${at}: callouts cannot be nested`);
      else openCallout = { kind: match[1]!, line: index + 1 };
      continue;
    }
    const withoutInlineCode = line.replace(/(`+)[^`]*?\1/g, '');
    if (/<\/?[a-zA-Z][a-zA-Z0-9-]*(\s[^>]*)?\/?>/.test(withoutInlineCode))
      issues.push(`${at}: raw HTML is not rendered, put it in a code block`);
  }
  if (openFence) issues.push(`line ${openFence.line}: unclosed code block`);
  if (openCallout)
    issues.push(`line ${openCallout.line}: unclosed :::${openCallout.kind}`);
  return issues;
}
