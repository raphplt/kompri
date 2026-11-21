/**
 * Route handlers are not covered by the Server Actions origin check. The
 * session cookie is SameSite=Lax, and this check rejects any cross-site call.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!origin || !host) return false;
  return URL.canParse(origin) && new URL(origin).host === host;
}
