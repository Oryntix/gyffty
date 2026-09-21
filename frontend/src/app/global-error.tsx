'use client';

/**
 * Catches failures in the root layout itself, which the per-route error
 * boundary cannot reach. It must render its own <html> and carry no
 * dependency on the layout that just failed — so the styling is inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-IN">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#1A1816',
          color: '#FAF8F4',
          fontFamily: 'Georgia, serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <p
            style={{
              letterSpacing: '0.22em',
              fontSize: 11,
              textTransform: 'uppercase',
              color: '#C9A24E',
            }}
          >
            Gyffty
          </p>
          <h1 style={{ fontSize: 40, margin: '1rem 0 0', lineHeight: 1.1 }}>
            Something went wrong
          </h1>
          <p style={{ color: 'rgba(250,248,244,0.65)', fontSize: 15, lineHeight: 1.6 }}>
            The page could not be loaded. Our team has been notified.
            {error.digest ? ` Reference: ${error.digest}` : ''}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: '14px 32px',
              borderRadius: 999,
              border: 'none',
              background: '#C9A24E',
              color: '#1A1816',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
