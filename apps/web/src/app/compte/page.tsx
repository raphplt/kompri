import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DeleteAccountForm } from '../../components/auth-forms';
import {
  ChangeEmailForm,
  ChangePasswordForm,
} from '../../components/account-forms';
import { buttonClass, Card } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { getCurrentUser } from '../../lib/session';
import { fr } from '../../messages/fr';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: fr.account.title };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion?suite=/compte');
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">
        {fr.account.title}
      </h1>
      <Card>
        <h2 className="mb-2 font-bold">{fr.account.profile}</h2>
        <p className="font-semibold">{user.displayName}</p>
        <p className="text-muted">
          {user.email}
          {!user.emailVerified && (
            <span className="ml-2 text-xs font-semibold text-warning">
              {fr.settings.unverified}
            </span>
          )}
        </p>
        <p className="mt-1 text-sm text-faint">
          {fr.account.memberSince(formatDate(user.createdAt))}
        </p>
      </Card>
      <Card>
        <h2 className="mb-4 font-bold">{fr.settings.passwordTitle}</h2>
        <ChangePasswordForm />
      </Card>
      <Card>
        <h2 className="mb-4 font-bold">{fr.settings.emailTitle}</h2>
        <ChangeEmailForm />
      </Card>
      <Card>
        <h2 className="mb-2 font-bold">{fr.account.exportTitle}</h2>
        <p className="mb-4 text-sm text-muted">{fr.account.exportText}</p>
        <a href="/compte/export" className={buttonClass.secondary} download>
          {fr.account.exportButton}
        </a>
      </Card>
      <Card className="border-danger/40">
        <h2 className="mb-2 font-bold text-danger">{fr.account.deleteTitle}</h2>
        <p className="mb-4 text-sm text-muted">{fr.account.deleteText}</p>
        <DeleteAccountForm />
      </Card>
    </div>
  );
}
