'use client';

/**
 * EngagementSection — web parity of mobile home-tab Engagement card
 * (mobile app/(tabs)/index.tsx ~line 939, P133).
 *
 * Two data sources:
 *   - `useBusinessEngagement(startDate)` — profileViews / searchImpressions /
 *     totalActionClicks. Rolling window controlled by 7 / 14 / 30-day chips.
 *   - `useBusinessReviewStats()` — averageRating / totalReviews / responseRate.
 *     Lifetime; does NOT follow the chip (mobile parity: review stats are
 *     always shown as an all-time snapshot).
 *
 * Grid is 3 columns on desktop, 2 on tablet, 1 on mobile.
 */

import { useMemo, useState } from 'react';
import {
  Eye,
  Search,
  MousePointer,
  Star,
  MessageCircle,
  Percent,
  type LucideIcon,
} from 'lucide-react';
import {
  useBusinessEngagement,
  useBusinessReviewStats,
} from '@/lib/business-api';

type RangeDays = 7 | 14 | 30;
const RANGES: RangeDays[] = [7, 14, 30];

interface EngagementResponse {
  profileViews?: number;
  searchImpressions?: number;
  totalActionClicks?: number;
}

interface ReviewStatsResponse {
  averageRating?: number;
  totalReviews?: number;
  responseRate?: number;
}

export function EngagementSection() {
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);

  // Backend accepts `startDate` as YYYY-MM-DD. Compute in local time —
  // the mobile does the same (server aggregates by day boundary).
  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    return d.toISOString().slice(0, 10);
  }, [rangeDays]);

  const engagementQuery = useBusinessEngagement(startDate);
  const reviewQuery = useBusinessReviewStats();
  const engagement = engagementQuery.data as EngagementResponse | null | undefined;
  const reviewStats = reviewQuery.data as ReviewStatsResponse | null | undefined;

  const hasAnyData = !!(engagement || reviewStats);
  if (!hasAnyData && !engagementQuery.isLoading && !reviewQuery.isLoading) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-900">Engagement</h2>
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          {RANGES.map((days) => {
            const isActive = days === rangeDays;
            return (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-ruby-red text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {days}d
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <EngagementItem
          icon={Eye}
          label="Profile Views"
          value={engagement?.profileViews ?? 0}
          tint="blue"
        />
        <EngagementItem
          icon={Search}
          label="Search Hits"
          value={engagement?.searchImpressions ?? 0}
          tint="purple"
        />
        <EngagementItem
          icon={MousePointer}
          label="Action Clicks"
          value={engagement?.totalActionClicks ?? 0}
          tint="green"
        />
        <EngagementItem
          icon={Star}
          label="Avg Rating"
          value={
            reviewStats?.averageRating != null
              ? reviewStats.averageRating.toFixed(1)
              : '—'
          }
          tint="amber"
        />
        <EngagementItem
          icon={MessageCircle}
          label="Total Reviews"
          value={reviewStats?.totalReviews ?? 0}
          tint="pink"
        />
        <EngagementItem
          icon={Percent}
          label="Response Rate"
          value={`${Math.round(reviewStats?.responseRate ?? 0)}%`}
          tint="teal"
        />
      </div>
    </section>
  );
}

type Tint = 'blue' | 'purple' | 'green' | 'amber' | 'pink' | 'teal';

const TINT_STYLES: Record<Tint, string> = {
  blue: 'bg-blue-50 text-blue-700',
  purple: 'bg-purple-50 text-purple-700',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  pink: 'bg-pink-50 text-pink-700',
  teal: 'bg-teal-50 text-teal-700',
};

function EngagementItem({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tint: Tint;
}) {
  const displayValue =
    typeof value === 'number' ? value.toLocaleString('en-NG') : value;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TINT_STYLES[tint]}`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold text-gray-900">
          {displayValue}
        </p>
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </p>
      </div>
    </div>
  );
}
