'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth';

export const ADMIN_SOCKET_NAMESPACES = [
  'orders',
  'delivery',
  'disputes',
  'notifications',
] as const;

export type AdminSocketNamespace = (typeof ADMIN_SOCKET_NAMESPACES)[number];
type SocketListener = (...args: unknown[]) => void;

interface AdminSocketsContextValue {
  isConnected: (namespace: AdminSocketNamespace) => boolean;
  subscribe: (namespace: AdminSocketNamespace, event: string, listener: SocketListener) => () => void;
  emit: (namespace: AdminSocketNamespace, event: string, payload?: unknown) => void;
}

const AdminSocketsContext = createContext<AdminSocketsContextValue | null>(null);

function getSocketBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

function getAdminAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ruby_access_token');
}

export function AdminSocketsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const socketsRef = useRef(new Map<AdminSocketNamespace, Socket>());
  const [connected, setConnected] = useState<Partial<Record<AdminSocketNamespace, boolean>>>({});
  const [socketVersion, setSocketVersion] = useState(0);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const token = getAdminAccessToken();
    if (!token) return;

    const baseUrl = getSocketBaseUrl();
    const sockets = socketsRef.current;
    const cleanup: Socket[] = [];

    ADMIN_SOCKET_NAMESPACES.forEach((namespace) => {
      const socket = io(`${baseUrl}/${namespace}`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        path: '/socket.io/',
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10_000,
      });

      sockets.set(namespace, socket);
      cleanup.push(socket);
      socket.on('connect', () => setConnected((current) => ({ ...current, [namespace]: true })));
      socket.on('disconnect', () => setConnected((current) => ({ ...current, [namespace]: false })));
      socket.on('connect_error', (error) => {
        console.warn(`[Admin socket:${namespace}] ${error.message || 'connection failed'}`);
      });
    });
    setSocketVersion((current) => current + 1);

    return () => {
      cleanup.forEach((socket) => socket.disconnect());
      sockets.clear();
      setConnected({});
      setSocketVersion((current) => current + 1);
    };
  }, [isAuthenticated, isLoading]);

  const subscribe = useCallback<AdminSocketsContextValue['subscribe']>((namespace, event, listener) => {
    const socket = socketsRef.current.get(namespace);
    if (!socket) return () => {};
    socket.on(event, listener);
    return () => socket.off(event, listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketVersion]);

  const emit = useCallback<AdminSocketsContextValue['emit']>((namespace, event, payload) => {
    socketsRef.current.get(namespace)?.emit(event, payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketVersion]);

  const value = useMemo<AdminSocketsContextValue>(() => ({
    isConnected: (namespace) => !!connected[namespace],
    subscribe,
    emit,
  }), [connected, subscribe, emit]);

  return <AdminSocketsContext.Provider value={value}>{children}</AdminSocketsContext.Provider>;
}

export function useAdminSockets() {
  const context = useContext(AdminSocketsContext);
  if (!context) throw new Error('useAdminSockets must be used inside AdminSocketsProvider');
  return context;
}
