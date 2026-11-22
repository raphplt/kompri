import type { Metadata } from 'next';
import { ForgotPasswordForm } from '../../components/auth-forms';
import { Card } from '../../components/ui';
import { fr } from '../../messages/fr';

export const metadata: Metadata = { title: fr.auth.forgotTitle };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight">
        {fr.auth.forgotTitle}
      </h1>
      <p className="mb-6 text-muted">{fr.auth.forgotText}</p>
      <Card>
        <ForgotPasswordForm />
      </Card>
    </div>
  );
}
