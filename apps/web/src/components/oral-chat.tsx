'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { OralView } from '@kompri/shared';
import {
  abandonOralAction,
  answerOralAction,
  retryGradingAction,
} from '../app/actions';
import type { OralActionResult } from '../app/actions';
import { fr } from '../messages/fr';
import { OralResultView } from './oral-result';
import { ReviewPanel } from './review-panel';
import { Alert, buttonClass, labelClass } from './ui';

const errorText = (code: string) =>
  (fr.errors as Record<string, string>)[code] ?? fr.oral.error;

function format(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export function OralChat({ initial }: { initial: OralView }) {
  const [oral, setOral] = useState(initial);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Offset between the server clock and this browser, measured at each response.
  const [offset, setOffset] = useState(
    () => Date.parse(initial.serverTime) - Date.now(),
  );
  const [remaining, setRemaining] = useState<number | null>(null);
  const submitted = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const active = oral.status === 'active';

  const apply = useCallback((result: OralActionResult) => {
    if (result.ok) {
      setOral(result.oral);
      setOffset(Date.parse(result.oral.serverTime) - Date.now());
      setText('');
      setError(null);
    } else setError(errorText(result.error));
    submitted.current = false;
  }, []);

  // Integrity indicators of the current answer, reset for each question.
  const signals = useRef({
    pasteAttempts: 0,
    focusLosses: 0,
    shownAt: Date.now(),
    firstInputAt: 0,
    lastInputAt: 0,
  });
  useEffect(() => {
    signals.current = {
      pasteAttempts: 0,
      focusLosses: 0,
      shownAt: Date.now(),
      firstInputAt: 0,
      lastInputAt: 0,
    };
  }, [oral.turns.length]);
  useEffect(() => {
    if (oral.status !== 'active') return;
    const lost = () => {
      signals.current.focusLosses += 1;
    };
    const hidden = () => {
      if (document.visibilityState === 'hidden') lost();
    };
    window.addEventListener('blur', lost);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('blur', lost);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [oral.status]);

  const send = useCallback(
    (answer: string) => {
      if (submitted.current) return;
      submitted.current = true;
      const s = signals.current;
      const measured = {
        pasteAttempts: s.pasteAttempts,
        focusLosses: s.focusLosses,
        firstInputMs: s.firstInputAt
          ? Math.round(s.firstInputAt - s.shownAt)
          : null,
        typingMs: s.firstInputAt
          ? Math.round(s.lastInputAt - s.firstInputAt)
          : 0,
      };
      startTransition(async () =>
        apply(await answerOralAction(oral.id, answer, measured)),
      );
    },
    [apply, oral.id],
  );

  // Keeps the latest draft available to the timer without restarting it.
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!active || !oral.deadline) {
      setRemaining(null);
      return;
    }
    const deadline = Date.parse(oral.deadline);
    const tick = () => {
      const left = (deadline - (Date.now() + offset)) / 1000;
      setRemaining(left);
      if (left <= 0 && !submitted.current) {
        setNotice(fr.oral.timeUp);
        send(textRef.current);
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [active, oral.deadline, offset, send]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [oral.turns.length]);

  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);

  const questionIndex = Math.min(oral.answeredCount + 1, oral.questionCount);
  const urgent = remaining !== null && remaining <= 30;

  return (
    <div className="space-y-8">
      <ol className="space-y-4" aria-label={fr.oral.transcript}>
        {oral.turns.map((turn, index) => (
          <li
            key={index}
            className={`flex ${turn.speaker === 'learner' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                turn.speaker === 'learner'
                  ? 'rounded-br-sm bg-accent text-white dark:text-slate-950'
                  : 'rounded-bl-sm border border-line bg-raised'
              }`}
            >
              <p
                className={`mb-1 text-xs font-bold ${turn.speaker === 'learner' ? 'opacity-80' : 'text-accent'}`}
              >
                {turn.speaker === 'learner' ? fr.oral.you : fr.oral.examiner}
              </p>
              <p className="whitespace-pre-wrap">{turn.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div ref={end} />

      {active && (
        <section
          aria-label={fr.oral.answerSection}
          className="sticky bottom-4 rounded-2xl border border-line bg-raised p-4 shadow-lg"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-muted" aria-live="polite">
              {fr.oral.question(questionIndex, oral.questionCount)}
            </p>
            <p
              className={`rounded-full px-3 py-1 font-mono text-lg font-bold tabular-nums ${
                urgent
                  ? 'bg-danger-soft text-danger'
                  : 'bg-accent-soft text-accent'
              }`}
              aria-label={`${fr.oral.timeLeft} : ${format(remaining ?? 0)}`}
              role="timer"
            >
              {format(remaining ?? 0)}
            </p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setNotice(null);
              send(text);
            }}
            className="space-y-3"
          >
            <label htmlFor="answer" className={labelClass}>
              {fr.oral.answerLabel}
            </label>
            <textarea
              id="answer"
              value={text}
              onChange={(event) => {
                const at = Date.now();
                if (!signals.current.firstInputAt)
                  signals.current.firstInputAt = at;
                signals.current.lastInputAt = at;
                setText(event.target.value);
              }}
              onPaste={(event) => {
                event.preventDefault();
                signals.current.pasteAttempts += 1;
                setNotice(fr.oral.pasteBlocked);
              }}
              onDrop={(event) => event.preventDefault()}
              rows={6}
              maxLength={20_000}
              disabled={pending}
              autoFocus
              spellCheck
              aria-describedby="answer-help"
              className="block w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-accent"
            />
            <p id="answer-help" className="text-xs text-faint">
              {fr.oral.answerHelp}
            </p>
            {notice && <Alert tone="warning">{notice}</Alert>}
            {error && <Alert>{error}</Alert>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                disabled={pending || !text.trim()}
                className={buttonClass.primary}
              >
                {pending ? fr.oral.sending : fr.oral.send}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(fr.oral.abandonConfirm)) return;
                  startTransition(async () =>
                    apply(await abandonOralAction(oral.id)),
                  );
                }}
                className={buttonClass.ghost}
              >
                {fr.oral.abandon}
              </button>
            </div>
          </form>
        </section>
      )}

      {oral.status === 'grading_failed' && (
        <div className="space-y-3">
          <Alert tone="warning">{fr.oral.gradingFailed}</Alert>
          {error && <Alert>{error}</Alert>}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () =>
                apply(await retryGradingAction(oral.id)),
              )
            }
            className={buttonClass.primary}
          >
            {pending ? fr.oral.sending : fr.oral.retryGrading}
          </button>
        </div>
      )}

      {oral.result && <OralResultView result={oral.result} />}
      {oral.status === 'completed' && (
        <ReviewPanel oral={oral} onChange={setOral} />
      )}

      {!active && (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/defis/${oral.challengeId}`}
            className={buttonClass.secondary}
          >
            {fr.oral.backToChallenge}
          </Link>
          <Link
            href={`/competences/${oral.skillId}`}
            className={buttonClass.secondary}
          >
            {fr.oral.backToSkill}
          </Link>
        </div>
      )}
    </div>
  );
}
