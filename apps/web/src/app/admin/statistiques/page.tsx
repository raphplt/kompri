import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { adminStatsSchema } from '@kompri/shared';
import { AdminTabs } from '../../../components/admin-tabs';
import { Card, FamilyBadge } from '../../../components/ui';
import { api } from '../../../lib/api';
import { getCurrentUser, getToken } from '../../../lib/session';
import { fr } from '../../../messages/fr';
import type { ChallengeFamily } from '@kompri/shared';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: fr.admin.statsTitle,
  robots: { index: false },
};

const percent = (value: number | null) =>
  value === null ? '—' : `${Math.round(value * 100)} %`;

const usd = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion?suite=/admin/statistiques');
  if (user.role !== 'admin') notFound();
  const stats = await api('/admin/stats', adminStatsSchema, {
    token: await getToken(),
  });
  const tiles = [
    [fr.admin.learners, stats.learners],
    [fr.admin.active, stats.activeLearners30d],
    [fr.admin.orals7d, stats.orals7d],
    [fr.admin.openReviews, stats.openReviews],
  ] as const;
  return (
    <>
      <AdminTabs current="stats" />
      <h1 className="text-3xl font-extrabold tracking-tight">
        {fr.admin.statsTitle}
      </h1>
      <p className="mt-2 mb-8 max-w-3xl text-muted">{fr.admin.statsIntro}</p>
      <Card className="mb-4">
        <p className="text-sm text-muted">
          {fr.admin.llmSpend(stats.llmSpend.month)}
        </p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums">
          {usd.format(stats.llmSpend.costUsd)}
        </p>
        <p className="text-sm text-faint">
          {stats.llmSpend.budgetUsd === null
            ? fr.admin.llmNoBudget
            : fr.admin.llmBudget(usd.format(stats.llmSpend.budgetUsd))}
        </p>
      </Card>
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-raised">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-faint">
            <tr>
              <th scope="col" className="p-3">
                {fr.admin.columns.challenge}
              </th>
              <th scope="col" className="p-3 text-right">
                {fr.admin.columns.orals}
              </th>
              <th scope="col" className="p-3 text-right">
                {fr.admin.columns.passRate}
              </th>
              <th scope="col" className="p-3 text-right">
                {fr.admin.columns.score}
              </th>
              <th scope="col" className="p-3 text-right">
                {fr.admin.columns.reviews}
              </th>
              <th scope="col" className="p-3 text-right">
                {fr.admin.columns.overturned}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stats.challenges.map((row) => (
              <tr key={row.challengeId}>
                <td className="p-3">
                  <Link
                    href={`/defis/${row.challengeId}`}
                    className="font-medium hover:text-accent"
                  >
                    {row.title}
                  </Link>
                  <span className="ml-2 align-middle">
                    <FamilyBadge family={row.family as ChallengeFamily} />
                  </span>
                  <span className="block text-xs text-faint">
                    {row.skillId}
                  </span>
                </td>
                <td className="p-3 text-right tabular-nums">{row.orals}</td>
                <td className="p-3 text-right tabular-nums">
                  {percent(row.passRate)}
                </td>
                <td className="p-3 text-right tabular-nums">
                  {percent(row.averageScore)}
                </td>
                <td className="p-3 text-right tabular-nums">{row.reviews}</td>
                <td className="p-3 text-right tabular-nums">
                  {row.overturned}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
