'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const SOCKET_BASE = API_BASE.replace(/\/api\/?$/, '');

/**
 * Subscribes the admin web to the `/home-sections` Socket.IO namespace
 * so concurrent admin tabs see each other's edits live (and the page
 * doesn't go stale while another admin reorders).
 *
 * Auth: reads the JWT from localStorage just like every other admin
 * socket in this codebase. We deliberately avoid using a global
 * socket service in the web project — single-purpose hooks are
 * simpler when there's only one tab type that needs the feed and
 * connection lifetime ties cleanly to the page mount.
 *
 * @param onChange  Fired with the broadcast payload whenever the
 *                  backend emits `home-section:changed`. Callers
 *                  typically `refetch()` the admin list here.
 */
export function useHomeSectionsAdminSocket(
  onChange: (payload: { locationIds: string[] | 'all' | Array<string | null> }) => void,
): void {
  // Keep the latest callback in a ref so we don't tear down the
  // socket every render. Pattern lifted from useDisputeSocket.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('ruby_access_token')
        : null;
    if (!token) return;

    const socket: Socket = io(`${SOCKET_BASE}/home-sections`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('home-section:changed', (payload) => {
      onChangeRef.current(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, []);
}
