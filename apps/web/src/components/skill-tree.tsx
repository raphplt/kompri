import Link from 'next/link';
import type { ProgressResponse, TreeResponse } from '@kompri/shared';
import { stateOf } from '../lib/data';
import { fr } from '../messages/fr';
import { StateBadge } from './ui';

export function SkillTree({
  tree,
  progress,
}: {
  tree: TreeResponse;
  progress: ProgressResponse | null;
}) {
  const titles = new Map(tree.skills.map((s) => [s.id, s.title]));
  return (
    <div className="space-y-12">
      {tree.domains.map((domain, index) => {
        const skills = tree.skills.filter((s) => s.domain === domain.id);
        if (!skills.length) return null;
        return (
          <section key={domain.id} aria-labelledby={`domaine-${domain.id}`}>
            <div className="mb-4 flex items-baseline gap-3">
              <span className="text-sm font-bold text-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 id={`domaine-${domain.id}`} className="text-xl font-bold">
                  {domain.title}
                </h3>
                <p className="text-sm text-muted">{domain.description}</p>
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map((skill) => {
                const state = stateOf(progress, skill);
                return (
                  <li key={skill.id}>
                    <Link
                      href={`/competences/${skill.id}`}
                      className="group flex h-full flex-col rounded-xl border border-line bg-raised p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h4 className="font-semibold group-hover:text-accent">
                          {skill.title}
                        </h4>
                        {state && <StateBadge state={state} />}
                      </div>
                      <p className="flex-1 text-sm text-muted">
                        {skill.description}
                      </p>
                      <p className="mt-3 text-xs text-faint">
                        {skill.status === 'published'
                          ? `${fr.tree.lessons(skill.lessonCount)} · ${fr.tree.hours(skill.estimatedHours)}`
                          : fr.tree.upcoming}
                      </p>
                      {skill.prerequisites.length > 0 && (
                        <p className="mt-1 text-xs text-faint">
                          {fr.tree.prerequisites} :{' '}
                          {skill.prerequisites
                            .map((id) => titles.get(id) ?? id)
                            .join(', ')}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
