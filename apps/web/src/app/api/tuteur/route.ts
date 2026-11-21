import { parseEnvironment, webEnvSchema } from '@kompri/shared/env';
import { isSameOrigin } from '../../../lib/same-origin';
import { getToken } from '../../../lib/session';

export const dynamic = 'force-dynamic';

const json = (status: number, code: string) =>
  Response.json({ code }, { status, headers: { 'Cache-Control': 'no-store' } });

/** Relays the tutor stream from the API; the browser never sees the session token. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json(403, 'forbidden_origin');
  const token = await getToken();
  if (!token) return json(401, 'unauthenticated');
  const body = await request.text();
  if (body.length > 120_000) return json(413, 'invalid_input');
  let upstream: Response;
  try {
    upstream = await fetch(
      `${parseEnvironment(webEnvSchema, process.env).API_URL}/tutor/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
        signal: request.signal,
      },
    );
  } catch {
    return json(503, 'tutor_unavailable');
  }
  if (!upstream.ok || !upstream.body) {
    const error = (await upstream.json().catch(() => null)) as {
      code?: string;
    } | null;
    return json(upstream.status, error?.code ?? 'generic');
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
