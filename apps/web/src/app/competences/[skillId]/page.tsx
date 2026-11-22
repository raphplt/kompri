import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Breadcrumbs,
  ButtonLink,
  Card,
  FamilyBadge,
  StateBadge,
} from '../../../components/ui';
import { getProgress, getSkill, getTree, stateOf } from '../../../lib/data';
import { formatDate } from '../../../lib/format';
import { fr } from '../../../messages/fr';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ skillId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const skill = await getSkill((await params).skillId).catch(() => null);
  return skill ? { title: skill.title, description: skill.description } : {};
}

export default async function SkillPage({ params }: Props) {
  const { skillId } = await params;
  const skill = await getSkill(skillId);
  if (!skill) notFound();
  const [tree, progress] = await Promise.all([getTree(), getProgress()]);
  const domain = tree.domains.find((d) => d.id === skill.domain);
  const state = stateOf(progress, skill);
  const entry = progress?.skills.find((s) => s.skillId === skill.id);
  const titles = new Map(tree.skills.map((s) => [s.id, s.title]));
  const minutes = skill.lessons.reduce((sum, l) => sum + l.durationMinutes, 0);
  const read = new Set(progress?.completedLessons ?? []);
  const readCount = skill.lessons.filter((l) =>
    read.has(`${skill.id}/${l.slug}`),
  ).length;

  return (
    <>
      <Breadcrumbs
        items={[
          { href: '/#parcours', label: fr.nav.path },
          { label: domain?.title ?? skill.domain },
          { label: skill.title },
        ]}
      />
      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {skill.title}
          </h1>
          {state && <StateBadge state={state} />}
        </div>
        <p className="mt-3 max-w-3xl text-lg text-muted">{skill.description}</p>
        <p className="mt-3 text-sm text-faint">
          {fr.tree.lessons(skill.lessons.length)} ·{' '}
          {fr.tree.hours(skill.estimatedHours)}
          {entry?.expiresAt &&
            ` · ${
              state === 'validated'
                ? fr.skill.validUntil(formatDate(entry.expiresAt))
                : fr.skill.expiredOn(formatDate(entry.expiresAt))
            }`}
        </p>
        {state && (
          <p className="mt-2 text-sm text-muted">{fr.stateHelp[state]}</p>
        )}
        {skill.lessons[0] && (
          <div className="mt-6">
            <ButtonLink
              href={`/competences/${skill.id}/${skill.lessons[0].slug}`}
            >
              {fr.skill.startLesson}
            </ButtonLink>
          </div>
        )}
      </header>

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-10">
          <section aria-labelledby="lecons">
            <h2 id="lecons" className="mb-4 text-xl font-bold">
              {fr.skill.lessons}
              {minutes > 0 && (
                <span className="ml-2 text-sm font-normal text-faint">
                  {fr.skill.minutes(minutes)}
                </span>
              )}
              {progress && skill.lessons.length > 0 && (
                <span className="ml-2 text-sm font-normal text-success">
                  {fr.skill.lessonsRead(readCount, skill.lessons.length)}
                </span>
              )}
            </h2>
            {skill.lessons.length ? (
              <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-raised">
                {skill.lessons.map((lesson) => (
                  <li key={lesson.slug}>
                    <Link
                      href={`/competences/${skill.id}/${lesson.slug}`}
                      className="flex gap-4 p-4 transition hover:bg-accent-soft"
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                          read.has(`${skill.id}/${lesson.slug}`)
                            ? 'bg-success-soft text-success'
                            : 'bg-accent-soft text-accent'
                        }`}
                      >
                        {read.has(`${skill.id}/${lesson.slug}`) ? (
                          <span aria-label={fr.skill.readMark}>✓</span>
                        ) : (
                          lesson.position
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold">
                          {lesson.title}
                        </span>
                        <span className="block text-sm text-muted">
                          {lesson.summary}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm text-faint">
                        {fr.skill.minutes(lesson.durationMinutes)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted">{fr.skill.noLessons}</p>
            )}
          </section>

          <section aria-labelledby="defis">
            <h2 id="defis" className="mb-1 text-xl font-bold">
              {fr.skill.challenges}
            </h2>
            <p className="mb-4 text-sm text-muted">
              {fr.skill.challengesIntro}
            </p>
            {skill.challenges.length ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {skill.challenges.map((challenge) => (
                  <li key={challenge.id}>
                    <Link
                      href={`/defis/${challenge.id}`}
                      className="flex h-full flex-col rounded-xl border border-line bg-raised p-4 shadow-sm transition hover:border-accent"
                    >
                      <FamilyBadge family={challenge.family} />
                      <span className="mt-2 font-semibold">
                        {challenge.title}
                      </span>
                      {challenge.summary && (
                        <span className="mt-1 flex-1 text-sm text-muted">
                          {challenge.summary}
                        </span>
                      )}
                      {challenge.estimatedMinutes && (
                        <span className="mt-3 text-xs text-faint">
                          {fr.challenge.estimated(challenge.estimatedMinutes)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">{fr.skill.noChallenges}</p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="mb-3 font-bold">{fr.skill.objectives}</h2>
            <ul className="space-y-2 text-sm text-muted">
              {skill.objectives.map((objective) => (
                <li key={objective} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">
                    ✓
                  </span>
                  {objective}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-3 font-bold">{fr.tree.prerequisites}</h2>
            {skill.prerequisites.length ? (
              <ul className="space-y-2 text-sm">
                {skill.prerequisites.map((id) => {
                  const prerequisiteState = progress?.skills.find(
                    (s) => s.skillId === id,
                  )?.state;
                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-2"
                    >
                      <Link
                        href={`/competences/${id}`}
                        className="text-accent hover:underline"
                      >
                        {titles.get(id) ?? id}
                      </Link>
                      {prerequisiteState && (
                        <StateBadge state={prerequisiteState} />
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">{fr.tree.none}</p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
