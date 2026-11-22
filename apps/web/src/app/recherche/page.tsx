import type { Metadata } from 'next';
import Link from 'next/link';
import { searchQuerySchema, searchResponseSchema } from '@kompri/shared';
import { buttonClass, inputClass } from '../../components/ui';
import { api } from '../../lib/api';
import { fr } from '../../messages/fr';

export const metadata: Metadata = {
  title: fr.search.title,
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const raw = (await searchParams).q;
  const value = typeof raw === 'string' ? raw : '';
  const input = searchQuerySchema.safeParse({ q: value });
  const response = input.success
    ? await api(
        `/search?q=${encodeURIComponent(input.data.q)}`,
        searchResponseSchema,
      )
    : null;

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">
        {fr.search.title}
      </h1>
      <form
        role="search"
        action="/recherche"
        className="mt-6 flex max-w-2xl flex-wrap items-end gap-3"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">{fr.search.label}</span>
          <input
            type="search"
            name="q"
            defaultValue={value}
            minLength={2}
            maxLength={100}
            required
            placeholder={fr.search.placeholder}
            className={`${inputClass} mt-0`}
          />
        </label>
        <button type="submit" className={buttonClass.primary}>
          {fr.search.submit}
        </button>
      </form>
      <p className="mt-2 text-sm text-faint">{fr.search.help}</p>

      {value && !input.success && (
        <p className="mt-8 text-muted">{fr.search.tooShort}</p>
      )}
      {response && (
        <section className="mt-8" aria-labelledby="resultats">
          <h2
            id="resultats"
            className="mb-4 text-lg font-bold"
            aria-live="polite"
          >
            {fr.search.count(response.results.length, response.query)}
          </h2>
          {response.results.length ? (
            <ol className="space-y-4">
              {response.results.map((result) => (
                <li key={`${result.skillId}/${result.slug}`}>
                  <Link
                    href={`/competences/${result.skillId}/${result.slug}`}
                    className="block rounded-xl border border-line bg-raised p-4 hover:border-accent"
                  >
                    <span className="block text-xs font-semibold text-faint">
                      {result.skillTitle}
                    </span>
                    <span className="mt-1 block font-bold text-ink">
                      {result.title}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {result.summary}
                    </span>
                    {result.excerpt.length > 0 && (
                      <span className="mt-2 block text-sm text-muted">
                        …
                        {result.excerpt.map((part, index) =>
                          part.match ? (
                            <mark
                              key={index}
                              className="rounded bg-accent-soft px-0.5 text-ink"
                            >
                              {part.text}
                            </mark>
                          ) : (
                            <span key={index}>{part.text}</span>
                          ),
                        )}
                        …
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted">{fr.search.none}</p>
          )}
        </section>
      )}
    </>
  );
}
