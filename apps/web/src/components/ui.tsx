import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import type { ChallengeFamily, SkillState } from '@kompri/shared';
import { fr } from '../messages/fr';

export const buttonClass = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-950',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-raised px-4 py-2.5 font-semibold text-ink transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60',
  danger:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-950',
  ghost:
    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted transition hover:bg-accent-soft hover:text-accent',
};

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonClass }) {
  return <Link className={`${buttonClass[variant]} ${className}`} {...props} />;
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-raised p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

const stateStyle: Record<SkillState, string> = {
  validated: 'bg-success-soft text-success border-success/30',
  expired: 'bg-warning-soft text-warning border-warning/30',
  available: 'bg-accent-soft text-accent border-accent/30',
  locked: 'bg-surface text-faint border-line',
  upcoming: 'bg-surface text-faint border-line',
};

export function StateBadge({ state }: { state: SkillState }) {
  return (
    <span
      title={fr.stateHelp[state]}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stateStyle[state]}`}
    >
      {fr.states[state]}
    </span>
  );
}

const familyStyle: Record<ChallengeFamily, string> = {
  SANS_IA: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
  AVEC_IA:
    'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200',
  CONTRE_IA: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200',
  APRES_IA:
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
};

export function FamilyBadge({ family }: { family: ChallengeFamily }) {
  return (
    <span
      title={fr.families[family].text}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide uppercase ${familyStyle[family]}`}
    >
      {fr.families[family].label}
    </span>
  );
}

export function Alert({
  children,
  tone = 'danger',
}: {
  children: ReactNode;
  tone?: 'danger' | 'warning' | 'success' | 'info';
}) {
  const tones = {
    danger: 'border-danger/40 bg-danger-soft text-danger',
    warning: 'border-warning/40 bg-warning-soft text-warning',
    success: 'border-success/40 bg-success-soft text-success',
    info: 'border-accent/40 bg-accent-soft text-accent-strong',
  };
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm font-medium ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  return (
    <nav aria-label="Fil d’Ariane" className="mb-6 text-sm text-faint">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-accent">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-muted">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export const inputClass =
  'mt-1 block w-full rounded-lg border border-line bg-raised px-3 py-2 text-ink shadow-sm placeholder:text-faint focus:border-accent';
export const labelClass = 'block text-sm font-semibold text-ink';
