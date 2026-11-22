'use client';

import Link from 'next/link';
import { buttonClass } from '../components/ui';
import { fr } from '../messages/fr';

// Shown when a page fails to render; the details stay in the server logs.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold">{fr.failure.title}</h1>
      <p className="mt-2 text-muted">{fr.failure.text}</p>
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={reset} className={buttonClass.primary}>
          {fr.failure.retry}
        </button>
        <Link href="/" className={buttonClass.secondary}>
          {fr.failure.home}
        </Link>
      </div>
    </div>
  );
}
