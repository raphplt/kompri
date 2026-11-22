import type { MetadataRoute } from 'next';
import { parseEnvironment, webEnvSchema } from '@kompri/shared/env';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const base = parseEnvironment(webEnvSchema, process.env).WEB_URL;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Personal and administrative pages are never indexed.
      disallow: [
        '/oraux/',
        '/compte',
        '/tableau-de-bord',
        '/admin/',
        '/api/',
        '/mot-de-passe',
      ],
    },
    sitemap: new URL('/sitemap.xml', base).toString(),
  };
}
