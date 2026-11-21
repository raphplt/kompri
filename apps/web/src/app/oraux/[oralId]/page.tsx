import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { oralViewSchema } from '@kompri/shared';
import { OralChat } from '../../../components/oral-chat';
import { Breadcrumbs } from '../../../components/ui';
import { api, ApiRequestError } from '../../../lib/api';
import { getCurrentUser, getToken } from '../../../lib/session';
import { fr } from '../../../messages/fr';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: fr.oral.title,
  robots: { index: false },
};

export default async function OralPage({
  params,
}: {
  params: Promise<{ oralId: string }>;
}) {
  const { oralId } = await params;
  if (!(await getCurrentUser())) redirect(`/connexion?suite=/oraux/${oralId}`);
  let oral;
  try {
    oral = await api(`/orals/${encodeURIComponent(oralId)}`, oralViewSchema, {
      token: await getToken(),
    });
  } catch (error) {
    if (error instanceof ApiRequestError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { href: '/tableau-de-bord', label: fr.nav.dashboard },
          { href: `/defis/${oral.challengeId}`, label: oral.challengeTitle },
          { label: fr.oral.title },
        ]}
      />
      <h1 className="mb-8 text-3xl font-extrabold tracking-tight">
        {fr.oral.title} — {oral.challengeTitle}
      </h1>
      <OralChat initial={oral} />
    </div>
  );
}
