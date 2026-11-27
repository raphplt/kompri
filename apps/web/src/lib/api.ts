import { headers } from 'next/headers';
import { apiErrorSchema, z } from '@kompri/shared';
import { parseEnvironment, webEnvSchema } from '@kompri/shared/env';

/** Error returned by the API with its stable code (see apps/api/src/errors.ts). */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`API ${status} ${code}`);
  }
}

const baseUrl = () => parseEnvironment(webEnvSchema, process.env).API_URL;

/**
 * The visitor's address as the HTTPS proxy reports it, forwarded so that the
 * API can rate-limit per visitor. Caddy ignores X-Forwarded-For sent by the
 * client and sets it to the connecting address.
 */
async function visitorAddress(): Promise<string | null> {
  try {
    const incoming = await headers();
    return (
      incoming.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      incoming.get('x-real-ip') ||
      null
    );
  } catch {
    return null; // Outside a request (build, sitemap generation).
  }
}

/**
 * Server-side call to the API. Browsers never reach the API directly: the web
 * server forwards the session token kept in an HttpOnly cookie.
 */
export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  let response: Response;
  const visitor = await visitorAddress();
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      cache: 'no-store',
      // Above the longest oral step: a follow-up, then two gradings of at most
      // LLM_TIMEOUT_SECONDS (60 s recommended) each.
      signal: AbortSignal.timeout(180_000),
      headers: {
        ...(options.body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(visitor ? { 'X-Kompri-Client-IP': visitor } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiRequestError(503, 'api_unreachable');
  }
  if (!response.ok) {
    const error = apiErrorSchema.safeParse(
      await response.json().catch(() => null),
    );
    throw new ApiRequestError(
      response.status,
      error.success ? error.data.code : 'generic',
    );
  }
  if (response.status === 204) return schema.parse(null);
  return schema.parse(await response.json());
}

export const noContent = z.null();
