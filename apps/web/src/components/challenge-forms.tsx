'use client';

import { useActionState, useState } from 'react';
import { startOralAction, submitAttemptAction } from '../app/actions';
import type { FormState } from '../app/actions';
import { fr } from '../messages/fr';
import { Alert, buttonClass, inputClass, labelClass } from './ui';

const errorText = (code?: string) =>
  code
    ? ((fr.errors as Record<string, string>)[code] ?? fr.errors.generic)
    : null;

export function SubmitWorkForm({ challengeId }: { challengeId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitAttemptAction,
    {},
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="challengeId" value={challengeId} />
      <label htmlFor="work" className={labelClass}>
        {fr.challenge.workLabel}
      </label>
      <textarea
        id="work"
        name="work"
        required
        maxLength={100_000}
        rows={14}
        defaultValue={state.values?.work}
        className={`${inputClass} font-mono text-sm`}
        spellCheck={false}
      />
      {errorText(state.error) && <Alert>{errorText(state.error)}</Alert>}
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {fr.challenge.submit}
      </button>
    </form>
  );
}

export function StartOralForm({
  attemptId,
  questions,
  minutes,
  placement = false,
}: {
  attemptId: string;
  questions: number;
  minutes: number;
  placement?: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    startOralAction,
    {},
  );
  const [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={buttonClass.primary}
      >
        {placement ? fr.challenge.startPlacement : fr.challenge.startOral}
      </button>
    );
  return (
    <form
      action={action}
      className="space-y-3 rounded-lg border border-warning/40 bg-warning-soft p-4"
    >
      <input type="hidden" name="attemptId" value={attemptId} />
      {placement && <input type="hidden" name="placement" value="true" />}
      {placement && (
        <>
          <p className="font-semibold text-warning">
            {fr.challenge.placementTitle}
          </p>
          <p className="text-sm text-ink">{fr.challenge.placementText}</p>
        </>
      )}
      <p className="font-semibold text-warning">
        {fr.challenge.oralWarningTitle}
      </p>
      <p className="text-sm text-ink">
        {fr.challenge.oralWarning(questions, minutes)}
      </p>
      {errorText(state.error) && <Alert>{errorText(state.error)}</Alert>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className={buttonClass.primary}
        >
          {pending ? fr.oral.sending : fr.challenge.startOral}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className={buttonClass.secondary}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
