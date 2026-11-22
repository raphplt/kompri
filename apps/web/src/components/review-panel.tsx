'use client';

import { useState, useTransition } from 'react';
import type { OralView } from '@kompri/shared';
import { requestReviewAction } from '../app/actions';
import { formatDate } from '../lib/format';
import { fr } from '../messages/fr';
import { Alert, buttonClass, inputClass, labelClass } from './ui';

export function ReviewPanel({
  oral,
  onChange,
}: {
  oral: OralView;
  onChange: (oral: OralView) => void;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (oral.review)
    return (
      <section
        aria-labelledby="reexamen"
        className="rounded-2xl border border-line bg-raised p-5"
      >
        <h2 id="reexamen" className="mb-2 font-bold">
          {fr.review.statusTitle}
        </h2>
        <p className="text-sm">{fr.review[oral.review.status]}</p>
        <p className="mt-3 text-xs font-semibold text-faint">
          {fr.review.yourMessage}
        </p>
        <p className="text-sm whitespace-pre-line text-muted">
          {oral.review.message}
        </p>
        {oral.review.response && (
          <>
            <p className="mt-3 text-xs font-semibold text-faint">
              {fr.review.response}
            </p>
            <p className="text-sm whitespace-pre-line">
              {oral.review.response}
            </p>
          </>
        )}
      </section>
    );
  if (!oral.reviewDeadline) return null;
  return (
    <details className="rounded-2xl border border-line bg-raised p-5">
      <summary className="cursor-pointer font-bold">{fr.review.title}</summary>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => {
            const result = await requestReviewAction(oral.id, message);
            if (result.ok) onChange(result.oral);
            else
              setError(
                (fr.errors as Record<string, string>)[result.error] ??
                  fr.errors.generic,
              );
          });
        }}
      >
        <p className="text-sm text-muted">{fr.review.text}</p>
        <p className="text-xs text-faint">
          {fr.review.deadline(formatDate(oral.reviewDeadline))}
        </p>
        <label htmlFor="review-message" className={labelClass}>
          {fr.review.label}
        </label>
        <textarea
          id="review-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          minLength={20}
          maxLength={2000}
          rows={4}
          required
          className={inputClass}
        />
        {error && <Alert>{error}</Alert>}
        <button
          type="submit"
          disabled={pending || message.trim().length < 20}
          className={buttonClass.secondary}
        >
          {fr.review.submit}
        </button>
      </form>
    </details>
  );
}
