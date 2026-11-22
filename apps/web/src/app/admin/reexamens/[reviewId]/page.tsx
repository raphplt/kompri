import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { adminReviewDetailSchema } from '@kompri/shared';
import { DecisionForm } from '../../../../components/account-forms';
import { Markdown } from '../../../../components/markdown';
import { OralResultView } from '../../../../components/oral-result';
import { Breadcrumbs, Card } from '../../../../components/ui';
import { api, ApiRequestError } from '../../../../lib/api';
import { getCurrentUser, getToken } from '../../../../lib/session';
import { fr } from '../../../../messages/fr';

export const dynamic = 'force-dynamic';

const seconds = (ms: number) => `${Math.round(ms / 1000)} s`;
export const metadata: Metadata = {
  title: fr.admin.title,
  robots: { index: false },
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?suite=/admin/reexamens/${reviewId}`);
  if (user.role !== 'admin') notFound();
  let review;
  try {
    review = await api(
      `/admin/reviews/${encodeURIComponent(reviewId)}`,
      adminReviewDetailSchema,
      {
        token: await getToken(),
      },
    );
  } catch (error) {
    if (error instanceof ApiRequestError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }
  return (
    <>
      <Breadcrumbs
        items={[
          { href: '/admin/reexamens', label: fr.admin.title },
          { label: review.challengeTitle },
        ]}
      />
      <h1 className="text-3xl font-extrabold tracking-tight">
        {review.challengeTitle}
      </h1>
      <p className="mt-2 text-muted">
        {fr.admin.learner} : {review.learner} · {fr.admin.status[review.status]}
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="min-w-0 space-y-8">
          <Card>
            <h2 className="mb-2 font-bold">{fr.admin.message}</h2>
            <p className="whitespace-pre-line">{review.message}</p>
          </Card>
          <OralResultView result={review.result} />
          <section>
            <h2 className="mb-1 text-xl font-bold">{fr.admin.transcript}</h2>
            <p className="mb-3 text-xs text-faint">{fr.admin.signalsNote}</p>
            <ol className="space-y-3">
              {review.turns.map((turn, index) => (
                <li
                  key={index}
                  className="rounded-xl border border-line bg-raised p-3"
                >
                  <p className="mb-1 text-xs font-bold text-accent">
                    {turn.speaker === 'learner'
                      ? fr.admin.learner
                      : fr.oral.examiner}
                  </p>
                  <p className="whitespace-pre-wrap">{turn.text}</p>
                  {turn.signals && (
                    <p className="mt-2 text-xs text-faint">
                      {fr.admin.signals(
                        turn.signals.pasteAttempts,
                        turn.signals.focusLosses,
                        turn.signals.firstInputMs === null
                          ? '—'
                          : seconds(turn.signals.firstInputMs),
                        seconds(turn.signals.typingMs),
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold">{fr.admin.submission}</h2>
            <pre className="overflow-x-auto rounded-xl bg-raised p-4 text-sm">
              {review.submission}
            </pre>
          </section>
        </div>
        <aside className="space-y-6">
          <Card>
            {review.status === 'open' ? (
              <DecisionForm reviewId={review.id} verdict={review.verdict} />
            ) : (
              <>
                <h2 className="mb-2 font-bold">{fr.review.response}</h2>
                <p className="whitespace-pre-line text-sm">{review.response}</p>
              </>
            )}
          </Card>
          {review.examinerNotes && (
            <Card>
              <h2 className="mb-2 font-bold">{fr.admin.notes}</h2>
              <Markdown source={review.examinerNotes} className="prose-sm" />
            </Card>
          )}
          <Card>
            <h2 className="mb-2 font-bold">{fr.admin.instructions}</h2>
            <Markdown source={review.instructions} className="prose-sm" />
          </Card>
        </aside>
      </div>
    </>
  );
}
