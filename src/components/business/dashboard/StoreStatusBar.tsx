'use client';

/**
 * StoreStatusBar — the "am I open?" banner on the dashboard home.
 *
 * Mirrors mobile `src/components/dashboard/StoreStatusBar.tsx`: shows
 * OPEN / OFFLINE state + a toggle. Web variant defers stock picking
 * to the Products page (M4); tapping "Open store" here opens the day
 * without editing today's inventory. Merchants who want granular
 * inventory control tap "Manage today's stock" (→ `/dashboard/daily-operations/open-day`
 * — ships M4 alongside Products).
 */

import { toast } from 'sonner';
import { CircleCheck, CircleOff, RefreshCw } from 'lucide-react';
import {
  useTodayStatus,
  useOpenDay,
  useGoOffline,
} from '@/lib/business-api';

export function StoreStatusBar() {
  const { data, isLoading, refetch } = useTodayStatus();
  const openDay = useOpenDay(() => {
    toast.success('Store opened for today.');
    refetch();
  });
  const goOffline = useGoOffline(() => {
    toast.success('Store is now offline.');
    refetch();
  });

  // The daily-operations endpoint returns the same `DailyOperation`
  // document used by mobile: `isOnline`, `onlineAt`, and `closingTime`.
  // Do not infer this from business profile hours or a separate field.
  const isOpen = data?.isOnline === true;
  const busy = openDay.isLoading || goOffline.isLoading;

  const handleToggle = () => {
    if (busy) return;
    if (isOpen) {
      goOffline.mutate();
    } else {
      // Web flow — open the store without pre-selecting products.
      // The mobile app opens the inventory picker here; web routes
      // merchants to the products page instead once M4 ships.
      openDay.mutate({ closingTime: data?.closingTime ?? '18:00' });
    }
  };

  if (isLoading && !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="skeleton h-6 w-1/3 mb-2 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
      </div>
    );
  }

  return (
    <div
      className={`border rounded-xl p-4 mb-6 flex items-center justify-between gap-4 ${
        isOpen
          ? 'bg-green-50 border-green-200'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isOpen ? 'bg-green-100' : 'bg-gray-200'
          }`}
        >
          {isOpen ? (
            <CircleCheck size={20} className="text-green-700" />
          ) : (
            <CircleOff size={20} className="text-gray-500" />
          )}
        </div>
        <div className="min-w-0">
          <p
            className={`text-sm font-semibold ${
              isOpen ? 'text-green-900' : 'text-gray-900'
            }`}
          >
            {isOpen ? 'Store is open for today' : 'Store is offline'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {isOpen
              ? data?.onlineAt
                ? `Opened at ${new Date(data.onlineAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Accepting orders now'
              : 'Tap “Open store” to start accepting orders'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 rounded-lg hover:bg-white/50 text-gray-500 transition"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
        <button
          type="button"
          onClick={handleToggle}
          disabled={busy}
          className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${
            isOpen
              ? 'bg-gray-700 hover:bg-gray-800'
              : 'bg-green-600 hover:bg-green-700'
          } disabled:opacity-60`}
        >
          {busy ? 'Working…' : isOpen ? 'Go offline' : 'Open store'}
        </button>
      </div>
    </div>
  );
}
