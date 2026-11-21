import type { NextConfig } from 'next';
import { parseEnvironment, webEnvSchema } from '@kompri/shared/env';
import { loadEnvironment } from '@kompri/shared/load-env';
loadEnvironment();
parseEnvironment(webEnvSchema, process.env);

const production = process.env.NODE_ENV === 'production';

// Next.js inlines its bootstrap scripts, hence 'unsafe-inline' for scripts and
// styles. Everything else is restricted to this origin; no third party is loaded.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const config: NextConfig = {
  transpilePackages: ['@kompri/shared'],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Development needs eval for fast refresh, so the policy is production only.
          ...(production
            ? [
                {
                  key: 'Content-Security-Policy',
                  value: contentSecurityPolicy,
                },
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : []),
        ],
      },
    ];
  },
};
export default config;
