import type { Metadata } from 'next';
import { VerifyEmailForm } from '../../../components/account-forms';
import { Alert, Card } from '../../../components/ui';
import { fr } from '../../../messages/fr';

export const metadata: Metadata = {
  title: fr.verify.title,
  robots: { index: false },
};

// A button, not an automatic call: mail scanners that open links must not use the token.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const token = (await searchParams).jeton;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">
        {fr.verify.title}
      </h1>
      <Card>
        {typeof token === 'string' && /^[\w-]{20,200}$/.test(token) ? (
          <VerifyEmailForm token={token} />
        ) : (
          <Alert>{fr.errors.verification_link_invalid}</Alert>
        )}
      </Card>
    </div>
  );
}
