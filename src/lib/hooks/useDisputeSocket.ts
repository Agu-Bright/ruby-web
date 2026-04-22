'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Dispute, DisputeMessage } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

interface Callbacks {
  onMessage?: (msg: DisputeMessage) => void;
  onStatus?: (status: string, note?: string) => void;
}

/**
 * Connects to the /disputes Socket.IO namespace with the admin JWT and joins
 * the room for a specific dispute so the admin page sees replies and status
 * changes in real-time.
 *
 * Usage:
 *   useDisputeSocket(detailDispute?._id, {
 *     onMessage: (m) => setDispute((d) => d ? { ...d, messages: [...(d.messages || []), m] } : d),
 *     onStatus: (status) => setDispute((d) => d ? { ...d, status } : d),
 *   });
 */
export function useDisputeSocket(disputeId: string | undefined, callbacks: Callbacks) {
  const socketRef = useRef<Socket | null>(null);
  // Stable ref so changing callbacks don't thrash the connection
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!disputeId) return;
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('ruby_access_token');
    if (!token) return;

    const socket = io(`${SOCKET_URL}/disputes`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = socket;

    const join = () => socket.emit('join', { disputeId });
    socket.on('connect', join);

    socket.on('dispute:message', (payload: { disputeId: string; message: DisputeMessage }) => {
      if (payload?.disputeId !== disputeId) return;
      callbacksRef.current.onMessage?.(payload.message);
    });

    socket.on('dispute:status', (payload: { disputeId: string; status: string; note?: string }) => {
      if (payload?.disputeId !== disputeId) return;
      callbacksRef.current.onStatus?.(payload.status, payload.note);
    });

    socket.on('error', (err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn('[DisputeSocket]', err);
    });

    return () => {
      socket.emit('leave', { disputeId });
      socket.off('connect', join);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [disputeId]);
}

export type { Dispute };
