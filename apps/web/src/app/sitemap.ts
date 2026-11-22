import type { MetadataRoute } from 'next';
import { parseEnvironment, webEnvSchema } from '@kompri/shared/env';
import { getSkill, getTree } from '../lib/data';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = parseEnvironment(webEnvSchema, process.env).WEB_URL;
  const url = (path: string) => new URL(path, base).toString();
  const pages: MetadataRoute.Sitemap = [
    '/',
    '/comment-ca-marche',
    '/inscription',
    '/mentions-legales',
    '/confidentialite',
    '/conditions',
  ].map((path) => ({ url: url(path) }));
  try {
    const tree = await getTree();
    for (const summary of tree.skills.filter((s) => s.status === 'published')) {
      const skill = await getSkill(summary.id);
      if (!skill) continue;
      pages.push({ url: url(`/competences/${skill.id}`) });
      for (const lesson of skill.lessons)
        pages.push({ url: url(`/competences/${skill.id}/${lesson.slug}`) });
      for (const challenge of skill.challenges)
        pages.push({ url: url(`/defis/${challenge.id}`) });
    }
  } catch {
    /* The static pages are still listed when the API is unavailable. */
  }
  return pages;
}
