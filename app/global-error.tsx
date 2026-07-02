'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ background: '#080808', color: '#fff', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '24px' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C1121F', marginBottom: 12 }}>
          Something went wrong
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 10 }}>
          This page could not load right now
        </h1>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>
          We are experiencing a temporary service issue. Please try again shortly.
        </p>
        <button
          onClick={reset}
          style={{ background: 'transparent', border: '1px solid #333', color: '#666', padding: '9px 20px', fontSize: 11, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
