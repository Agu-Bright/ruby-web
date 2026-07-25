'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getBusinessAccessToken, useBusinessAuth } from '@/lib/business-auth';

export const BUSINESS_SOCKET_NAMESPACES = [
  'chat',
  'notifications',
  'bookings',
  'orders',
  'businesses',
  'delivery',
  'disputes',
] as const;

export type BusinessSocketNamespace = (typeof BUSINESS_SOCKET_NAMESPACES)[number];
type SocketListener = (...args: unknown[]) => void;

interface BusinessSocketsContextValue {
  isConnected: (namespace: BusinessSocketNamespace) => boolean;
  subscribe: (namespace: BusinessSocketNamespace, event: string, listener: SocketListener) => () => void;
  emit: (namespace: BusinessSocketNamespace, event: string, payload?: unknown) => void;
}

const BusinessSocketsContext = createContext<BusinessSocketsContextValue | null>(null);

function getSocketBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

export function BusinessSocketsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useBusinessAuth();
  const socketsRef = useRef(new Map<BusinessSocketNamespace, Socket>());
  const [connected, setConnected] = useState<Partial<Record<BusinessSocketNamespace, boolean>>>({});
  const [socketVersion, setSocketVersion] = useState(0);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const token = getBusinessAccessToken();
    if (!token) return;

    const baseUrl = getSocketBaseUrl();
    const sockets = socketsRef.current;
    const cleanup: Socket[] = [];

    BUSINESS_SOCKET_NAMESPACES.forEach((namespace) => {
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
        console.warn(`[Business socket:${namespace}] ${error.message || 'connection failed'}`);
      });
    });
    // Child effects may run before the sockets are registered. Updating this
    // version refreshes subscribe/emit so consumers attach once they exist.
    setSocketVersion((current) => current + 1);

    return () => {
      cleanup.forEach((socket) => socket.disconnect());
      sockets.clear();
      setConnected({});
      setSocketVersion((current) => current + 1);
    };
  }, [isAuthenticated, isLoading]);

  const subscribe = useCallback<BusinessSocketsContextValue['subscribe']>((namespace, event, listener) => {
    const socket = socketsRef.current.get(namespace);
    if (!socket) return () => {};
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socketVersion]);

  const emit = useCallback<BusinessSocketsContextValue['emit']>((namespace, event, payload) => {
    socketsRef.current.get(namespace)?.emit(event, payload);
  }, [socketVersion]);

  const value = useMemo<BusinessSocketsContextValue>(() => ({
    isConnected: (namespace) => !!connected[namespace],
    subscribe,
    emit,
  }), [connected, subscribe, emit]);

  return <BusinessSocketsContext.Provider value={value}>{children}</BusinessSocketsContext.Provider>;
}

export function useBusinessSockets() {
  const context = useContext(BusinessSocketsContext);
  if (!context) throw new Error('useBusinessSockets must be used inside BusinessSocketsProvider');
  return context;
}
