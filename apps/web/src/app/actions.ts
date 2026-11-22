'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  attemptResponseSchema,
  authResponseSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  oralViewSchema,
  registerRequestSchema,
  z,
} from '@kompri/shared';
import type { OralView } from '@kompri/shared';
import { api, ApiRequestError, noContent } from '../lib/api';
import {
  clearSession,
  getToken,
  safeRedirect,
  setSession,
} from '../lib/session';

export interface FormState {
  error?: string;
  values?: Record<string, string>;
}

const field = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
};
const codeOf = (error: unknown) =>
  error instanceof ApiRequestError ? error.code : 'generic';

export async function registerAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const values = {
    email: field(data, 'email'),
    displayName: field(data, 'displayName'),
  };
  const input = registerRequestSchema.safeParse({
    ...values,
    password: field(data, 'password'),
  });
  if (!input.success)
    return {
      values,
      error: input.error.issues.some((i) => i.path[0] === 'password')
        ? 'password_short'
        : 'invalid_input',
    };
  let session;
  try {
    session = await api('/auth/register', authResponseSchema, {
      body: input.data,
    });
  } catch (error) {
    return { values, error: codeOf(error) };
  }
  await setSession(session.token, session.expiresAt);
  redirect('/tableau-de-bord');
}

export async function loginAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const values = { email: field(data, 'email') };
  const input = loginRequestSchema.safeParse({
    ...values,
    password: field(data, 'password'),
  });
  if (!input.success) return { values, error: 'invalid_credentials' };
  let session;
  try {
    session = await api('/auth/login', authResponseSchema, {
      body: input.data,
    });
  } catch (error) {
    return { values, error: codeOf(error) };
  }
  await setSession(session.token, session.expiresAt);
  redirect(safeRedirect(field(data, 'next')));
}

export async function forgotPasswordAction(
  _state: FormState & { sent?: boolean },
  data: FormData,
): Promise<FormState & { sent?: boolean }> {
  const input = forgotPasswordRequestSchema.safeParse({
    email: field(data, 'email'),
  });
  if (!input.success) return { error: 'invalid_input' };
  try {
    await api('/auth/password/forgot', z.object({}), { body: input.data });
  } catch (error) {
    return { error: codeOf(error) };
  }
  return { sent: true };
}

export async function resetPasswordAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const password = field(data, 'password');
  if (password.length < 12) return { error: 'password_short' };
  try {
    await api('/auth/password/reset', noContent, {
      body: { token: field(data, 'token'), password },
    });
  } catch (error) {
    return { error: codeOf(error) };
  }
  redirect('/connexion?mot-de-passe=change');
}

export async function logoutAction() {
  const token = await getToken();
  if (token)
    await api('/auth/logout', noContent, { method: 'POST', token }).catch(
      () => undefined,
    );
  await clearSession();
  redirect('/');
}

export async function deleteAccountAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const token = await getToken();
  try {
    await api('/me', noContent, {
      method: 'DELETE',
      token,
      body: { password: field(data, 'password') },
    });
  } catch (error) {
    return { error: codeOf(error) };
  }
  await clearSession();
  redirect('/?compte=supprime');
}

export async function submitAttemptAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const challengeId = field(data, 'challengeId');
  const work = field(data, 'work');
  if (!work.trim()) return { error: 'invalid_input', values: { work } };
  try {
    await api('/attempts', attemptResponseSchema, {
      token: await getToken(),
      body: { challengeId, work },
    });
  } catch (error) {
    return { error: codeOf(error), values: { work } };
  }
  revalidatePath(`/defis/${challengeId}`);
  return {};
}

export async function startOralAction(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  let oral: OralView;
  try {
    oral = await api(
      `/attempts/${encodeURIComponent(field(data, 'attemptId'))}/oral`,
      oralViewSchema,
      {
        method: 'POST',
        token: await getToken(),
        body: { placement: field(data, 'placement') === 'true' },
      },
    );
  } catch (error) {
    return { error: codeOf(error) };
  }
  redirect(`/oraux/${oral.id}`);
}

export type OralActionResult =
  { ok: true; oral: OralView } | { ok: false; error: string };

async function oralCall(
  path: string,
  body?: unknown,
): Promise<OralActionResult> {
  try {
    const oral = await api(path, oralViewSchema, {
      method: 'POST',
      token: await getToken(),
      body,
    });
    return { ok: true, oral };
  } catch (error) {
    return { ok: false, error: codeOf(error) };
  }
}

export async function answerOralAction(oralId: string, text: string) {
  return oralCall(`/orals/${encodeURIComponent(oralId)}/answers`, { text });
}

export async function abandonOralAction(oralId: string) {
  return oralCall(`/orals/${encodeURIComponent(oralId)}/abandon`);
}

export async function retryGradingAction(oralId: string) {
  return oralCall(`/orals/${encodeURIComponent(oralId)}/grade`);
}
