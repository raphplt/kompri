'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  deleteAccountAction,
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
} from '../app/actions';
import type { FormState } from '../app/actions';
import { fr } from '../messages/fr';
import { Alert, buttonClass, inputClass, labelClass } from './ui';

const authError = (code?: string) =>
  code
    ? ((fr.auth.errors as Record<string, string>)[code] ??
      fr.auth.errors.generic)
    : null;

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    loginAction,
    {},
  );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ''} />
      <div>
        <label htmlFor="email" className={labelClass}>
          {fr.auth.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          {fr.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      {authError(state.error) && <Alert>{authError(state.error)}</Alert>}
      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass.primary} w-full`}
      >
        {fr.auth.loginSubmit}
      </button>
      <p className="text-center text-sm">
        <Link
          href="/mot-de-passe-oublie"
          className="text-accent hover:underline"
        >
          {fr.auth.forgot}
        </Link>
      </p>
      <p className="text-center text-sm text-muted">
        {fr.auth.noAccount}{' '}
        <Link
          href="/inscription"
          className="font-semibold text-accent hover:underline"
        >
          {fr.nav.register}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    registerAction,
    {},
  );
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="displayName" className={labelClass}>
          {fr.auth.displayName}
        </label>
        <input
          id="displayName"
          name="displayName"
          autoComplete="nickname"
          required
          maxLength={60}
          defaultValue={state.values?.displayName}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>
          {fr.auth.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          {fr.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          aria-describedby="password-help"
          className={inputClass}
        />
        <p id="password-help" className="mt-1 text-xs text-faint">
          {fr.auth.passwordHelp}
        </p>
      </div>
      <p className="text-xs text-muted">
        {fr.auth.consent}{' '}
        <Link href="/confidentialite" className="text-accent hover:underline">
          {fr.footer.privacy}
        </Link>
      </p>
      {authError(state.error) && <Alert>{authError(state.error)}</Alert>}
      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass.primary} w-full`}
      >
        {fr.auth.registerSubmit}
      </button>
      <p className="text-center text-sm text-muted">
        {fr.auth.hasAccount}{' '}
        <Link
          href="/connexion"
          className="font-semibold text-accent hover:underline"
        >
          {fr.nav.login}
        </Link>
      </p>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    deleteAccountAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="delete-password" className={labelClass}>
          {fr.account.deleteConfirm}
        </label>
        <input
          id="delete-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      {authError(state.error) && <Alert>{authError(state.error)}</Alert>}
      <button type="submit" disabled={pending} className={buttonClass.danger}>
        {fr.account.deleteButton}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<
    FormState & { sent?: boolean },
    FormData
  >(forgotPasswordAction, {});
  if (state.sent) return <Alert tone="success">{fr.auth.forgotSent}</Alert>;
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className={labelClass}>
          {fr.auth.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>
      {authError(state.error) && <Alert>{authError(state.error)}</Alert>}
      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass.primary} w-full`}
      >
        {fr.auth.forgotSubmit}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    resetPasswordAction,
    {},
  );
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className={labelClass}>
          {fr.auth.newPassword}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          aria-describedby="password-help"
          className={inputClass}
        />
        <p id="password-help" className="mt-1 text-xs text-faint">
          {fr.auth.passwordHelp}
        </p>
      </div>
      {authError(state.error) && <Alert>{authError(state.error)}</Alert>}
      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass.primary} w-full`}
      >
        {fr.auth.resetSubmit}
      </button>
    </form>
  );
}
