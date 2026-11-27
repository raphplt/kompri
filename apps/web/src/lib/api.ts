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
 * Server-side call to the API. Browsers never reach the API directly: the web
 * server forwards the session token kept in an HttpOnly cookie.
 */
export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  let response: Response;
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
