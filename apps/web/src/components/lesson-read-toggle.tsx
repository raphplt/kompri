'use client';

import { useState, useTransition } from 'react';
import { setLessonReadAction } from '../app/actions';
import { fr } from '../messages/fr';
import { buttonClass } from './ui';

export function LessonReadToggle({
  skillId,
  slug,
  initiallyRead,
}: {
  skillId: string;
  slug: string;
  initiallyRead: boolean;
}) {
  const [read, setRead] = useState(initiallyRead);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={read}
      disabled={pending}
      onClick={() =>
        start(async () =>
          setRead(await setLessonReadAction(skillId, slug, !read)),
        )
      }
      className={
        read
          ? `${buttonClass.secondary} border-success text-success`
          : buttonClass.secondary
      }
      title={read ? fr.lesson.markUnread : undefined}
    >
      {read ? `✓ ${fr.lesson.read}` : fr.lesson.markRead}
    </button>
  );
}
