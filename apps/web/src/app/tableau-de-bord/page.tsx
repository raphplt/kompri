import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ProgressResponse } from '@kompri/shared';
import { Alert, ButtonLink, Card, StateBadge } from '../../components/ui';
import { getProgress, getTree } from '../../lib/data';
import { formatDate, formatDateTime } from '../../lib/format';
import { getCurrentUser } from '../../lib/session';
import { fr } from '../../messages/fr';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: fr.dashboard.title };

const soon = 30 * 24 * 60 * 60 * 1000;
type Entry = ProgressResponse['skills'][number];

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion?suite=/tableau-de-bord');
  const [tree, progress] = await Promise.all([getTree(), getProgress()]);
  if (!progress) redirect('/connexion');
  const skills = new Map(tree.skills.map((s) => [s.id, s]));
  const now = Date.now();
  const byState = (state: string) =>
    progress.skills.filter((s) => s.state === state && skills.has(s.skillId));
  const validated = byState('validated');
  const expiring = validated.filter(
    (s) => s.expiresAt && Date.parse(s.expiresAt) - now < soon,
  );
  const toRenew = [...byState('expired'), ...expiring];
  const available = byState('available');
  const published = tree.skills.filter((s) => s.status === 'published').length;

  const list = (entries: Entry[], detail?: (e: Entry) => string | null) =>
    entries.length ? (
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.skillId}>
            <Link
              href={`/competences/${entry.skillId}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 hover:border-accent"
            >
              <span className="font-medium">
                {skills.get(entry.skillId)?.title}
              </span>
              <span className="flex items-center gap-2 text-xs text-faint">
                {detail?.(entry)}
                <StateBadge state={entry.state} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted">{fr.dashboard.empty}</p>
    );

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">
        {fr.dashboard.hello(user.displayName ?? user.email)}
      </h1>
      <p className="mt-2 text-muted">
        {fr.dashboard.progress(validated.length, published)}
        {' · '}
        {fr.dashboard.lessonsRead(
          progress.completedLessons.length,
          tree.skills.reduce(
            (sum, s) => sum + (s.status === 'published' ? s.lessonCount : 0),
            0,
          ),
        )}
      </p>
      <div
        className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={published}
        aria-valuenow={validated.length}
        aria-label={fr.dashboard.validated}
      >
        <div
          className="h-full bg-success"
          style={{
            width: `${published ? (validated.length / published) * 100 : 0}%`,
          }}
        />
      </div>

      {progress.activeOralId && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Alert tone="warning">{fr.dashboard.activeOral}</Alert>
          <ButtonLink href={`/oraux/${progress.activeOralId}`}>
            {fr.dashboard.resume}
          </ButtonLink>
        </div>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-bold">{fr.dashboard.available}</h2>
          {list(available.slice(0, 8))}
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">{fr.dashboard.toRenew}</h2>
          {list(toRenew, (e) => (e.expiresAt ? formatDate(e.expiresAt) : null))}
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">{fr.dashboard.validated}</h2>
          {list(validated, (e) =>
            e.expiresAt ? formatDate(e.expiresAt) : null,
          )}
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold">{fr.dashboard.recentOrals}</h2>
        <p className="mb-4 text-sm text-muted">
          {fr.dashboard.quota(
            progress.quota.used,
            progress.quota.limit,
            progress.quota.windowHours,
          )}
        </p>
        {progress.recentOrals.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-raised">
            {progress.recentOrals.map((oral) => (
              <li key={oral.id}>
                <Link
                  href={`/oraux/${oral.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-accent-soft"
                >
                  <span>
                    <span className="block font-semibold">
                      {oral.challengeTitle}
                    </span>
                    <span className="text-sm text-faint">
                      {skills.get(oral.skillId)?.title} ·{' '}
                      {formatDateTime(oral.startedAt)}
                    </span>
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      oral.verdict === 'PASSED'
                        ? 'text-success'
                        : oral.verdict === 'FAILED'
                          ? 'text-warning'
                          : 'text-accent'
                    }`}
                  >
                    {oral.verdict
                      ? fr.dashboard.verdict[oral.verdict]
                      : fr.dashboard.oralStatus[oral.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{fr.dashboard.noOrals}</p>
        )}
      </section>
    </>
  );
}
