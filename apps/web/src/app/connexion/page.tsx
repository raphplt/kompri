import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '../../components/auth-forms';
import { Alert, Card } from '../../components/ui';
import { getCurrentUser, safeRedirect } from '../../lib/session';
import { fr } from '../../messages/fr';

export const metadata: Metadata = { title: fr.auth.loginTitle };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const next = safeRedirect(query.suite);
  if (await getCurrentUser().catch(() => null)) redirect(next);
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">
        {fr.auth.loginTitle}
      </h1>
      {query['mot-de-passe'] === 'change' && (
        <div className="mb-4">
          <Alert tone="success">{fr.auth.resetDone}</Alert>
        </div>
      )}
      <Card>
        <LoginForm next={next} />
      </Card>
    </div>
  );
}
