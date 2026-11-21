import { cookies } from 'next/headers';
import { cache } from 'react';
import { userResponseSchema } from '@kompri/shared';
import type { UserResponse } from '@kompri/shared';
import { api, ApiRequestError } from './api';

export const sessionCookie = 'kompri_session';

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(sessionCookie)?.value ?? null;
}

/** Current user for this request, or null. Cached for the duration of a render. */
export const getCurrentUser = cache(async (): Promise<UserResponse | null> => {
  const token = await getToken();
  if (!token) return null;
  try {
    return await api('/me', userResponseSchema, { token });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) return null;
    throw error;
  }
});

export async function setSession(token: string, expiresAt: string) {
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Plain HTTP is only acceptable on a developer machine.
    secure:
      process.env.NODE_ENV === 'production' &&
      process.env.WEB_INSECURE_COOKIES !== 'true',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function clearSession() {
  (await cookies()).delete(sessionCookie);
}

/** Only same-site relative paths are accepted as redirect targets. */
export function safeRedirect(target: unknown, fallback = '/tableau-de-bord') {
  return typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//') &&
    !target.startsWith('/\\')
    ? target
    : fallback;
}
