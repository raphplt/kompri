'use client';

import { useEffect, useRef, useState } from 'react';
import type { TutorQuota } from '@kompri/shared';
import { fr } from '../messages/fr';
import { Markdown } from './markdown';
import { Alert, buttonClass } from './ui';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const errorText = (code: string) =>
  (fr.tutor.errors as Record<string, string>)[code] ?? fr.tutor.errors.generic;

export function TutorPanel({
  skillId,
  lessonSlug,
  signedIn,
}: {
  skillId: string;
  lessonSlug?: string;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<TutorQuota | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const refreshQuota = () =>
    fetch('/api/tuteur/quota')
      .then((r) => (r.ok ? (r.json() as Promise<TutorQuota>) : null))
      .then((q) => {
        setQuota(q);
        if (q?.reason)
          setError(
            errorText(
              q.reason === 'oral_in_progress'
                ? 'tutor_during_oral'
                : 'tutor_quota_exceeded',
            ),
          );
      })
      .catch(() => undefined);

  useEffect(() => {
    if (open && signedIn) void refreshQuota();
  }, [open, signedIn]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  async function send() {
    const question = draft.trim();
    if (!question || busy) return;
    const asked: Message = { role: 'user', content: question };
    const history = [...messages, asked].slice(-20);
    setMessages([...history, { role: 'assistant', content: '' }]);
    setDraft('');
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/tuteur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, lessonSlug, messages: history }),
      });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as {
          code?: string;
        } | null;
        setError(errorText(body?.code ?? 'generic'));
        setMessages(history.slice(0, -1));
        setDraft(question);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: 'assistant', content: answer }]);
      }
    } catch {
      setError(fr.tutor.errors.generic);
    } finally {
      setBusy(false);
      void refreshQuota();
    }
  }

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-30 rounded-full bg-accent px-5 py-3 font-semibold text-white shadow-lg hover:bg-accent-strong dark:text-slate-950"
      >
        <span className="sm:hidden">{fr.tutor.title}</span>
        <span className="hidden sm:inline">{fr.tutor.open}</span>
      </button>
    );

  return (
    <section
      aria-label={fr.tutor.title}
      className="fixed right-4 bottom-4 z-30 flex max-h-[80vh] w-[min(28rem,calc(100vw-2rem))] flex-col rounded-2xl border border-line bg-raised shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-bold">{fr.tutor.title}</h2>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className={buttonClass.ghost}
            >
              {fr.tutor.reset}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={fr.tutor.close}
            className={buttonClass.ghost}
          >
            ✕
          </button>
        </div>
      </header>
      <div
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm"
        aria-live="polite"
      >
        <p className="text-muted">{fr.tutor.intro}</p>
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === 'user'
                ? 'ml-8 rounded-xl bg-accent-soft px-3 py-2'
                : 'mr-4 rounded-xl border border-line px-3 py-2'
            }
          >
            <p className="mb-1 text-xs font-bold text-accent">
              {message.role === 'user' ? fr.tutor.you : fr.tutor.tutor}
            </p>
            {message.role === 'assistant' ? (
              message.content ? (
                <Markdown source={message.content} className="prose-sm" />
              ) : (
                <p className="text-faint">{fr.tutor.thinking}</p>
              )
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="space-y-2 border-t border-line px-4 py-3">
        {!signedIn ? (
          <p className="text-sm text-muted">{fr.tutor.loginRequired}</p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="space-y-2"
          >
            {error && <Alert tone="warning">{error}</Alert>}
            <label htmlFor="tutor-question" className="sr-only">
              {fr.tutor.placeholder}
            </label>
            <textarea
              id="tutor-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder={fr.tutor.placeholder}
              className="block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-faint">
                {quota
                  ? fr.tutor.quota(quota.used, quota.limit)
                  : fr.tutor.privacy}
              </span>
              <button
                type="submit"
                disabled={busy || !draft.trim() || quota?.available === false}
                className={buttonClass.primary}
              >
                {fr.tutor.send}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
