'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import type { Dispute, DisputeFilterParams } from '@/lib/types';
import { toLocationId } from '@/lib/utils';
import {
  DisputeInboxList,
  DisputeChatThread,
  DisputeEmptyState,
  RecipientList,
} from '@/components/disputes';
import { getLastActivityAt } from '@/components/disputes/utils';

type TabKey = 'inbox' | 'recipients';

/**
 * Phase 14 — Admin disputes redesign.
 *
 * Two top-level tabs:
 *   - Inbox: two-pane layout (list left, chat right). The chat is the
 *     primary surface — no more "click row → modal → read messages".
 *   - Recipients: admin-managed email list for dispute event alerts.
 *
 * Below 1024px the inbox stacks: row tap shows the chat full-screen with
 * a back arrow in its header (mobile-email pattern). Above 1024px both
 * panes stay visible side-by-side.
 *
 * Unread state is localStorage-backed per admin per dispute. OPEN
 * disputes always count as unread regardless of viewed-state — keeps
 * fresh tickets visible until an admin actually triages them.
 */
export default function DisputesPage() {
  const { admin } = useAuth();
  const adminId = admin?._id || 'anon';

  const [activeTab, setActiveTab] = useState<TabKey>('inbox');

  const [filters, setFilters] = useState<DisputeFilterParams>({
    page: 1,
    limit: 50, // larger window — the inbox list scrolls, not paginates
    ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1
      ? { locationId: toLocationId(admin.locationIds[0]) }
      : {}),
  });
  const [search, setSearch] = useState('');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);

  // Inbox list source. Refetch happens automatically on filter change.
  const { data: disputes, isLoading, refetch } = useApi<Dispute[]>(
    () => api.disputes.list(filters),
    [filters],
  );

  /**
   * Per-admin per-dispute lastViewedAt map, kept in localStorage so it
   * survives tab-switches and page reloads without a backend round-trip.
   * Key shape: `disputeLastViewed:{adminId}` → JSON object of disputeId → ISO.
   */
  const lastViewedKey = `disputeLastViewed:${adminId}`;
  const [lastViewedMap, setLastViewedMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(lastViewedKey);
      if (raw) setLastViewedMap(JSON.parse(raw));
    } catch {
      /* ignore corrupt entry — start fresh */
    }
  }, [lastViewedKey]);

  const markViewed = useCallback(
    (disputeId: string) => {
      const nowIso = new Date().toISOString();
      setLastViewedMap((prev) => {
        const next = { ...prev, [disputeId]: nowIso };
        try {
          localStorage.setItem(lastViewedKey, JSON.stringify(next));
        } catch {
          /* quota or private-mode — best-effort */
        }
        return next;
      });
    },
    [lastViewedKey],
  );

  const isUnread = useCallback(
    (d: Dispute) => {
      // OPEN tickets are always "unread" until status moves — keeps the
      // tray visually loud for genuinely new work.
      if (d.status === 'OPEN') return true;
      const lastActivity = getLastActivityAt(d);
      const lastViewed = lastViewedMap[d._id];
      if (!lastViewed) return true;
      return new Date(lastActivity).getTime() > new Date(lastViewed).getTime();
    },
    [lastViewedMap],
  );

  // When the inbox refreshes (e.g., after a status change in the chat),
  // also keep the local map in sync with current disputes (no need to
  // store entries for deleted disputes).
  useEffect(() => {
    if (!disputes) return;
    setLastViewedMap((prev) => {
      const ids = new Set(disputes.map((d) => d._id));
      const next: Record<string, string> = {};
      for (const id of Object.keys(prev)) {
        if (ids.has(id)) next[id] = prev[id];
      }
      // Only persist if we actually pruned something — avoids a write
      // every render.
      if (Object.keys(next).length !== Object.keys(prev).length) {
        try {
          localStorage.setItem(lastViewedKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      return Object.keys(next).length !== Object.keys(prev).length ? next : prev;
    });
  }, [disputes, lastViewedKey]);

  const selectedDispute = useMemo(
    () => disputes?.find((d) => d._id === selectedDisputeId) || null,
    [disputes, selectedDisputeId],
  );

  const handleSelect = useCallback(
    (d: Dispute) => {
      setSelectedDisputeId(d._id);
      // markViewed is called by the chat thread once it loads — but we
      // also clear the dot immediately on click so the click-to-clear UX
      // feels snappy even before the GET resolves.
      markViewed(d._id);
    },
    [markViewed],
  );

  const handleUpdatedFromThread = useCallback(
    (_d: Dispute) => {
      // Status change in the chat → refresh the inbox so the list row's
      // status badge updates immediately.
      refetch();
    },
    [refetch],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Support & Disputes"
        description="Reply to customer and business support tickets in real time."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <TabButton
          active={activeTab === 'inbox'}
          onClick={() => setActiveTab('inbox')}
          icon={Inbox}
          label="Inbox"
          count={disputes?.length}
        />
        <TabButton
          active={activeTab === 'recipients'}
          onClick={() => setActiveTab('recipients')}
          icon={Mail}
          label="Recipients"
        />
      </div>

      {activeTab === 'inbox' ? (
        <div
          className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4"
          style={{ height: 'calc(100vh - 240px)', minHeight: 520 }}
        >
          {/* List pane — always rendered. On mobile, hidden when a dispute
              is selected so the chat fills the viewport. */}
          <div
            className={`${selectedDisputeId ? 'hidden lg:block' : 'block'}`}
          >
            <DisputeInboxList
              disputes={disputes || []}
              isLoading={isLoading}
              selectedId={selectedDisputeId}
              onSelect={handleSelect}
              filters={filters}
              onFiltersChange={setFilters}
              search={search}
              onSearchChange={setSearch}
              isUnread={isUnread}
            />
          </div>

          {/* Chat pane — empty state when nothing selected. On mobile this
              fills the viewport when a dispute is selected. */}
          <div
            className={`${selectedDisputeId ? 'block' : 'hidden lg:block'}`}
          >
            {selectedDispute ? (
              <DisputeChatThread
                key={selectedDispute._id}
                disputeId={selectedDispute._id}
                onBack={() => setSelectedDisputeId(null)}
                onUpdated={handleUpdatedFromThread}
                onViewed={markViewed}
              />
            ) : (
              <DisputeEmptyState totalDisputes={disputes?.length} />
            )}
          </div>
        </div>
      ) : (
        <RecipientList />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'text-ruby-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {typeof count === 'number' && count > 0 && (
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            active
              ? 'bg-ruby-100 text-ruby-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {count}
        </span>
      )}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ruby-500" />
      )}
    </button>
  );
}
