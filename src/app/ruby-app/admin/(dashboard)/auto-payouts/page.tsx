'use client';

/**
 * Admin auto-payouts dashboard.
 *
 * Surfaces the auto-payout queue (one row per fulfillment event), with
 * stats tiles (counts + NGN totals), filters, drill-down detail modal,
 * manual retry, CSV export, auto-refresh, and the one-time switchover
 * sweep used during the rollout from manual withdrawals to auto-payout.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Play,
  Search,
  Download,
  Activity,
  Wallet,
  Hourglass,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, StatCard, Modal } from '@/components/ui';
import type {
  AutoPayout,
  AutoPayoutBusiness,
  AutoPayoutDetail,
  AutoPayoutSourceType,
  AutoPayoutStats,
  AutoPayoutStatus,
  SwitchoverSweepResult,
} from '@/lib/types';
import { formatDateTime, formatCurrency } from '@/lib/utils';

const STATUS_OPTIONS: { value: AutoPayoutStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SUCCEEDED', label: 'Succeeded' },
  { value: 'FAILED_TRANSIENT', label: 'Failed (transient)' },
  { value: 'FAILED_PERMANENT', label: 'Failed (permanent)' },
  { value: 'DEFERRED_NEGATIVE_BALANCE', label: 'Deferred (negative balance)' },
];

const SOURCE_TYPE_OPTIONS: { value: AutoPayoutSourceType | ''; label: string }[] = [
  { value: '', label: 'All sources' },
  { value: 'ORDER', label: 'Orders' },
  { value: 'BOOKING', label: 'Bookings' },
  { value: 'QR_PAYMENT', label: 'QR payments' },
];

const STATUS_STYLES: Record<AutoPayoutStatus, string> = {
  QUEUED: 'bg-gray-50 text-gray-700 border-gray-200',
  PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
  SUCCEEDED: 'bg-green-50 text-green-700 border-green-200',
  FAILED_TRANSIENT: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED_PERMANENT: 'bg-red-50 text-red-700 border-red-200',
  DEFERRED_NEGATIVE_BALANCE: 'bg-purple-50 text-purple-700 border-purple-200',
};

const STATUS_LABELS: Record<AutoPayoutStatus, string> = {
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  SUCCEEDED: 'Succeeded',
  FAILED_TRANSIENT: 'Failed (retrying)',
  FAILED_PERMANENT: 'Failed',
  DEFERRED_NEGATIVE_BALANCE: 'Deferred',
};

/** Extract a display name from the populated-or-string businessId field. */
function getBusinessName(b: AutoPayoutBusiness): string {
  if (typeof b === 'object' && b !== null) {
    return b.name || `…${b._id.slice(-6)}`;
  }
  return `…${b.slice(-6)}`;
}

function getBusinessIdString(b: AutoPayoutBusiness): string {
  return typeof b === 'object' && b !== null ? b._id : b;
}

/** Format an ISO string as "X min ago" / "Yh ago" / "Yd ago" up to 7d. */
function formatAgo(iso?: string): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'in the future';
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return formatDateTime(iso);
}

export default function AutoPayoutsPage() {
  const [statusFilter, setStatusFilter] = useState<AutoPayoutStatus | ''>('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<AutoPayoutSourceType | ''>('');
  const [businessIdFilter, setBusinessIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sweepModalOpen, setSweepModalOpen] = useState(false);
  const [sweepResult, setSweepResult] = useState<SwitchoverSweepResult | null>(null);
  const [sweepRunning, setSweepRunning] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: stats, refetch: refetchStats } = useApi<AutoPayoutStats>(
    () => api.autoPayouts.stats(),
    [],
  );

  const listParams = useMemo(
    () => ({
      status: statusFilter || undefined,
      sourceType: sourceTypeFilter || undefined,
      businessId: businessIdFilter.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page,
      limit: 50,
    }),
    [statusFilter, sourceTypeFilter, businessIdFilter, fromDate, toDate, page],
  );

  const {
    data: payouts,
    isLoading: payoutsLoading,
    refetch: refetchPayouts,
  } = useApi<AutoPayout[]>(
    () => api.autoPayouts.list(listParams),
    [statusFilter, sourceTypeFilter, businessIdFilter, fromDate, toDate, page],
  );

  // Auto-refresh: poll stats + table every 30s when toggled on
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      refetchStats();
      refetchPayouts();
    }, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, refetchStats, refetchPayouts]);

  const { mutate: retryOne } = useMutation<AutoPayout, { id: string }>(
    ({ id }) => api.autoPayouts.retry(id),
  );

  const { mutate: retryAll, isLoading: retryingAll } = useMutation<
    { scanned: number; retried: number },
    void
  >(() => api.autoPayouts.retryAll());

  const handleRetryOne = async (row: AutoPayout) => {
    const isPermanent = row.status === 'FAILED_PERMANENT';
    if (isPermanent) {
      if (!confirm(
        'This row is FAILED_PERMANENT. Retrying will reset its retry budget and ' +
        'attempt the transfer again. Make sure the underlying issue (typically ' +
        'a missing/unverified bank account) has been fixed first. Continue?'
      )) return;
    }
    const result = await retryOne({ id: row._id });
    if (result !== null) {
      toast.success(
        isPermanent
          ? `Force retry queued for auto-payout …${row._id.slice(-6)}`
          : `Retry queued for auto-payout …${row._id.slice(-6)}`,
      );
      refetchPayouts();
      refetchStats();
    }
  };

  const handleRetryAll = async () => {
    if (!confirm('Run the retry sweep now? This processes all eligible failed and deferred auto-payouts.')) return;
    const result = await retryAll();
    if (result !== null) {
      toast.success(
        `Retry sweep: ${result.retried}/${result.scanned} processed`,
      );
      refetchPayouts();
      refetchStats();
    }
  };

  const handleSwitchoverSweep = async () => {
    setSweepRunning(true);
    try {
      const res = await api.autoPayouts.switchoverSweep();
      const data = (res?.data || res) as SwitchoverSweepResult;
      setSweepResult(data);
      toast.success(
        `Switchover sweep: ${data.succeeded} succeeded, ${data.failed} failed, ${data.skipped} skipped`,
      );
      refetchPayouts();
      refetchStats();
    } catch (err) {
      toast.error((err as Error).message || 'Switchover sweep failed');
    } finally {
      setSweepRunning(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      await api.autoPayouts.exportCsv({
        status: statusFilter || undefined,
        sourceType: sourceTypeFilter || undefined,
        businessId: businessIdFilter.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error((err as Error).message || 'Export failed');
    }
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setSourceTypeFilter('');
    setBusinessIdFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const totalRows = payouts?.length || 0;
  const hasActiveFilters =
    !!statusFilter || !!sourceTypeFilter || !!businessIdFilter || !!fromDate || !!toDate;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auto-payouts"
        description="Direct-to-merchant settlement queue. Each fulfillment event creates one row that wires earnings to the merchant's bank."
        action={
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-sm text-gray-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500"
              />
              <Activity className="w-3.5 h-3.5" />
              Auto-refresh
            </label>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              title="Export filtered rows as CSV"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handleRetryAll}
              disabled={retryingAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {retryingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Run retry sweep
            </button>
            <button
              onClick={() => {
                setSweepResult(null);
                setSweepModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700"
              title="One-time bulk payout of pre-existing wallet balances"
            >
              <Play className="w-4 h-4" />
              Switchover sweep
            </button>
          </div>
        }
      />

      {/* Money-weighted KPIs — what finance actually wants to see at a glance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Wired today"
          value={formatCurrency(stats?.amountSucceededToday ?? 0)}
          icon={CheckCircle2}
          trend={`${stats?.succeededToday ?? 0} successful transfers`}
          trendUp={true}
        />
        <StatCard
          title="Stuck (permanent)"
          value={formatCurrency(stats?.amountStuckPermanent ?? 0)}
          icon={XCircle}
          trend={`${stats?.failedPermanent ?? 0} rows need ops attention`}
          trendUp={false}
        />
        <StatCard
          title="In escrow (deferred)"
          value={formatCurrency(stats?.amountInDeferred ?? 0)}
          icon={Wallet}
          trend={`${stats?.deferred ?? 0} awaiting wallet recovery`}
        />
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard title="Queued" value={stats?.queued ?? 0} icon={Clock} />
        <StatCard
          title="Processing"
          value={stats?.processing ?? 0}
          icon={ArrowDownToLine}
          trend={
            stats?.stuckProcessing ? `${stats.stuckProcessing} stuck >5min` : undefined
          }
          trendUp={stats?.stuckProcessing ? false : undefined}
        />
        <StatCard
          title="Succeeded today"
          value={stats?.succeededToday ?? 0}
          icon={CheckCircle2}
        />
        <StatCard
          title="Failed today"
          value={stats?.failedToday ?? 0}
          icon={XCircle}
        />
        <StatCard
          title="Stuck >5min"
          value={stats?.stuckProcessing ?? 0}
          icon={Hourglass}
        />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Search by Business ID
            </label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={businessIdFilter}
                onChange={(e) => {
                  setBusinessIdFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Mongo ObjectId of the business"
                className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as AutoPayoutStatus | '');
                setPage(1);
              }}
              className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Source
            </label>
            <select
              value={sourceTypeFilter}
              onChange={(e) => {
                setSourceTypeFilter(e.target.value as AutoPayoutSourceType | '');
                setPage(1);
              }}
              className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            >
              {SOURCE_TYPE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            />
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Source', 'Business', 'Earned', 'Transferred', 'Status', 'Attempts', 'Created', ''].map(
                  (h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {payoutsLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Loading…
                  </td>
                </tr>
              ) : !payouts || payouts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No auto-payouts match your filters.
                  </td>
                </tr>
              ) : (
                payouts.map((row) => {
                  const canRetry =
                    row.status === 'FAILED_TRANSIENT' ||
                    row.status === 'FAILED_PERMANENT' ||
                    row.status === 'DEFERRED_NEGATIVE_BALANCE' ||
                    row.status === 'QUEUED';
                  const businessName = getBusinessName(row.businessId);
                  return (
                    <tr
                      key={row._id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setDetailId(row._id)}
                    >
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-gray-700">
                          {row.sourceType}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[120px]">
                          …{row.sourceId.slice(-6)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-700 truncate max-w-[180px]">
                          {businessName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatCurrency(row.earnedAmount, row.currency)}
                      </td>
                      <td className="px-4 py-3">
                        {row.status === 'SUCCEEDED' ? (
                          <span className="text-sm font-semibold text-green-700">
                            {formatCurrency(row.transferAmount, row.currency)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${STATUS_STYLES[row.status]}`}
                          title={row.lastError || undefined}
                        >
                          {STATUS_LABELS[row.status]}
                        </span>
                        {row.lastError && (
                          <div
                            className="text-[10px] text-red-500 mt-1 truncate max-w-[200px]"
                            title={row.lastError}
                          >
                            {row.lastError}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">
                        {row.attemptCount}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canRetry && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetryOne(row);
                            }}
                            className="text-xs font-medium text-ruby-600 hover:text-ruby-700"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalRows >= 50 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs font-medium text-gray-600 hover:text-gray-800 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-500">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={totalRows < 50}
              className="text-xs font-medium text-gray-600 hover:text-gray-800 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Drill-down detail modal */}
      <DetailModal
        autoPayoutId={detailId}
        onClose={() => setDetailId(null)}
        onRetried={() => {
          refetchPayouts();
          refetchStats();
        }}
      />

      {/* ─── Switchover Sweep Modal ─── */}
      <Modal
        isOpen={sweepModalOpen}
        onClose={() => {
          if (!sweepRunning) setSweepModalOpen(false);
        }}
        title="Switchover sweep"
        subtitle="One-time bulk payout of pre-existing merchant wallet balances"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            This finds every BUSINESS wallet with a positive balance and a
            verified bank account, and wires the full balance to that bank in
            one batch. Use this once during the rollout from manual withdrawals
            to auto-payout. The operation is <strong>idempotent</strong> —
            re-running it skips already-zeroed wallets.
          </div>

          {sweepRunning ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-ruby-500 mr-2" />
              <span className="text-sm text-gray-600">Running sweep…</span>
            </div>
          ) : sweepResult ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard title="Scanned" value={sweepResult.scanned} icon={Search} />
                <StatCard title="Succeeded" value={sweepResult.succeeded} icon={CheckCircle2} />
                <StatCard title="Failed" value={sweepResult.failed} icon={XCircle} />
                <StatCard title="Skipped" value={sweepResult.skipped} icon={AlertTriangle} />
              </div>

              {sweepResult.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg bg-red-50 p-3 max-h-64 overflow-y-auto">
                  <div className="text-[11px] font-semibold text-red-700 uppercase tracking-wider mb-2">
                    Errors / skipped ({sweepResult.errors.length})
                  </div>
                  <ul className="space-y-1.5 text-xs text-red-800">
                    {sweepResult.errors.map((e, i) => (
                      <li key={i}>
                        <span className="font-medium">
                          {e.businessName || `…${e.businessId.slice(-6)}`}
                        </span>
                        <span className="text-red-600"> — {e.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Click <strong>Run sweep</strong> below to start. This may take a
              few minutes for many merchants.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setSweepModalOpen(false)}
              disabled={sweepRunning}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              {sweepResult ? 'Close' : 'Cancel'}
            </button>
            {!sweepResult && (
              <button
                onClick={handleSwitchoverSweep}
                disabled={sweepRunning}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700 disabled:opacity-50"
              >
                {sweepRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {sweepRunning ? 'Running…' : 'Run sweep'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Drill-down detail modal
// ─────────────────────────────────────────────────────────────────────

function DetailModal({
  autoPayoutId,
  onClose,
  onRetried,
}: {
  autoPayoutId: string | null;
  onClose: () => void;
  onRetried: () => void;
}) {
  const [detail, setDetail] = useState<AutoPayoutDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!autoPayoutId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.autoPayouts
      .detail(autoPayoutId)
      .then((res) => {
        if (cancelled) return;
        setDetail((res?.data || res) as AutoPayoutDetail);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load auto-payout detail');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [autoPayoutId]);

  const handleRetry = async () => {
    if (!detail) return;
    const isPermanent = detail.payout.status === 'FAILED_PERMANENT';
    if (isPermanent) {
      if (!confirm(
        'Force retry this FAILED_PERMANENT row? Make sure the underlying issue ' +
        '(typically a missing/unverified bank account) has been fixed first.'
      )) return;
    }
    setRetrying(true);
    try {
      await api.autoPayouts.retry(detail.payout._id);
      toast.success('Retry queued');
      onRetried();
      // Refresh the detail panel itself
      const refreshed = await api.autoPayouts.detail(detail.payout._id);
      setDetail((refreshed?.data || refreshed) as AutoPayoutDetail);
    } catch (err) {
      toast.error((err as Error).message || 'Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  if (!autoPayoutId) return null;

  const p = detail?.payout;
  const businessName = p ? getBusinessName(p.businessId) : '';
  const businessIdStr = p ? getBusinessIdString(p.businessId) : '';
  const canRetry =
    p?.status === 'FAILED_TRANSIENT' ||
    p?.status === 'FAILED_PERMANENT' ||
    p?.status === 'DEFERRED_NEGATIVE_BALANCE' ||
    p?.status === 'QUEUED';

  return (
    <Modal
      isOpen={!!autoPayoutId}
      onClose={onClose}
      title="Auto-payout detail"
      subtitle={p ? `…${p._id.slice(-12)}` : ''}
      size="lg"
    >
      {loading || !detail ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-ruby-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${STATUS_STYLES[p!.status]}`}
                >
                  {STATUS_LABELS[p!.status]}
                </span>
                <span className="text-xs text-gray-500">
                  {p!.attemptCount} attempt{p!.attemptCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {businessName}
              </div>
              <div className="text-xs font-mono text-gray-400">
                {businessIdStr}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-gray-500">
                Earned
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(p!.earnedAmount, p!.currency)}
              </div>
              {p!.transferAmount > 0 && p!.status === 'SUCCEEDED' && (
                <>
                  <div className="text-[11px] uppercase tracking-wider text-green-600 mt-1">
                    Wired to bank
                  </div>
                  <div className="text-base font-semibold text-green-700">
                    {formatCurrency(p!.transferAmount, p!.currency)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Last error banner */}
          {p!.lastError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-[11px] font-semibold text-red-700 uppercase tracking-wider mb-1">
                Last error
              </div>
              <div className="text-sm text-red-900">{p!.lastError}</div>
              {p!.notes && (
                <div className="text-xs text-red-700 mt-1 italic">{p!.notes}</div>
              )}
            </div>
          )}

          {/* Source ref */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Source
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Type</div>
                <div className="font-mono text-gray-700">{p!.sourceType}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Reference</div>
                <div className="font-mono text-gray-700">
                  {detail.source?.ref || `…${p!.sourceId.slice(-12)}`}
                </div>
              </div>
              {detail.source?.status && (
                <div className="col-span-2">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Status of source</div>
                  <div className="text-gray-700">{detail.source.status}</div>
                </div>
              )}
            </div>
          </div>

          {/* Bank account */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Bank account
            </div>
            {detail.bank ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Bank</div>
                  <div className="text-gray-700">{detail.bank.bankName || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Account</div>
                  <div className="text-gray-700">
                    {detail.bank.accountName} ****{detail.bank.accountNumberLast4 || detail.bank.accountNumber?.slice(-4) || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Status</div>
                  <div className="text-gray-700">{detail.bank.status || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Paystack recipient</div>
                  <div className="text-gray-700 font-mono text-xs">
                    {detail.bank.providerRecipientCode ? '✓ on file' : 'missing'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-amber-700">
                No bank account resolved at processing time. The payout will fail
                permanently until the merchant adds a verified bank account.
              </div>
            )}
          </div>

          {/* Wallet & Provider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Wallet
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">Before</span>
                  <span className="text-gray-700">
                    {p!.walletBalanceBefore != null
                      ? formatCurrency(p!.walletBalanceBefore, p!.currency)
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">After</span>
                  <span className="text-gray-700">
                    {p!.walletBalanceAfter != null
                      ? formatCurrency(p!.walletBalanceAfter, p!.currency)
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Paystack
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">Reference</span>
                  <span className="text-gray-700 font-mono text-xs">
                    {p!.providerReference || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">Transfer code</span>
                  <span className="text-gray-700 font-mono text-xs">
                    {p!.providerTransferCode || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Timeline
            </div>
            <div className="space-y-1 text-sm text-gray-700">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">Created</span>
                {formatDateTime(p!.createdAt)} <span className="text-gray-400">({formatAgo(p!.createdAt)})</span>
              </div>
              {p!.lastAttemptAt && (
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">Last attempt</span>
                  {formatDateTime(p!.lastAttemptAt)} <span className="text-gray-400">({formatAgo(p!.lastAttemptAt)})</span>
                </div>
              )}
              {p!.nextRetryAt && (
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">Next retry</span>
                  {formatDateTime(p!.nextRetryAt)} <span className="text-gray-400">({formatAgo(p!.nextRetryAt)})</span>
                </div>
              )}
              {p!.completedAt && (
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">Completed</span>
                  {formatDateTime(p!.completedAt)} <span className="text-gray-400">({formatAgo(p!.completedAt)})</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
            {canRetry && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700 disabled:opacity-50"
              >
                {retrying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {p!.status === 'FAILED_PERMANENT' ? 'Force retry' : 'Retry now'}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
