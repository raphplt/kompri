'use client';

// Last resort when the root layout itself fails: no shared component is used.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          padding: '4rem 1rem',
          textAlign: 'center',
        }}
      >
        <h1>Une erreur est survenue</h1>
        <p>Kompri est momentanément indisponible. Réessaie dans un instant.</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: '1.5rem', padding: '0.6rem 1.2rem' }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
