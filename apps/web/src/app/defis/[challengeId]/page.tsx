import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import {
  attemptResponseSchema,
  challengeDetailSchema,
  z,
} from '@kompri/shared';
import {
  SubmitWorkForm,
  StartOralForm,
} from '../../../components/challenge-forms';
import { Markdown } from '../../../components/markdown';
import {
  Breadcrumbs,
  ButtonLink,
  Card,
  FamilyBadge,
  StateBadge,
} from '../../../components/ui';
import { api, ApiRequestError } from '../../../lib/api';
import { getProgress, getSkill, stateOf } from '../../../lib/data';
import { formatDateTime } from '../../../lib/format';
import { getCurrentUser, getToken } from '../../../lib/session';
import { fr } from '../../../messages/fr';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ challengeId: string }> };

const getChallenge = cache(async (id: string) => {
  try {
    return await api(
      `/challenges/${encodeURIComponent(id)}`,
      challengeDetailSchema,
    );
  } catch (error) {
    if (error instanceof ApiRequestError && [400, 404].includes(error.status))
      return null;
    throw error;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const challenge = await getChallenge((await params).challengeId).catch(
    () => null,
  );
  return challenge ? { title: challenge.title } : {};
}

// Oral settings are enforced by the API; these values only inform the learner.
const oralQuestions = Number(process.env.ORAL_QUESTION_COUNT ?? 3);
const oralMinutes = Math.round(
  Number(process.env.ORAL_ANSWER_SECONDS ?? 240) / 60,
);

export default async function ChallengePage({ params }: Props) {
  const { challengeId } = await params;
  const challenge = await getChallenge(challengeId);
  if (!challenge) notFound();
  const [skill, user, progress] = await Promise.all([
    getSkill(challenge.skillId),
    getCurrentUser(),
    getProgress(),
  ]);
  if (!skill) notFound();
  const state = stateOf(progress, skill);
  const attempts = user
    ? await api(
        `/attempts?challengeId=${encodeURIComponent(challenge.id)}`,
        z.array(attemptResponseSchema),
        { token: await getToken() },
      )
    : [];
  const canAttempt = skill.status === 'published';
  const locked = state === 'locked';
  const maxPoints = challenge.rubric.criteria.reduce(
    (sum, c) => sum + c.maxScore,
    0,
  );

  return (
    <>
      <Breadcrumbs
        items={[
          { href: '/#parcours', label: fr.nav.path },
          { href: `/competences/${skill.id}`, label: skill.title },
          { label: challenge.title },
        ]}
      />
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <FamilyBadge family={challenge.family} />
          {state && <StateBadge state={state} />}
          {challenge.estimatedMinutes && (
            <span className="text-sm text-faint">
              {fr.challenge.estimated(challenge.estimatedMinutes)}
            </span>
          )}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {challenge.title}
        </h1>
        {challenge.summary && (
          <p className="mt-3 text-lg text-muted">{challenge.summary}</p>
        )}
        <p className="mt-2 text-sm text-faint">
          {fr.families[challenge.family].text}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="consigne">
            <h2 id="consigne" className="mb-4 text-xl font-bold">
              {fr.challenge.instructions}
            </h2>
            <Markdown source={challenge.instructions} />
          </section>
          {challenge.deliverable && (
            <section aria-labelledby="livrable">
              <h2 id="livrable" className="mb-4 text-xl font-bold">
                {fr.challenge.deliverable}
              </h2>
              <Markdown source={challenge.deliverable} />
            </section>
          )}
          <section aria-labelledby="grille">
            <h2 id="grille" className="mb-2 text-xl font-bold">
              {fr.challenge.rubric}{' '}
              <span className="text-sm font-normal text-faint">
                ({maxPoints} pts)
              </span>
            </h2>
            <p className="mb-4 text-sm text-muted">
              {fr.challenge.rubricIntro(
                Math.round(challenge.rubric.passRatio * 100),
              )}
            </p>
            <div className="space-y-3">
              {challenge.rubric.criteria.map((criterion) => (
                <details
                  key={criterion.id}
                  className="rounded-xl border border-line bg-raised p-4"
                >
                  <summary className="flex cursor-pointer items-start justify-between gap-4 font-semibold">
                    <span>{criterion.description}</span>
                    <span className="shrink-0 text-sm text-accent">
                      {fr.challenge.points(criterion.maxScore)}
                    </span>
                  </summary>
                  {criterion.levels && (
                    <ol className="mt-3 space-y-2 text-sm">
                      {criterion.levels.map((level) => (
                        <li key={level.score} className="flex gap-3">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                            {level.score}
                          </span>
                          <span className="text-muted">
                            {level.description}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <Card className="lg:sticky lg:top-24">
            <h2 className="mb-2 text-lg font-bold">
              {fr.challenge.submitTitle}
            </h2>
            {!canAttempt ? (
              <p className="text-sm text-muted">{fr.challenge.upcoming}</p>
            ) : !user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  {fr.challenge.loginToSubmit}
                </p>
                <ButtonLink href={`/connexion?suite=/defis/${challenge.id}`}>
                  {fr.nav.login}
                </ButtonLink>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted">
                  {fr.challenge.submitHelp}
                </p>
                <SubmitWorkForm challengeId={challenge.id} />
              </>
            )}
          </Card>

          {attempts.length > 0 && (
            <Card>
              <h2 className="mb-4 text-lg font-bold">
                {fr.challenge.attempts}
              </h2>
              <ul className="space-y-4">
                {attempts.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="border-b border-line pb-4 last:border-0 last:pb-0"
                  >
                    <p className="text-sm font-semibold">
                      {fr.challenge.attemptOn(
                        formatDateTime(attempt.createdAt),
                      )}
                    </p>
                    <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-surface p-2 text-xs text-muted">
                      {attempt.work.slice(0, 600)}
                      {attempt.work.length > 600 ? '…' : ''}
                    </pre>
                    <div className="mt-3">
                      {attempt.oral ? (
                        <Link
                          href={`/oraux/${attempt.oral.id}`}
                          className="font-semibold text-accent hover:underline"
                        >
                          {attempt.oral.status === 'active'
                            ? fr.challenge.resumeOral
                            : fr.challenge.viewOral}{' '}
                          →
                        </Link>
                      ) : (
                        <StartOralForm
                          attemptId={attempt.id}
                          questions={oralQuestions}
                          minutes={oralMinutes}
                          placement={locked}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
