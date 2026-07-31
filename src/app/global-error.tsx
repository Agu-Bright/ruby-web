'use client';

import { useEffect } from 'react';

/**
 * Root error boundary. Next.js calls this when a React render throws that
 * bubbles all the way up. We treat `ChunkLoadError` specially — a stale
 * deploy is not a real bug, just a client that's holding old HTML.
 *
 * Reload is guarded by sessionStorage so a genuinely broken deploy doesn't
 * put the browser in an infinite reload loop.
 */
const KEY = 'ruby_chunk_reload_attempted';

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const name = (err as any)?.name || '';
  const msg = (err as any)?.message || String(err);
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Loading CSS chunk [\d]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg)
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, '1');
    } catch {}
    window.location.reload();
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#F9FAFB',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 440,
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>💎</div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 8px',
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 20px' }}>
            {isChunkLoadError(error)
              ? 'Reloading to fetch the latest version...'
              : 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem(KEY);
              } catch {}
              reset();
            }}
            style={{
              background: '#FD362F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
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
