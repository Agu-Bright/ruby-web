'use client';

import { useEffect } from 'react';

/**
 * Catches `ChunkLoadError` from webpack during navigation/dynamic imports
 * and hard-reloads the page once so the browser picks up the fresh chunk
 * hashes from the current HTML.
 *
 * Guarded by sessionStorage so we never reload more than once per session,
 * avoiding an infinite loop if the deploy is genuinely broken.
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

function reloadOnce() {
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, '1');
  } catch {
    // Private mode / storage disabled — reload anyway; worst case is one loop.
  }
  window.location.reload();
}

export default function ChunkReloadGuard() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
        reloadOnce();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        reloadOnce();
      }
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
