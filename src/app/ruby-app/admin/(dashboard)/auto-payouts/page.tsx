'use client';

/**
 * Admin auto-payouts dashboard.
 *
 * Surfaces the auto-payout queue (one row per fulfillment event), with
 * stats tiles, filters, manual retry, and the one-time switchover sweep
 * button used during the rollout from manual withdrawals to auto-payout.
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, StatCard, Modal } from '@/components/ui';
import type {
  AutoPayout,
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

export default function AutoPayoutsPage() {
  const [statusFilter, setStatusFilter] = useState<AutoPayoutStatus | ''>('');
  const [businessIdFilter, setBusinessIdFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sweepModalOpen, setSweepModalOpen] = useState(false);
  const [sweepResult, setSweepResult] = useState<SwitchoverSweepResult | null>(null);
  const [sweepRunning, setSweepRunning] = useState(false);

  const { data: stats, refetch: refetchStats } = useApi<AutoPayoutStats>(
    () => api.autoPayouts.stats(),
    [],
  );

  const {
    data: payouts,
    isLoading: payoutsLoading,
    refetch: refetchPayouts,
  } = useApi<AutoPayout[]>(
    () =>
      api.autoPayouts.list({
        status: statusFilter || undefined,
        businessId: businessIdFilter.trim() || undefined,
        page,
        limit: 50,
      }),
    [statusFilter, businessIdFilter, page],
  );

  const { mutate: retryOne } = useMutation<AutoPayout, { id: string }>(
    ({ id }) => api.autoPayouts.retry(id),
  );

  const { mutate: retryAll, isLoading: retryingAll } = useMutation<
    { scanned: number; retried: number },
    void
  >(() => api.autoPayouts.retryAll());

  const handleRetryOne = async (row: AutoPayout) => {
    const result = await retryOne({ id: row._id });
    if (result !== null) {
      toast.success(`Retry queued for auto-payout ${row._id.slice(-6)}`);
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

  const totalRows = payouts?.length || 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auto-payouts"
        description="Direct-to-merchant settlement queue. Each fulfillment event creates one row that wires earnings to the merchant's bank."
        action={
          <div className="flex items-center gap-2">
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard title="Queued" value={stats?.queued ?? 0} icon={Clock} />
        <StatCard
          title="Processing"
          value={stats?.processing ?? 0}
          icon={ArrowDownToLine}
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
          title="Deferred (-bal)"
          value={stats?.deferred ?? 0}
          icon={AlertTriangle}
        />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
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
          <div className="sm:w-64">
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
        </div>
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
                  return (
                    <tr key={row._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-gray-700">
                          {row.sourceType}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[120px]">
                          …{row.sourceId.slice(-6)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-gray-600 truncate max-w-[120px]">
                          …{row.businessId.slice(-6)}
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
                            onClick={() => handleRetryOne(row)}
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
                      <li key={i} className="font-mono">
                        …{e.businessId.slice(-6)} — {e.reason}
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
