import type { ProgressResponse, TreeResponse } from '@kompri/shared';
import { SkillTree } from '../components/skill-tree';
import { Alert, ButtonLink } from '../components/ui';
import { getProgress, getTree } from '../lib/data';
import { getCurrentUser } from '../lib/session';
import { fr } from '../messages/fr';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  let tree: TreeResponse | null = null;
  let progress: ProgressResponse | null = null;
  let signedIn = false;
  try {
    tree = await getTree();
    signedIn = !!(await getCurrentUser());
    progress = await getProgress();
  } catch {
    /* Rendered below as an unavailability message. */
  }
  return (
    <>
      {query.compte === 'supprime' && (
        <div className="mb-8">
          <Alert tone="success">
            Ton compte et toutes tes données ont été supprimés.
          </Alert>
        </div>
      )}
      <section className="grid items-center gap-10 py-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
            Développement web full-stack
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight whitespace-pre-line sm:text-5xl">
            {fr.home.heroTitle}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{fr.home.heroText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {signedIn ? (
              <ButtonLink href="/tableau-de-bord">
                {fr.home.continue}
              </ButtonLink>
            ) : (
              <ButtonLink href="/inscription">{fr.home.start}</ButtonLink>
            )}
            <ButtonLink href="#parcours" variant="secondary">
              {fr.home.explore}
            </ButtonLink>
          </div>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {fr.home.steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-xl border border-line bg-raised p-4 shadow-sm"
            >
              <p className="text-sm font-bold text-accent">Étape {index + 1}</p>
              <h2 className="mt-1 font-bold">{step.title}</h2>
              <p className="mt-1 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="parcours" className="mt-16 scroll-mt-24">
        <h2 className="text-3xl font-extrabold tracking-tight">
          {fr.home.treeTitle}
        </h2>
        <p className="mt-2 mb-10 max-w-3xl text-muted">{fr.home.treeText}</p>
        {tree ? (
          <SkillTree tree={tree} progress={progress} />
        ) : (
          <Alert>{fr.tree.unavailable}</Alert>
        )}
      </section>
    </>
  );
}
