'use client';

import { useCallback, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useBusinessQuery } from '@/lib/business-api/hooks';
import { useMutation } from '@/lib/hooks';

function formatNotificationDateTime(value?: string): string | null {
  if (!value || Number.isNaN(new Date(value).getTime())) return null;
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const fetchNotifications = useCallback(() => api.businessNotifications.list({ limit: 50 }), []);
  const notes = useBusinessQuery<any>(fetchNotifications, []);
  const [browserReady, setBrowserReady] = useState(false);
  const read = useMutation<any, string>((id) => api.businessNotifications.markRead([id]), {
    onSuccess: () => void notes.refetch(),
  });
  const all = useMutation<any, void>(() => api.businessNotifications.markAllRead(), {
    onSuccess: () => void notes.refetch(),
  });

  const enableBrowser = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toast.error('This browser does not support app notifications');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('Notification permission was not granted');
      return;
    }
    await navigator.serviceWorker.register('/business-sw.js');
    setBrowserReady(true);
    toast.success('Browser notifications are enabled on this device');
  };

  const list = Array.isArray(notes.data) ? notes.data : (notes.data?.items ?? []);

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-ruby-red">Updates</p>
          <h1 className="mt-1 text-2xl font-bold">Notifications</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => void enableBrowser()} className="text-sm font-semibold text-gray-700">
            {browserReady ? 'Browser enabled' : 'Enable browser alerts'}
          </button>
          <button onClick={() => void all.mutate()} className="text-sm font-semibold text-ruby-red">
            Mark all read
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-500">Keep up with orders, bookings, customer messages, and account activity.</p>

      <div className="mt-6 space-y-3">
        {notes.isLoading ? <p className="text-sm text-gray-500">Loading notifications…</p> : null}
        {!notes.isLoading && !list.length ? <div className="rounded-xl border bg-white p-5 text-sm text-gray-500">You are all caught up.</div> : null}
        {list.map((notification: any) => {
          const occurredAt = formatNotificationDateTime(notification.createdAt ?? notification.timestamp);
          return (
            <button
              key={notification._id}
              onClick={() => !notification.isRead && void read.mutate(notification._id)}
              className={`w-full rounded-xl border p-4 text-left ${notification.isRead ? 'bg-white' : 'bg-ruby-red/5'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <b>{notification.title ?? notification.type}</b>
                {occurredAt ? (
                  <time className="inline-flex items-center gap-1 text-xs font-medium text-gray-500" dateTime={notification.createdAt ?? notification.timestamp}>
                    <Clock3 className="h-3.5 w-3.5" />
                    {occurredAt}
                  </time>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-gray-600">{notification.body ?? notification.message}</p>
            </button>
          );
        })}
      </div>
    </main>
  );
}
