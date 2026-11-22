import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '../../../components/auth-forms';
import { Alert, Card } from '../../../components/ui';
import { fr } from '../../../messages/fr';

export const metadata: Metadata = {
  title: fr.auth.resetTitle,
  robots: { index: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const token = (await searchParams).jeton;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">
        {fr.auth.resetTitle}
      </h1>
      <Card>
        {typeof token === 'string' && /^[\w-]{20,200}$/.test(token) ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-3">
            <Alert>{fr.auth.errors.reset_link_invalid}</Alert>
            <Link
              href="/mot-de-passe-oublie"
              className="text-accent hover:underline"
            >
              {fr.auth.forgotTitle}
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
