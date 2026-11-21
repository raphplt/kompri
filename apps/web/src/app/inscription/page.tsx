import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegisterForm } from '../../components/auth-forms';
import { Card } from '../../components/ui';
import { getCurrentUser } from '../../lib/session';
import { fr } from '../../messages/fr';

export const metadata: Metadata = { title: fr.auth.registerTitle };

export default async function RegisterPage() {
  if (await getCurrentUser().catch(() => null)) redirect('/tableau-de-bord');
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">
        {fr.auth.registerTitle}
      </h1>
      <p className="mb-6 text-muted">{fr.tagline}</p>
      <Card>
        <RegisterForm />
      </Card>
    </div>
  );
}
