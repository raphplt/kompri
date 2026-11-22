import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { logoutAction } from './actions';
import { getCurrentUser } from '../lib/session';
import { VerifyBanner } from '../components/account-forms';
import { fr } from '../messages/fr';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${fr.title} — ${fr.tagline}`,
    template: `%s · ${fr.title}`,
  },
  description: fr.description,
};

async function Header() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    /* The header stays usable when the API is down. */
  }
  return (
    <header className="z-20 sm:sticky sm:top-0 border-b border-line bg-raised/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-extrabold"
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-accent text-white dark:text-slate-950"
          >
            K
          </span>
          {fr.title}
        </Link>
        <nav
          aria-label="Navigation principale"
          className="flex flex-wrap items-center gap-1 text-sm font-medium whitespace-nowrap sm:gap-3"
        >
          <Link
            href="/#parcours"
            className="hidden rounded-md px-2 py-1 text-muted hover:text-accent sm:inline"
          >
            {fr.nav.path}
          </Link>
          {user ? (
            <>
              <Link
                href="/tableau-de-bord"
                className="rounded-md px-2 py-1 text-muted hover:text-accent"
              >
                {fr.nav.dashboard}
              </Link>
              {user.role === 'admin' && (
                <Link
                  href="/admin/reexamens"
                  className="rounded-md px-2 py-1 text-muted hover:text-accent"
                >
                  {fr.admin.nav}
                </Link>
              )}
              <Link
                href="/compte"
                className="rounded-md px-2 py-1 text-muted hover:text-accent"
              >
                {fr.nav.account}
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md px-2 py-1 text-muted hover:text-accent"
                >
                  {fr.nav.logout}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className="rounded-md px-2 py-1 text-muted hover:text-accent"
              >
                {fr.nav.login}
              </Link>
              <Link
                href="/inscription"
                className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:bg-accent-strong dark:text-slate-950"
              >
                {fr.nav.register}
              </Link>
            </>
          )}
        </nav>
      </div>
      {user && !user.emailVerified && <VerifyBanner />}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
        <p>
          <strong className="text-muted">{fr.title}</strong> — {fr.tagline}
        </p>
        <nav aria-label="Liens légaux" className="flex flex-wrap gap-4">
          <Link href="/comment-ca-marche" className="hover:text-accent">
            {fr.footer.about}
          </Link>
          <Link href="/conditions" className="hover:text-accent">
            {fr.footer.terms}
          </Link>
          <Link href="/confidentialite" className="hover:text-accent">
            {fr.footer.privacy}
          </Link>
          <Link href="/mentions-legales" className="hover:text-accent">
            {fr.footer.legal}
          </Link>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-faint">
        {fr.footer.note}
      </p>
    </footer>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-raised focus:px-3 focus:py-2"
        >
          {fr.nav.skip}
        </a>
        <Header />
        <main id="contenu" className="mx-auto max-w-6xl px-4 py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
