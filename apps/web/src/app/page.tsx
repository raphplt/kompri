import { skillsResponseSchema } from '@kompri/shared';
import type { Skill } from '@kompri/shared';
import { parseEnvironment, webEnvSchema } from '@kompri/shared/env';
import { fr } from '../messages/fr';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const env = parseEnvironment(webEnvSchema, process.env);
  let skills: Skill[] | null = null;
  try {
    const response = await fetch(`${env.API_URL}/skills`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) skills = skillsResponseSchema.parse(await response.json());
  } catch {
    /* A French fallback keeps the page readable during local startup. */
  }
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">{fr.title}</h1>
      <p className="mt-2 text-slate-600">{fr.description}</p>
      <h2 className="mt-10 text-xl font-semibold">{fr.tree}</h2>
      {skills ? (
        <ul className="mt-4 space-y-4">
          {skills.map((skill) => (
            <li key={skill.id} className="rounded border border-slate-200 p-4">
              <h3 className="font-semibold">{skill.title}</h3>
              <p>{skill.description}</p>
              <p className="mt-2 text-sm text-slate-600">
                {fr.prerequisites}
                {': '}
                {skill.prerequisites.length
                  ? skill.prerequisites
                      .map((id) => skills.find((s) => s.id === id)?.title ?? id)
                      .join(', ')
                  : fr.none}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p role="alert" className="mt-4">
          {fr.unavailable}
        </p>
      )}
      <p className="mt-8 text-sm text-slate-500">{fr.demonstration}</p>
    </main>
  );
}
