'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Gem,
  Gift,
  Package,
  Settings,
  Plus,
  Trash2,
  RefreshCw,
  Edit3,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  CreditCard,
  Wallet,
  Search,
  Play,
  Pause,
  Loader2,
} from 'lucide-react';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, Modal, DataTable, StatusBadge } from '@/components/ui';
import type { Column } from '@/components/ui';
import type {
  RubyQuestSpawn,
  RubyRewardConfig,
  RubyRarity,
  RubySpawnStatus,
  RubyRewardType,
  AdminPrizeQueueEntry,
  PrizeQueueStatus,
  RubyQuestConfig,
  RubyQuestAdminSubscription,
  RubyQuestSubscriptionStatus,
  CreateRubyQuestSpawnRequest,
  CreateRubyRewardConfigRequest,
} from '@/lib/types';
import { toast } from 'sonner';

/**
 * P152-E — Ruby Quest admin.
 *
 * Single tabbed page instead of 4 separate routes. Tabs:
 *   - Spawns: paginated list of every RubyQuestSpawn + create editorial + revoke.
 *   - Rewards: reward-pool CRUD (weighted config that RubyQuestService picks from).
 *   - Prizes: AdminPrizeQueue with PENDING → CONTACTED → FULFILLED → REDEEMED transitions.
 *   - Config: RubyQuestConfig singleton — every tunable in one form.
 *
 * All mutations invalidate their tab's list via refetch. Backend audit
 * logs every state change already; frontend just needs the UX.
 */

type Tab = 'spawns' | 'rewards' | 'prizes' | 'subscriptions' | 'config';

const RARITIES: RubyRarity[] = ['COMMON', 'RARE', 'LEGENDARY'];

const RARITY_COLORS: Record<RubyRarity, string> = {
  COMMON: 'bg-slate-100 text-slate-700 border-slate-200',
  RARE: 'bg-blue-100 text-blue-700 border-blue-200',
  LEGENDARY: 'bg-purple-100 text-purple-700 border-purple-200',
};

// StatusBadge takes a `status` string and derives its color via getStatusColor.
// LIVE/EXPIRED/etc render out of the box; the badge maps them to platform-wide
// colours so we stay consistent with orders/bookings badges.
const SPAWN_STATUS_LABEL: Record<RubySpawnStatus, string> = {
  LIVE: 'LIVE',
  CLAIMED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'CANCELLED',
  SUPERSEDED: 'CANCELLED',
};

const PRIZE_STATUS_COLORS: Record<PrizeQueueStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONTACTED: 'bg-blue-50 text-blue-700 border-blue-200',
  FULFILLED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REDEEMED: 'bg-gray-50 text-gray-700 border-gray-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

const REWARD_TYPES: RubyRewardType[] = [
  'POINTS',
  'WALLET_CREDIT',
  'PERCENT_OFF',
  'FREE_DELIVERY',
  'SCRATCH_CARD',
  'MANUAL_PRIZE',
];

const REWARD_TYPE_OPTIONS: Record<RubyRewardType, { label: string; help: string; valueLabel: string; valueHelp: string; fulfilsAutomatically: boolean }> = {
  POINTS: { label: 'Ruby points', help: 'Credits Ruby points to the customer after a successful claim.', valueLabel: 'Points', valueHelp: 'Number of Ruby points to award.', fulfilsAutomatically: true },
  WALLET_CREDIT: { label: 'Wallet credit', help: 'Credits the customer’s Ruby+ wallet after a successful claim.', valueLabel: 'Amount (₦)', valueHelp: 'Amount to credit in naira.', fulfilsAutomatically: true },
  PERCENT_OFF: { label: 'Percentage discount', help: 'Creates an ops fulfilment task until automatic promo codes are available.', valueLabel: 'Discount (%)', valueHelp: 'Percentage from 0 to 100.', fulfilsAutomatically: false },
  FREE_DELIVERY: { label: 'Free delivery', help: 'Creates an ops fulfilment task until automatic delivery vouchers are available.', valueLabel: 'Value', valueHelp: 'Leave as 0; this reward is fulfilled manually for now.', fulfilsAutomatically: false },
  SCRATCH_CARD: { label: 'Scratch card', help: 'Creates an ops fulfilment task until scratch-card automation is available.', valueLabel: 'Value', valueHelp: 'Leave as 0; prize details go in the customer message.', fulfilsAutomatically: false },
  MANUAL_PRIZE: { label: 'Manual prize', help: 'Adds a fulfilment task to the admin prize queue after a claim.', valueLabel: 'Value', valueHelp: 'Leave as 0 unless you use it for internal tracking.', fulfilsAutomatically: false },
};

function formatDate(v?: string | null): string {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function bizName(spawn: RubyQuestSpawn): string {
  return typeof spawn.businessId === 'object'
    ? spawn.businessId?.name || '—'
    : String(spawn.businessId).slice(0, 8);
}

function userDisplay(entry: AdminPrizeQueueEntry): string {
  if (typeof entry.userId === 'object' && entry.userId) {
    const u = entry.userId;
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return name || u.email || u.phone || String(u._id).slice(0, 8);
  }
  return String(entry.userId).slice(0, 8);
}

export default function AdminRubyQuestPage() {
  const [tab, setTab] = useState<Tab>('spawns');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ruby Quest"
        description="Editorial spawns, reward pool, prize queue, and tunables."
      />

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {[
            { id: 'spawns', label: 'Spawns', icon: Gem },
            { id: 'rewards', label: 'Reward pool', icon: Gift },
            { id: 'prizes', label: 'Prize queue', icon: Package },
            { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
            { id: 'config', label: 'Config', icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as Tab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-ruby-600 text-ruby-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {tab === 'spawns' && <SpawnsTab />}
      {tab === 'rewards' && <RewardsTab />}
      {tab === 'prizes' && <PrizesTab />}
      {tab === 'subscriptions' && <SubscriptionsTab />}
      {tab === 'config' && <ConfigTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Spawns tab
// ─────────────────────────────────────────────────────────────────────────

function SpawnsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, refetch } = useApi(
    () =>
      api.rubyQuest.listSpawns({
        status: statusFilter || undefined,
        rarity: rarityFilter || undefined,
        page,
        limit: 25,
      }),
    [statusFilter, rarityFilter, page],
  );

  const { mutate: doRevoke, isLoading: revoking } = useMutation(
    (args: { id: string; reason?: string }) =>
      api.rubyQuest.revokeSpawn(args.id, args.reason),
    {
      onSuccess: () => {
        toast.success('Spawn revoked');
        refetch();
      },
      onError: (m) => toast.error(m),
    },
  );

  const columns: Column<RubyQuestSpawn>[] = [
    {
      key: 'business',
      header: 'Business',
      render: (r) => (
        <span className="font-medium text-gray-900">{bizName(r)}</span>
      ),
    },
    {
      key: 'rarity',
      header: 'Rarity',
      render: (r) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${RARITY_COLORS[r.rarity]}`}
        >
          {r.rarity === 'LEGENDARY' && <Sparkles className="w-3 h-3" />}
          {r.rarity}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={SPAWN_STATUS_LABEL[r.status]} />,
    },
    {
      key: 'source',
      header: 'Source',
      render: (r) => (
        <span className="text-xs text-gray-500">
          {r.source.replace(/_/g, ' ').toLowerCase()}
        </span>
      ),
    },
    {
      key: 'spawnedAt',
      header: 'Spawned',
      render: (r) => (
        <span className="text-xs text-gray-500">{formatDate(r.spawnedAt)}</span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      render: (r) => (
        <span className="text-xs text-gray-500">{formatDate(r.expiresAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        r.status === 'LIVE' ? (
          <button
            onClick={() => {
              const reason = window.prompt('Reason for revoke (optional)') || undefined;
              if (window.confirm(`Revoke this ${r.rarity} spawn?`)) {
                doRevoke({ id: r._id, reason });
              }
            }}
            disabled={revoking}
            className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 inline mr-1" />
            Revoke
          </button>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ];

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Filter bar + create */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
        >
          <option value="">All statuses</option>
          <option value="LIVE">Live</option>
          <option value="CLAIMED">Claimed</option>
          <option value="EXPIRED">Expired</option>
          <option value="REVOKED">Revoked</option>
        </select>
        <select
          value={rarityFilter}
          onChange={(e) => {
            setRarityFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
        >
          <option value="">All rarities</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          onClick={() => refetch()}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          New editorial spawn
        </button>
      </div>

      <DataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No spawns match the current filter."
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total}{' '}
            total
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateSpawnModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function CreateSpawnModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [selectedBusiness, setSelectedBusiness] = useState<{
    _id: string;
    name: string;
    logoUrl?: string;
    locationName?: string;
    hasGeoPoint: boolean;
  } | null>(null);
  const [rarity, setRarity] = useState<RubyRarity>('COMMON');
  const [rewardConfigId, setRewardConfigId] = useState('');
  const [radiusM, setRadiusM] = useState('50');
  const [expiresInMinutes, setExpiresInMinutes] = useState('1440');

  const { data: rewards } = useApi(() => api.rubyQuest.listRewards(), []);

  const rewardsForRarity = useMemo(
    () =>
      (rewards?.items ?? []).filter(
        (r) => r.allowedRarities.includes(rarity) && r.isActive,
      ),
    [rewards, rarity],
  );

  const { mutate: doCreate, isLoading } = useMutation(
    (payload: CreateRubyQuestSpawnRequest) =>
      api.rubyQuest.createSpawn(payload),
    {
      onSuccess: () => {
        toast.success('Spawn created — LIVE on map');
        onCreated();
      },
      onError: (m) => toast.error(m),
    },
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="New editorial spawn"
      subtitle="Drops immediately. Uses the business's geoPoint for placement."
      size="md"
    >
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Business
          </label>
          <BusinessSearchPicker
            selected={selectedBusiness}
            onSelect={setSelectedBusiness}
          />
          {selectedBusiness && !selectedBusiness.hasGeoPoint && (
            <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
              <span>⚠</span>
              This business has no geoPoint set — spawn will fail. Set the map
              pin on the business first.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Rarity
          </label>
          <div className="flex gap-2">
            {RARITIES.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRarity(r);
                  setRewardConfigId('');
                }}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium ${
                  rarity === r
                    ? RARITY_COLORS[r] + ' ring-2 ring-offset-1 ring-ruby-500'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Reward (optional — else weighted-random from active pool)
          </label>
          <select
            value={rewardConfigId}
            onChange={(e) => setRewardConfigId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">
              Auto — pick from {rewardsForRarity.length} active {rarity} rewards
            </option>
            {rewardsForRarity.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name} · {r.type} · {r.value}
              </option>
            ))}
          </select>
          {rewardsForRarity.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
              <span>⚠</span>
              No active {rarity} rewards. Seed the pool first: <code className="bg-gray-100 px-1 rounded">npx ts-node scripts/seed-ruby-quest-rewards.ts</code>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Claim radius (m)
            </label>
            <input
              type="number"
              min={10}
              max={500}
              value={radiusM}
              onChange={(e) => setRadiusM(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Expires in (minutes)
            </label>
            <input
              type="number"
              min={30}
              value={expiresInMinutes}
              onChange={(e) => setExpiresInMinutes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            disabled={!selectedBusiness || isLoading}
            onClick={() =>
              selectedBusiness &&
              doCreate({
                businessId: selectedBusiness._id,
                rarity,
                rewardConfigId: rewardConfigId || undefined,
                radiusM: parseInt(radiusM, 10) || undefined,
                expiresInMinutes: parseInt(expiresInMinutes, 10) || undefined,
              })
            }
            className="px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Creating…' : 'Create spawn'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Debounced live search over LIVE businesses. Backend supports
 * `?search=` on /admin/businesses; we throttle to 300 ms so a quick
 * typer doesn't fire a request per keystroke. Restricting to
 * status=LIVE because a spawn against a non-LIVE business is rejected
 * server-side anyway — surfacing them here just wastes clicks.
 */
function BusinessSearchPicker({
  selected,
  onSelect,
}: {
  selected: {
    _id: string;
    name: string;
    logoUrl?: string;
    locationName?: string;
    hasGeoPoint: boolean;
  } | null;
  onSelect: (
    business: {
      _id: string;
      name: string;
      logoUrl?: string;
      locationName?: string;
      hasGeoPoint: boolean;
    } | null,
  ) => void;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce — 300ms after last keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isLoading } = useApi(
    () =>
      api.businesses.list({
        search: debouncedQuery || undefined,
        status: 'LIVE' as any,
        limit: 10,
      } as any),
    [debouncedQuery],
    { enabled: isOpen && debouncedQuery.length >= 2 },
  );

  // Close dropdown on outside click.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
        {selected.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.logoUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 font-semibold">
            {selected.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {selected.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {selected.locationName || selected._id.slice(0, 8)}
          </div>
        </div>
        <button
          onClick={() => {
            onSelect(null);
            setQuery('');
            setIsOpen(true);
          }}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Change
        </button>
      </div>
    );
  }

  const items = (results ?? []) as any[];

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search LIVE businesses by name…"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500 focus:border-transparent"
      />
      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-sm text-gray-500">
              Searching…
            </div>
          )}
          {!isLoading && items.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No LIVE businesses match “{debouncedQuery}”.
            </div>
          )}
          {!isLoading &&
            items.map((biz: any) => {
              const hasGeoPoint = Array.isArray(biz?.geoPoint?.coordinates);
              const locName =
                typeof biz.locationId === 'object'
                  ? biz.locationId?.name
                  : undefined;
              return (
                <button
                  key={biz._id}
                  onClick={() => {
                    onSelect({
                      _id: biz._id,
                      name: biz.name,
                      logoUrl: biz.logoUrl,
                      locationName: locName,
                      hasGeoPoint,
                    });
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                >
                  {biz.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={biz.logoUrl}
                      alt=""
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-semibold">
                      {biz.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {biz.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate flex items-center gap-2">
                      <span>{locName || biz._id.slice(0, 8)}</span>
                      {!hasGeoPoint && (
                        <span className="text-amber-600">· no geoPoint</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      )}
      {debouncedQuery.length > 0 && debouncedQuery.length < 2 && isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-gray-500">
          Keep typing — need at least 2 characters.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Rewards tab
// ─────────────────────────────────────────────────────────────────────────

function RewardsTab() {
  const { data, isLoading, refetch } = useApi(
    () => api.rubyQuest.listRewards(),
    [],
  );
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<RubyRewardConfig | null>(null);

  const { mutate: doToggle } = useMutation(
    (args: { id: string; isActive: boolean }) =>
      api.rubyQuest.updateReward(args.id, { isActive: args.isActive }),
    {
      onSuccess: () => {
        toast.success('Reward updated');
        refetch();
      },
      onError: (m) => toast.error(m),
    },
  );

  const columns: Column<RubyRewardConfig>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (r) => <span className="font-medium text-gray-900">{r.name}</span>,
    },
    {
      key: 'allowedRarities',
      header: 'Eligible rubies',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.allowedRarities.map((rarity) => (
            <span key={rarity} className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${RARITY_COLORS[rarity]}`}>
              {rarity}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => <span className="text-xs">{r.type}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      render: (r) => <span className="text-sm font-mono">{r.value}</span>,
    },
    {
      key: 'weight',
      header: 'Weight',
      render: (r) => <span className="text-sm text-gray-600">{r.weight}</span>,
    },
    {
      key: 'description',
      header: 'Customer message',
      render: (r) => (
        <span className="text-xs text-gray-500 line-clamp-1 max-w-xs">
          {r.description}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-3">
          <button
            onClick={() => setEditing(r)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Edit3 className="w-3.5 h-3.5 inline mr-1" />
            Edit
          </button>
          <button
            onClick={() => doToggle({ id: r._id, isActive: !r.isActive })}
            className="text-xs text-gray-600 hover:text-gray-800 font-medium"
          >
            {r.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Every live ruby draws from active rewards that match its rarity. A
          higher weight makes a matching reward more likely to be picked.
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          New reward
        </button>
      </div>

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No reward configs. Seed via scripts/seed-ruby-quest-rewards.ts."
      />

      {(showCreate || editing) && (
        <RewardFormModal
          initial={editing}
          onClose={() => {
            setShowCreate(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowCreate(false);
            setEditing(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function RewardFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: RubyRewardConfig | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<CreateRubyRewardConfigRequest>({
    name: initial?.name || '',
    description: initial?.description || '',
    type: initial?.type || 'POINTS',
    value: initial?.value ?? 100,
    allowedRarities: initial?.allowedRarities || ['COMMON'],
    weight: initial?.weight ?? 1,
    redemptionInstructions: initial?.redemptionInstructions || '',
    isActive: initial?.isActive ?? true,
  });

  const rewardType = REWARD_TYPE_OPTIONS[form.type];
  const canUseValue = form.type === 'POINTS' || form.type === 'WALLET_CREDIT' || form.type === 'PERCENT_OFF';
  const hasValidValue = !canUseValue || (
    (form.value ?? 0) > 0 &&
    (form.type !== 'PERCENT_OFF' || (form.value ?? 0) <= 100)
  );

  const { mutate: doSubmit, isLoading } = useMutation(
    (payload: CreateRubyRewardConfigRequest) =>
      isEdit
        ? api.rubyQuest.updateReward(initial!._id, (({ type: _type, ...update }) => update)(payload))
        : api.rubyQuest.createReward(payload),
    {
      onSuccess: () => {
        toast.success(isEdit ? 'Reward updated' : 'Reward created');
        onSaved();
      },
      onError: (m) => toast.error(m),
    },
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? `Edit reward — ${initial!.name}` : 'New reward'}
      size="md"
    >
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Name
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Customer message
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. You earned 100 Ruby points."
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
          />
          <p className="text-[11px] text-gray-500 mt-1">This is shown to the customer when the ruby is collected.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as RubyRewardType })
              }
              disabled={isEdit}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {REWARD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {REWARD_TYPE_OPTIONS[t].label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">{rewardType.help}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Eligible ruby rarities
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {RARITIES.map((rarity) => {
                const selected = form.allowedRarities.includes(rarity);
                return (
                  <button
                    key={rarity}
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      allowedRarities: selected
                        ? form.allowedRarities.filter((value) => value !== rarity)
                        : [...form.allowedRarities, rarity],
                    })}
                    className={`px-2.5 py-1.5 rounded-md border text-xs font-semibold ${selected ? RARITY_COLORS[rarity] : 'bg-white text-gray-500 border-gray-200'}`}
                  >
                    {rarity}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Choose every ruby rarity that can draw this reward.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {rewardType.valueLabel}
            </label>
            <input
              type="number"
              value={form.value}
              disabled={!canUseValue}
              onChange={(e) =>
                setForm({ ...form, value: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-400"
            />
            <p className="text-[11px] text-gray-500 mt-1">{rewardType.valueHelp}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Weight
            </label>
            <input
              type="number"
              min={1}
              value={form.weight ?? 1}
              onChange={(e) =>
                setForm({ ...form, weight: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Higher = picked more often in weighted-random draws.
            </p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Redemption instructions (optional)
          </label>
          <input
            value={form.redemptionInstructions || ''}
            onChange={(e) => setForm({ ...form, redemptionInstructions: e.target.value })}
            placeholder="e.g. Show your claim code at the counter."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          {!rewardType.fulfilsAutomatically && (
            <p className="text-[11px] text-amber-700 mt-1">This reward creates a prize-queue task for the admin team to fulfil.</p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive ?? true}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Active — included in weighted picker
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            disabled={!form.name || !form.description || form.allowedRarities.length === 0 || !hasValidValue || isLoading}
            onClick={() => doSubmit(form)}
            className="px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Prize queue tab
// ─────────────────────────────────────────────────────────────────────────

function PrizesTab() {
  const [statusFilter, setStatusFilter] = useState<PrizeQueueStatus | ''>(
    'PENDING',
  );
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminPrizeQueueEntry | null>(null);

  const { data, isLoading, refetch } = useApi(
    () =>
      api.rubyQuest.listPrizes({
        status: statusFilter || undefined,
        page,
        limit: 25,
      }),
    [statusFilter, page],
  );

  const columns: Column<AdminPrizeQueueEntry>[] = [
    {
      key: 'redemptionCode',
      header: 'Code',
      render: (r) => (
        <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded border">
          {r.redemptionCode}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (r) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {userDisplay(r)}
          </div>
          {typeof r.userId === 'object' && r.userId?.phone && (
            <div className="text-xs text-gray-500">{r.userId.phone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'reward',
      header: 'Reward',
      render: (r) => (
        <span className="text-sm text-gray-800 line-clamp-2 max-w-xs">
          {r.rewardDescription}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (r) => (
        <span className="text-[11px] text-gray-500">
          {r.source.replace(/_/g, ' ').toLowerCase()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${PRIZE_STATUS_COLORS[r.status]}`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (r) => (
        <span className="text-xs text-gray-500">{formatDate(r.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          onClick={() => setEditing(r)}
          disabled={r.status === 'REDEEMED' || r.status === 'CANCELLED'}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-300"
        >
          {r.status === 'REDEEMED' || r.status === 'CANCELLED' ? 'Closed' : 'Update'}
        </button>
      ),
    },
  ];

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as PrizeQueueStatus | '');
            setPage(1);
          }}
          className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending (open queue)</option>
          <option value="CONTACTED">Contacted</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="REDEEMED">Redeemed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          onClick={() => refetch()}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <DataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No prizes match the current filter."
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total}{' '}
            total
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editing && (
        <PrizeUpdateModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function PrizeUpdateModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: AdminPrizeQueueEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<PrizeQueueStatus>(entry.status);
  const [note, setNote] = useState(entry.fulfilmentNote || '');

  const { mutate: doSave, isLoading } = useMutation(
    () =>
      api.rubyQuest.updatePrize(entry._id, {
        status,
        fulfilmentNote: note || undefined,
      }),
    {
      onSuccess: () => {
        toast.success('Prize updated');
        onSaved();
      },
      onError: (m) => toast.error(m),
    },
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Prize · ${entry.redemptionCode}`}
      subtitle={entry.rewardDescription}
      size="md"
    >
      <div className="p-6 space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
          <div>
            <span className="text-gray-500">User: </span>
            {userDisplay(entry)}
          </div>
          {typeof entry.userId === 'object' && entry.userId?.phone && (
            <div>
              <span className="text-gray-500">Phone: </span>
              {entry.userId.phone}
            </div>
          )}
          {typeof entry.userId === 'object' && entry.userId?.email && (
            <div>
              <span className="text-gray-500">Email: </span>
              {entry.userId.email}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { s: 'PENDING' as const, i: Clock, l: 'Pending' },
                { s: 'CONTACTED' as const, i: RefreshCw, l: 'Contacted' },
                { s: 'FULFILLED' as const, i: CheckCircle2, l: 'Fulfilled' },
                { s: 'REDEEMED' as const, i: CheckCircle2, l: 'Redeemed' },
                { s: 'CANCELLED' as const, i: XCircle, l: 'Cancelled' },
              ] as const
            ).map(({ s, i: Icon, l }) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${
                  status === s
                    ? PRIZE_STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-ruby-500'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Fulfilment note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Spoke to customer via WhatsApp, dinner booked for Fri 7pm."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            disabled={isLoading}
            onClick={() => doSave()}
            className="px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Config tab
// ─────────────────────────────────────────────────────────────────────────

function ConfigTab() {
  const { data, isLoading, refetch } = useApi(
    () => api.rubyQuest.getConfig(),
    [],
  );
  const [form, setForm] = useState<Partial<RubyQuestConfig>>({});
  const [testEmail, setTestEmail] = useState('');

  const { mutate: doSave, isLoading: saving } = useMutation(
    () => api.rubyQuest.updateConfig(form),
    {
      onSuccess: () => {
        toast.success('Config updated — new values apply on next request');
        setForm({});
        refetch();
      },
      onError: (m) => toast.error(m),
    },
  );

  const { mutate: sendTestPrompt, isLoading: sendingTestPrompt } = useMutation(
    () => api.rubyQuest.sendTestDailyPrompt(testEmail.trim()),
    {
      onSuccess: (result) => {
        toast.success(`Test Ruby Quest push sent to ${result.recipient.email}`);
        setTestEmail('');
      },
      onError: (message) => toast.error(message),
    },
  );

  if (isLoading || !data) {
    return <div className="text-sm text-gray-500 p-6">Loading config…</div>;
  }

  const merged: Partial<RubyQuestConfig> = { ...data, ...form };
  const isDirty = Object.keys(form).length > 0;
  // Existing singleton rows pre-date this field. Treat an absent value as
  // enabled so a deployment cannot unexpectedly hide a live customer tab.
  const customerTabEnabled = merged.customerTabEnabled !== false;

  const numberField = (
    key: keyof RubyQuestConfig,
    label: string,
    help: string,
  ) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        type="number"
        value={(merged[key] as number) ?? ''}
        onChange={(e) =>
          setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })
        }
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
      />
      <p className="text-[11px] text-gray-500 mt-1">{help}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Customer app tab</h3>
          <p className="mt-1 text-sm text-gray-600">
            {customerTabEnabled
              ? 'Ruby Quest is visible in the customer app tab bar.'
              : 'Ruby Quest is hidden from the customer app tab bar.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...form, customerTabEnabled: !customerTabEnabled })}
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
            customerTabEnabled ? 'bg-emerald-500' : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={customerTabEnabled}
          aria-label="Toggle Ruby Quest customer app tab"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 translate-y-1 rounded-full bg-white shadow transition ${
              customerTabEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Test daily Ruby Quest prompt</h3>
            <p className="mt-1 text-sm text-gray-600">
              Sends the real daily push to one customer device. Tapping it opens the Ruby Quest launch modal.
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto sm:min-w-[430px]">
            <input
              type="email"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && testEmail.trim()) sendTestPrompt();
              }}
              placeholder="Customer app email"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ruby-500"
            />
            <button
              type="button"
              onClick={() => sendTestPrompt()}
              disabled={!testEmail.trim() || sendingTestPrompt}
              className="shrink-0 rounded-lg bg-ruby-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingTestPrompt ? 'Sending…' : 'Send test push'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-amber-700">
          The customer must have opened the customer app and allowed notifications. Create a live Ruby drop first so the Quest map has something to show.
        </p>
      </div>

      <div className="card p-4">
        <p className="text-sm text-gray-600">
          Every tunable is hot — changes apply on the next request (no
          backend restart). Values persist in the{' '}
          <code>ruby_quest_config</code> singleton.
        </p>
      </div>

      <div className="card p-6 space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800">Discovery + geofence</h3>
          <div className="grid grid-cols-2 gap-4">
            {numberField(
              'mapRadiusKm',
              'Map radius (km)',
              'Default query radius on the customer Quest map.',
            )}
            {numberField(
              'mapRadiusKmMax',
              'Map radius max (km)',
              'Hard cap the API enforces even if client sends a bigger radius.',
            )}
            {numberField(
              'approachMeters',
              'Approach distance (m)',
              'Fires an approach push when the customer is this close.',
            )}
            {numberField(
              'geofenceMeters',
              'Claim geofence (m)',
              'Customer must be within this many metres to claim (FR-CLM-2).',
            )}
            {numberField(
              'checkInMaxAgeSeconds',
              'Check-in max age (s)',
              'Reject claims where the GPS ping is older than this.',
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800">Rarity expiry (hours)</h3>
          <div className="grid grid-cols-3 gap-4">
            {numberField(
              'commonExpiryHours',
              'Common expiry (h)',
              'Common spawns expire after this many hours.',
            )}
            {numberField(
              'rareExpiryHours',
              'Rare expiry (h)',
              'Rare spawns expire after this many hours.',
            )}
            {numberField(
              'legendaryExpiryHours',
              'Legendary expiry (h)',
              'Legendary spawns expire after this many hours.',
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800">Merchant cadence (days)</h3>
          <div className="grid grid-cols-3 gap-4">
            {numberField(
              'commonCadenceDays',
              'Common cadence (d)',
              'One spawn per this many days per merchant campaign.',
            )}
            {numberField(
              'rareCadenceDays',
              'Rare cadence (d)',
              'One spawn per this many days.',
            )}
            {numberField(
              'legendaryCadenceDays',
              'Legendary cadence (d)',
              'One spawn per this many days.',
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800">Rate limits + anti-fraud</h3>
          <div className="grid grid-cols-3 gap-4">
            {numberField(
              'maxClaimsPerHour',
              'Max claims / user / hour',
              'Anti-burst throttle.',
            )}
            {numberField(
              'maxClaimsPerDay',
              'Max claims / user / day',
              'Hard cap. Prevents farming.',
            )}
            {numberField(
              'antiSpoofMaxMetersPerSecond',
              'Anti-spoof max m/s',
              'Max movement speed between check-ins before flagged as spoof.',
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800">Leaderboard</h3>
          <div className="grid grid-cols-2 gap-4">
            {numberField(
              'leaderboardTopN',
              'Leaderboard top N',
              'How many winners per city per week get prizes.',
            )}
          </div>
        </section>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Last updated: {formatDate(data.updatedAt)}
          </p>
          <div className="flex gap-2">
            <button
              disabled={!isDirty}
              onClick={() => setForm({})}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Reset changes
            </button>
            <button
              disabled={!isDirty || saving}
              onClick={() => doSave()}
              className="px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Subscriptions tab — merchant Ruby Quest billing (wallet + Paystack)
// ─────────────────────────────────────────────────────────────────────────

const SUB_STATUS_COLORS: Record<RubyQuestSubscriptionStatus, string> = {
  PENDING_PAYMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAUSED: 'bg-gray-50 text-gray-600 border-gray-200',
  EXPIRED: 'bg-gray-50 text-gray-500 border-gray-200',
  PAYMENT_FAILED: 'bg-red-50 text-red-700 border-red-200',
};

function subBusinessName(sub: RubyQuestAdminSubscription): string {
  if (typeof sub.businessId === 'object' && sub.businessId) {
    return sub.businessId.name || String(sub.businessId._id).slice(0, 8);
  }
  return String(sub.businessId).slice(0, 8);
}

function subCampaignStatus(sub: RubyQuestAdminSubscription): string {
  if (typeof sub.campaignId === 'object' && sub.campaignId?.status) {
    return sub.campaignId.status;
  }
  return '—';
}

function SubscriptionsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'' | 'WALLET' | 'PAYSTACK'>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Cheap debounce so the merchant-search box doesn't fire on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useApi(
    () =>
      api.rubyQuest.listSubscriptions({
        status: statusFilter || undefined,
        tier: tierFilter || undefined,
        paymentSource: sourceFilter || undefined,
        search: debouncedSearch || undefined,
        page,
        limit: 25,
      }),
    [statusFilter, tierFilter, sourceFilter, debouncedSearch, page],
  );

  const items: RubyQuestAdminSubscription[] = Array.isArray(data?.items) ? data.items : [];
  const pagination = data?.pagination;

  const { mutate: pauseSub, isLoading: pausing } = useMutation(
    (args: { id: string; reason?: string }) =>
      api.rubyQuest.pauseSubscription(args.id, args.reason),
    {
      onSuccess: () => {
        toast.success('Subscription paused');
        refetch();
      },
      onError: (m) => toast.error(m),
    },
  );
  const { mutate: resumeSub, isLoading: resuming } = useMutation(
    (id: string) => api.rubyQuest.resumeSubscription(id),
    {
      onSuccess: () => {
        toast.success('Subscription resumed');
        refetch();
      },
      onError: (m) => toast.error(m),
    },
  );

  const columns: Column<RubyQuestAdminSubscription>[] = [
    {
      key: 'business',
      header: 'Business',
      render: (sub) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">{subBusinessName(sub)}</div>
          <div className="text-xs text-gray-500">#{sub._id.slice(-8)}</div>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (sub) => (
        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${RARITY_COLORS[sub.tier]}`}>
          {sub.tier}
        </span>
      ),
    },
    {
      key: 'paymentSource',
      header: 'Payment',
      render: (sub) => (
        <div className="flex items-center gap-1.5 text-sm">
          {sub.paymentSource === 'WALLET' ? (
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
          )}
          <span className="text-gray-700">{sub.paymentSource}</span>
          {sub.cardLast4 && (
            <span className="text-xs text-gray-400">•••• {sub.cardLast4}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (sub) => (
        <span
          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${SUB_STATUS_COLORS[sub.status]}`}
        >
          {sub.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'weekly',
      header: 'Weekly',
      render: (sub) => (
        <span className="text-sm font-semibold text-gray-900">
          ₦{sub.weeklyAmountNgn.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'renewal',
      header: 'Renews / Ends',
      render: (sub) => (
        <div className="text-xs text-gray-600">
          <div>{formatDate(sub.currentPeriodEnd)}</div>
          <div className={sub.autoRenew ? 'text-emerald-600' : 'text-gray-400'}>
            {sub.autoRenew ? 'Auto-renew ON' : 'Auto-renew OFF'}
          </div>
        </div>
      ),
    },
    {
      key: 'campaign',
      header: 'Campaign',
      render: (sub) => (
        <span className="text-xs text-gray-500">{subCampaignStatus(sub)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32 text-right',
      render: (sub) => {
        const canPause = sub.status === 'ACTIVE' || sub.status === 'PAYMENT_FAILED';
        const canResume = sub.status === 'PAUSED';
        return (
          <div className="flex items-center justify-end gap-1">
            {canPause && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const reason = window.prompt(
                    `Pause ${sub.tier} subscription for ${subBusinessName(sub)}?\n\nEnter a reason (visible to ops audit log):`,
                    '',
                  );
                  if (reason !== null) {
                    pauseSub({ id: sub._id, reason });
                  }
                }}
                disabled={pausing}
                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                title="Force pause"
              >
                {pausing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            )}
            {canResume && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resumeSub(sub._id);
                }}
                disabled={resuming}
                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                title="Force resume"
              >
                {resuming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 placeholder:text-gray-400"
              placeholder="Search business name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="PAYMENT_FAILED">Payment failed</option>
            <option value="PENDING_PAYMENT">Pending payment</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <select
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All tiers</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter((e.target.value || '') as '' | 'WALLET' | 'PAYSTACK');
              setPage(1);
            }}
          >
            <option value="">All payment sources</option>
            <option value="WALLET">Wallet</option>
            <option value="PAYSTACK">Paystack card</option>
          </select>
          <button
            onClick={() => refetch()}
            className="ml-auto p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        emptyMessage="No Ruby Quest subscriptions match these filters."
        meta={pagination}
        currentPage={page}
        onPageChange={setPage}
      />
    </div>
  );
}
