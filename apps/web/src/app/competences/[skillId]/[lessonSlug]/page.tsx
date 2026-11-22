import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { lessonDetailSchema } from '@kompri/shared';
import { Markdown } from '../../../../components/markdown';
import { TutorPanel } from '../../../../components/tutor-panel';
import { Breadcrumbs, ButtonLink } from '../../../../components/ui';
import { api, ApiRequestError } from '../../../../lib/api';
import { getProgress, getSkill } from '../../../../lib/data';
import { LessonReadToggle } from '../../../../components/lesson-read-toggle';
import { getCurrentUser } from '../../../../lib/session';
import { fr } from '../../../../messages/fr';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ skillId: string; lessonSlug: string }> };

const getLesson = cache(async (skillId: string, slug: string) => {
  try {
    return await api(
      `/skills/${encodeURIComponent(skillId)}/lessons/${encodeURIComponent(slug)}`,
      lessonDetailSchema,
    );
  } catch (error) {
    if (error instanceof ApiRequestError && [400, 404].includes(error.status))
      return null;
    throw error;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { skillId, lessonSlug } = await params;
  const lesson = await getLesson(skillId, lessonSlug).catch(() => null);
  return lesson
    ? {
        title: `${lesson.title} — ${lesson.skillTitle}`,
        description: lesson.summary,
      }
    : {};
}

export default async function LessonPage({ params }: Props) {
  const { skillId, lessonSlug } = await params;
  const [lesson, skill, user, progress] = await Promise.all([
    getLesson(skillId, lessonSlug),
    getSkill(skillId),
    getCurrentUser().catch(() => null),
    getProgress().catch(() => null),
  ]);
  const read = new Set(progress?.completedLessons ?? []);
  if (!lesson || !skill) notFound();
  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block">
        <nav aria-label={fr.lesson.contents} className="sticky top-24">
          <Link
            href={`/competences/${skill.id}`}
            className="text-sm font-semibold text-accent hover:underline"
          >
            ← {skill.title}
          </Link>
          <ol className="mt-4 space-y-1 text-sm">
            {skill.lessons.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/competences/${skill.id}/${item.slug}`}
                  aria-current={item.slug === lesson.slug ? 'page' : undefined}
                  className={`block rounded-md px-3 py-2 ${
                    item.slug === lesson.slug
                      ? 'bg-accent-soft font-semibold text-accent'
                      : 'text-muted hover:bg-raised hover:text-ink'
                  }`}
                >
                  {read.has(`${skill.id}/${item.slug}`) && (
                    <span
                      aria-label={fr.skill.readMark}
                      className="mr-1 text-success"
                    >
                      ✓
                    </span>
                  )}
                  {item.position}. {item.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </aside>

      <article className="min-w-0">
        <Breadcrumbs
          items={[
            { href: '/#parcours', label: fr.nav.path },
            { href: `/competences/${skill.id}`, label: skill.title },
            { label: lesson.title },
          ]}
        />
        <header className="mb-8 border-b border-line pb-6">
          <p className="text-sm font-semibold text-accent">
            Leçon {lesson.position} sur {skill.lessons.length} ·{' '}
            {fr.skill.minutes(lesson.durationMinutes)}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-4xl">
            {lesson.title}
          </h1>
          <p className="mt-3 text-lg text-muted">{lesson.summary}</p>
        </header>

        <Markdown source={lesson.body} className="md:prose-lg" />

        {lesson.sources.length > 0 && (
          <section className="mt-12 rounded-xl border border-line bg-raised p-5">
            <h2 className="mb-3 font-bold">{fr.lesson.sources}</h2>
            <ul className="space-y-1 text-sm">
              {lesson.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {user && (
          <div className="mt-10 flex justify-center">
            <LessonReadToggle
              skillId={skill.id}
              slug={lesson.slug}
              initiallyRead={read.has(`${skill.id}/${lesson.slug}`)}
            />
          </div>
        )}

        <nav
          aria-label="Navigation entre les leçons"
          className="mt-12 grid gap-4 sm:grid-cols-2"
        >
          {lesson.previous ? (
            <Link
              href={`/competences/${skill.id}/${lesson.previous.slug}`}
              className="rounded-xl border border-line bg-raised p-4 hover:border-accent"
            >
              <span className="block text-xs text-faint">
                {fr.lesson.previous}
              </span>
              <span className="font-semibold">{lesson.previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {lesson.next ? (
            <Link
              href={`/competences/${skill.id}/${lesson.next.slug}`}
              className="rounded-xl border border-line bg-raised p-4 text-right hover:border-accent"
            >
              <span className="block text-xs text-faint">{fr.lesson.next}</span>
              <span className="font-semibold">{lesson.next.title}</span>
            </Link>
          ) : (
            <div className="flex items-center justify-end">
              <ButtonLink href={`/competences/${skill.id}#defis`}>
                {fr.lesson.toChallenges}
              </ButtonLink>
            </div>
          )}
        </nav>
      </article>
      <TutorPanel
        skillId={skill.id}
        lessonSlug={lesson.slug}
        signedIn={!!user}
      />
    </div>
  );
}
