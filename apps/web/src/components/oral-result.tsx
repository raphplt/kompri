import type { OralResult } from '@kompri/shared';
import { formatDate } from '../lib/format';
import { fr } from '../messages/fr';

export function OralResultView({ result }: { result: OralResult }) {
  const passed = result.verdict === 'PASSED';
  return (
    <section
      aria-labelledby="resultat"
      className={`rounded-2xl border-2 p-6 ${
        passed
          ? 'border-success/50 bg-success-soft'
          : 'border-warning/50 bg-warning-soft'
      }`}
    >
      <p className="text-sm font-semibold text-muted">{fr.oral.resultTitle}</p>
      <h2
        id="resultat"
        className={`mt-1 text-2xl font-extrabold ${passed ? 'text-success' : 'text-warning'}`}
      >
        {passed ? fr.oral.passed : fr.oral.failed}
      </h2>
      <p className="mt-1 text-ink">
        <strong>{fr.oral.score(result.score, result.maxScore)}</strong>{' '}
        <span className="text-sm text-muted">
          ({fr.oral.threshold(Math.round(result.passRatio * 100))})
        </span>
      </p>
      {result.validationExpiresAt && (
        <p className="mt-1 text-sm text-muted">
          {fr.oral.validUntil(formatDate(result.validationExpiresAt))}
        </p>
      )}
      {result.feedback && (
        <div className="mt-5 rounded-xl bg-raised p-4">
          <h3 className="mb-1 font-bold">{fr.oral.feedback}</h3>
          <p className="text-sm whitespace-pre-line text-ink">
            {result.feedback}
          </p>
        </div>
      )}
      <h3 className="mt-6 mb-3 font-bold">{fr.oral.criteria}</h3>
      <ul className="space-y-3">
        {result.criteria.map((criterion) => (
          <li key={criterion.criterionId} className="rounded-xl bg-raised p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{criterion.description}</p>
              <p className="shrink-0 font-bold text-accent">
                {criterion.score} / {criterion.maxScore}
              </p>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-line"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={criterion.maxScore}
              aria-valuenow={criterion.score}
              aria-label={criterion.description}
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${(criterion.score / criterion.maxScore) * 100}%`,
                }}
              />
            </div>
            <p className="mt-2 text-sm text-muted">{criterion.justification}</p>
          </li>
        ))}
      </ul>
      {!passed && <p className="mt-5 text-sm text-ink">{fr.oral.tryAgain}</p>}
    </section>
  );
}
