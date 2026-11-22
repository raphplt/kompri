'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import {
  changeEmailAction,
  changePasswordAction,
  decideReviewAction,
  resendVerificationAction,
  verifyEmailAction,
} from '../app/actions';
import type { FormState } from '../app/actions';
import { fr } from '../messages/fr';
import { Alert, buttonClass, inputClass, labelClass } from './ui';

type DoneState = FormState & { done?: boolean };
const errorText = (code?: string) =>
  code
    ? ((fr.errors as Record<string, string>)[code] ??
      (fr.auth.errors as Record<string, string>)[code] ??
      fr.errors.generic)
    : null;

export function VerifyBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="border-b border-warning/40 bg-warning-soft">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-warning">
        <span role="status">{message ?? fr.verify.banner}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await resendVerificationAction();
              setMessage(
                result.sent ? fr.verify.resent : errorText(result.error),
              );
            })
          }
          className="font-semibold underline"
        >
          {fr.verify.resend}
        </button>
      </div>
    </div>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<DoneState, FormData>(
    verifyEmailAction,
    {},
  );
  if (state.done)
    return (
      <div className="space-y-4">
        <Alert tone="success">{fr.verify.done}</Alert>
        <Link href="/tableau-de-bord" className={buttonClass.primary}>
          {fr.verify.toDashboard}
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-muted">{fr.verify.text}</p>
      {errorText(state.error) && <Alert>{errorText(state.error)}</Alert>}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {fr.verify.submit}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<DoneState, FormData>(
    changePasswordAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className={labelClass}>
          {fr.settings.currentPassword}
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="newPassword" className={labelClass}>
          {fr.settings.newPassword}
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          aria-describedby="new-password-help"
          className={inputClass}
        />
        <p id="new-password-help" className="mt-1 text-xs text-faint">
          {fr.auth.passwordHelp}
        </p>
      </div>
      {state.done && <Alert tone="success">{fr.settings.passwordDone}</Alert>}
      {errorText(state.error) && <Alert>{errorText(state.error)}</Alert>}
      <button
        type="submit"
        disabled={pending}
        className={buttonClass.secondary}
      >
        {fr.settings.passwordSubmit}
      </button>
    </form>
  );
}

export function ChangeEmailForm() {
  const [state, action, pending] = useActionState<DoneState, FormData>(
    changeEmailAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="newEmail" className={labelClass}>
          {fr.settings.newEmail}
        </label>
        <input
          id="newEmail"
          name="newEmail"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="email-password" className={labelClass}>
          {fr.settings.currentPassword}
        </label>
        <input
          id="email-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      {state.done && <Alert tone="success">{fr.settings.emailDone}</Alert>}
      {errorText(state.error) && <Alert>{errorText(state.error)}</Alert>}
      <button
        type="submit"
        disabled={pending}
        className={buttonClass.secondary}
      >
        {fr.settings.emailSubmit}
      </button>
    </form>
  );
}

export function DecisionForm({
  reviewId,
  verdict,
}: {
  reviewId: string;
  verdict: 'PASSED' | 'FAILED';
}) {
  const [state, action, pending] = useActionState<DoneState, FormData>(
    decideReviewAction,
    {},
  );
  if (state.done) return <Alert tone="success">{fr.admin.decided}</Alert>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="reviewId" value={reviewId} />
      <fieldset className="space-y-2">
        <legend className={labelClass}>{fr.admin.decisionTitle}</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="decision"
            value="confirm"
            required
            defaultChecked
          />
          {fr.admin.confirm}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="decision" value="overturn" />
          {fr.admin.overturn(verdict)}
        </label>
      </fieldset>
      <div>
        <label htmlFor="response" className={labelClass}>
          {fr.admin.response}
        </label>
        <textarea
          id="response"
          name="response"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          className={inputClass}
        />
      </div>
      {errorText(state.error) && <Alert>{errorText(state.error)}</Alert>}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {fr.admin.submit}
      </button>
    </form>
  );
}
