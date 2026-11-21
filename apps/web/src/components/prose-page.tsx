import { Markdown } from './markdown';

export function ProsePage({
  title,
  source,
}: {
  title: string;
  source: string;
}) {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <Markdown source={source} />
    </article>
  );
}
