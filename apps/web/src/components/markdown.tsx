import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import rehypeHighlight from 'rehype-highlight';
import { common } from 'lowlight';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import { fr } from '../messages/fr';

interface MdNode {
  type: string;
  name?: string;
  value?: string;
  children?: MdNode[];
  data?: Record<string, unknown>;
  position?: { start: { offset?: number }; end: { offset?: number } };
}

const callouts = {
  note: fr.lesson.note,
  tip: fr.lesson.tip,
  warning: fr.lesson.warning,
  solution: fr.lesson.solution,
} as const;
type CalloutKind = keyof typeof callouts;
const isCallout = (name?: string): name is CalloutKind =>
  !!name && name in callouts;

/**
 * Maps `:::note|tip|warning|solution[Title]` containers to accessible HTML.
 * Any other directive syntax (for example `:hover` written in prose) is put back
 * as plain text, exactly as written in the source.
 */
function remarkCallouts() {
  return (tree: MdNode, file: { value: unknown }) => {
    const source = String(file.value);
    const original = (node: MdNode) => {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      return start !== undefined && end !== undefined
        ? source.slice(start, end)
        : `:${node.name ?? ''}`;
    };
    const walk = (node: MdNode) => {
      if (!node.children) return;
      node.children = node.children.map((child): MdNode => {
        if (child.type === 'textDirective')
          return { type: 'text', value: original(child) };
        if (
          child.type === 'leafDirective' ||
          (child.type === 'containerDirective' && !isCallout(child.name))
        )
          return {
            type: 'paragraph',
            children: [{ type: 'text', value: original(child) }],
          };
        if (child.type === 'containerDirective' && isCallout(child.name)) {
          const children = [...(child.children ?? [])];
          const label = children[0]?.data?.directiveLabel
            ? children.shift()!.children!
            : [{ type: 'text', value: callouts[child.name] }];
          if (child.name === 'solution') {
            child.data = {
              hName: 'details',
              hProperties: { className: ['callout', 'callout-solution'] },
            };
            child.children = [
              {
                type: 'paragraph',
                data: { hName: 'summary' },
                children: label,
              },
              ...children,
            ];
          } else {
            child.data = {
              hName: 'aside',
              hProperties: {
                className: ['callout', `callout-${child.name}`],
              },
            };
            child.children = [
              {
                type: 'paragraph',
                data: { hProperties: { className: ['callout-title'] } },
                children: label,
              },
              ...children,
            ];
          }
        }
        walk(child);
        return child;
      });
    };
    walk(tree);
  };
}

const components: Components = {
  a: ({ href, children }) => {
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

/** Renders trusted course Markdown. Raw HTML is never interpreted. */
export function Markdown({
  source,
  className = '',
}: {
  source: string;
  className?: string;
}) {
  return (
    <div className={`prose max-w-none prose-pre:rounded-lg ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkCallouts]}
        rehypePlugins={[
          [
            rehypeHighlight,
            {
              detect: false,
              languages: { ...common, dockerfile },
              plainText: ['text', 'http'],
            },
          ],
        ]}
        components={components}
        skipHtml
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
