import Link from 'next/link';
import { fr } from '../messages/fr';

export function AdminTabs({ current }: { current: 'reviews' | 'stats' }) {
  const tab = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-semibold ${active ? 'bg-accent-soft text-accent' : 'text-muted hover:text-accent'}`;
  return (
    <nav aria-label={fr.admin.nav} className="mb-6 flex gap-2">
      <Link
        href="/admin/reexamens"
        className={tab(current === 'reviews')}
        aria-current={current === 'reviews' ? 'page' : undefined}
      >
        {fr.admin.reviewsNav}
      </Link>
      <Link
        href="/admin/statistiques"
        className={tab(current === 'stats')}
        aria-current={current === 'stats' ? 'page' : undefined}
      >
        {fr.admin.statsNav}
      </Link>
    </nav>
  );
}
