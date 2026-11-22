import { fr } from '../messages/fr';

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex justify-center py-24">
      <span className="flex items-center gap-3 text-muted">
        <span
          aria-hidden="true"
          className="size-5 animate-spin rounded-full border-2 border-line border-t-accent"
        />
        {fr.loading}
      </span>
    </div>
  );
}
