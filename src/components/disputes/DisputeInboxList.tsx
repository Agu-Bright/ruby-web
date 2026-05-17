'use client';

import { useMemo } from 'react';
import { Search, Filter, Inbox } from 'lucide-react';
import type {
  Dispute,
  DisputeFilterParams,
  DisputeStatus,
  DisputeType,
} from '@/lib/types';
import { DisputeInboxItem } from './DisputeInboxItem';
import { getLastActivityAt } from './utils';

const STATUS_OPTIONS: DisputeStatus[] = [
  'OPEN',
  'UNDER_REVIEW',
  'AWAITING_RESPONSE',
  'RESOLVED',
  'ESCALATED',
  'CLOSED',
];

const TYPE_OPTIONS: DisputeType[] = [
  'ORDER',
  'BOOKING',
  'PAYMENT',
  'PAYOUT',
  'WALLET',
  'DELIVERY',
  'RIDE',
  'AD',
  'GENERAL',
];

/**
 * Left pane of the inbox: filter bar + scrollable row list.
 *
 * Filters drive the parent's `filters` state, which re-fetches via
 * `api.disputes.list`. Search is client-side over the already-loaded
 * page — adequate for the typical 20-50 row page; can promote to a
 * server query in a follow-up if disputes grow into the thousands.
 *
 * Unread state comes from a small helper that combines:
 *   (a) status === 'OPEN' (always unread until status changes)
 *   (b) latest message timestamp > localStorage lastViewed:{adminId}:{disputeId}
 * The localStorage map is owned by the parent so it persists across
 * tab-switches without prop-drilling timestamps in.
 */
export function DisputeInboxList({
  disputes,
  isLoading,
  selectedId,
  onSelect,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  isUnread,
}: {
  disputes: Dispute[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (dispute: Dispute) => void;
  filters: DisputeFilterParams;
  onFiltersChange: (next: DisputeFilterParams) => void;
  search: string;
  onSearchChange: (next: string) => void;
  /** Parent-owned predicate so unread state persists across re-renders. */
  isUnread: (d: Dispute) => boolean;
}) {
  // Client-side search across customer name (when populated), reference
  // label, and description. Cheap; runs once per filter+search change.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = disputes;
    if (q) {
      list = list.filter((d) => {
        const haystack = [
          d.disputeRef,
          d.description,
          d.referenceLabel,
          d.reason,
          typeof d.userId === 'object'
            ? `${d.userId.firstName || ''} ${d.userId.lastName || ''} ${
                d.userId.email || ''
              }`
            : '',
          typeof d.businessId === 'object' ? d.businessId.name : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    // Sort newest-activity first. Doesn't override the backend's pagination —
    // the server already sorted, we just normalise within the visible window.
    return [...list].sort(
      (a, b) =>
        new Date(getLastActivityAt(b)).getTime() -
        new Date(getLastActivityAt(a)).getTime(),
    );
  }, [disputes, search]);

  return (
    <div className="flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden h-full">
      {/* Filter bar */}
      <div className="border-b border-gray-100 p-3 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search disputes..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-200 focus:border-ruby-300"
          />
        </div>
        <div className="flex gap-2">
          <FilterSelect
            value={filters.status || ''}
            onChange={(v) =>
              onFiltersChange({
                ...filters,
                status: (v || undefined) as DisputeStatus | undefined,
                page: 1,
              })
            }
            placeholder="All statuses"
            options={STATUS_OPTIONS.map((s) => ({
              value: s,
              label: s.replace(/_/g, ' '),
            }))}
          />
          <FilterSelect
            value={filters.type || ''}
            onChange={(v) =>
              onFiltersChange({
                ...filters,
                type: (v || undefined) as DisputeType | undefined,
                page: 1,
              })
            }
            placeholder="All types"
            options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <ListEmpty hasFilters={!!(filters.status || filters.type || search)} />
        ) : (
          filtered.map((d) => (
            <DisputeInboxItem
              key={d._id}
              dispute={d}
              selected={d._id === selectedId}
              unread={isUnread(d)}
              onClick={() => onSelect(d)}
            />
          ))
        )}
      </div>

      {/* Footer count — quick orientation; pagination controls live on
          the parent so they can be hidden in single-column mobile mode. */}
      <div className="border-t border-gray-100 px-3 py-2 text-[11px] text-gray-500 bg-gray-50">
        {filtered.length} dispute{filtered.length === 1 ? '' : 's'} shown
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative flex-1">
      <Filter className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-md pl-7 pr-7 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ruby-200 focus:border-ruby-300"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="px-3 py-3 flex gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-lg bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-2.5 bg-gray-100 rounded w-1/3" />
            <div className="h-2.5 bg-gray-100 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 text-gray-500">
      <Inbox className="w-8 h-8 text-gray-300 mb-3" />
      <p className="text-sm font-medium text-gray-700">
        {hasFilters ? 'No matching disputes' : 'Inbox zero'}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {hasFilters
          ? 'Try clearing filters or search.'
          : 'New disputes will appear here as customers and businesses file them.'}
      </p>
    </div>
  );
}
