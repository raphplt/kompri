import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '../../components/auth-forms';
import { Card } from '../../components/ui';
import { getCurrentUser, safeRedirect } from '../../lib/session';
import { fr } from '../../messages/fr';

export const metadata: Metadata = { title: fr.auth.loginTitle };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeRedirect((await searchParams).suite);
  if (await getCurrentUser().catch(() => null)) redirect(next);
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">
        {fr.auth.loginTitle}
      </h1>
      <Card>
        <LoginForm next={next} />
      </Card>
    </div>
  );
}
