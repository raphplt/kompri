import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { adminReviewSummarySchema, z } from '@kompri/shared';
import { api } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import { getCurrentUser, getToken } from '../../../lib/session';
import { fr } from '../../../messages/fr';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: fr.admin.title,
  robots: { index: false },
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion?suite=/admin/reexamens');
  if (user.role !== 'admin') notFound();
  const all = (await searchParams).tout === '1';
  const reviews = await api(
    `/admin/reviews?status=${all ? 'all' : 'open'}`,
    z.array(adminReviewSummarySchema),
    { token: await getToken() },
  );
  return (
    <>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {fr.admin.title}
        </h1>
        <Link
          href={all ? '/admin/reexamens' : '/admin/reexamens?tout=1'}
          className="text-sm text-accent hover:underline"
        >
          {all ? fr.admin.showOpen : fr.admin.showAll}
        </Link>
      </div>
      {reviews.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-raised">
          {reviews.map((review) => (
            <li key={review.id}>
              <Link
                href={`/admin/reexamens/${review.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-accent-soft"
              >
                <span>
                  <span className="block font-semibold">
                    {review.challengeTitle}
                  </span>
                  <span className="text-sm text-faint">
                    {review.learner} · {formatDateTime(review.createdAt)}
                  </span>
                </span>
                <span className="text-sm font-semibold">
                  {fr.admin.status[review.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">{fr.admin.empty}</p>
      )}
    </>
  );
}
