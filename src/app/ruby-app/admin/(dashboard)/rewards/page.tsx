'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Gift,
  TrendingDown,
  Users,
  Coins,
  ArrowDownCircle,
  Search,
  Edit3,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, StatCard, Modal } from '@/components/ui';
import { toast } from 'sonner';

/**
 * Review Rewards admin dashboard.
 *
 * Phase 59 — initial overview + user lookup.
 * P99 — adds Quarantine tab with clear / reject actions.
 *
 * Top: 4 stat tiles + per-source breakdown (P94-5).
 * Bottom: user lookup + manual point-adjustment dialog.
 * Quarantine tab: ledger rows with fraudVerdict=QUARANTINED awaiting
 * admin triage. Clear → flip to PUBLISHED + credit user; Reject → delete.
 */
export default function AdminRewardsPage() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } =
    useApi(() => api.rewards.stats(), []);

  const [searchUserId, setSearchUserId] = useState('');
  const [submittedUserId, setSubmittedUserId] = useState<string | null>(null);

  type UserPayload = Awaited<ReturnType<typeof api.rewards.getUser>>['data'];
  const [userData, setUserData] = useState<UserPayload | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<unknown>(null);

  const refetchUser = useCallback(async () => {
    if (!submittedUserId) return;
    setUserLoading(true);
    setUserError(null);
    try {
      const res = await api.rewards.getUser(submittedUserId);
      setUserData(res.data ?? null);
    } catch (err) {
      setUserError(err);
      setUserData(null);
    } finally {
      setUserLoading(false);
    }
  }, [submittedUserId]);

  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState('');

  const { mutate: doAdjust, isLoading: adjustLoading } = useMutation(
    (args: { userId: string; pointsDelta: number; reason: string }) =>
      api.rewards.adjust(args.userId, args.pointsDelta, args.reason),
    {
      onSuccess: () => {
        toast.success('Adjustment applied');
        setAdjustOpen(false);
        setAdjustDelta('');
        setAdjustReason('');
        refetchUser();
        refetchStats();
      },
      onError: (message: string) => {
        // useMutation already promotes ApiClientError.message (which is
        // backend's error.message — usually field-specific from the
        // HttpExceptionFilter) into a plain string. If empty/generic we
        // fall back to "Adjustment failed".
        toast.error(message || 'Adjustment failed');
      },
    },
  );

  // ─── P99 Quarantine state ──────────────────────────────────────────────
  type Tab = 'overview' | 'quarantine';
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [quarantinePage, setQuarantinePage] = useState(1);
  const [quarantineSourceFilter, setQuarantineSourceFilter] = useState<string>('');
  const {
    data: quarantineData,
    isLoading: quarantineLoading,
    refetch: refetchQuarantine,
  } = useApi(
    () =>
      api.rewards.getQuarantine({
        page: quarantinePage,
        limit: 20,
        sourceType: quarantineSourceFilter || undefined,
      }),
    [quarantinePage, quarantineSourceFilter],
  );

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectEntryId, setRejectEntryId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { mutate: doClear, isLoading: clearLoading } = useMutation(
    (entryId: string) => api.rewards.clearQuarantine(entryId),
    {
      onSuccess: (resp) => {
        // useMutation unwraps `data` from ApiResponse and passes T
        // directly — the shape here is `{ entryId, userId, pointsDelta,
        // newBalance }`, not `{ data: {...} }`.
        const pts = (resp?.pointsDelta ?? 0).toLocaleString();
        toast.success(`Cleared — user credited +${pts} pts`);
        refetchQuarantine();
        refetchStats();
      },
      onError: (message: string) => toast.error(message || 'Clear failed'),
    },
  );

  const { mutate: doReject, isLoading: rejectLoading } = useMutation(
    (args: { entryId: string; reason: string }) =>
      api.rewards.rejectQuarantine(args.entryId, args.reason),
    {
      onSuccess: () => {
        toast.success('Rejected and removed from queue.');
        setRejectOpen(false);
        setRejectEntryId(null);
        setRejectReason('');
        refetchQuarantine();
        refetchStats();
      },
      onError: (message: string) => toast.error(message || 'Reject failed'),
    },
  );

  const handleSearch = () => {
    const trimmed = searchUserId.trim();
    if (!trimmed) return;
    setSubmittedUserId(trimmed);
  };

  const handleAdjustSubmit = () => {
    const delta = parseInt(adjustDelta, 10);
    if (!submittedUserId) return;
    if (!delta || Number.isNaN(delta)) {
      toast.error('Enter a non-zero integer for the delta.');
      return;
    }
    if (adjustReason.trim().length < 5) {
      toast.error('Reason must be at least 5 characters.');
      return;
    }
    doAdjust({
      userId: submittedUserId,
      pointsDelta: delta,
      reason: adjustReason.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Rewards"
        description="Customer reward points earned from published reviews, cashback, referrals, and reels. 1 pt = ₦1; cash-out unlocks at 500 pts. Every credit, clawback, redemption, and admin adjustment is audit-logged."
      />

      {/* P99 — tab switcher between Overview and Quarantine */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-ruby-500 text-ruby-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('quarantine')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'quarantine'
              ? 'border-ruby-500 text-ruby-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Quarantine
          {(stats?.quarantineQueueSize ?? 0) > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
              {stats?.quarantineQueueSize ?? 0}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Points outstanding"
              value={
                statsLoading
                  ? '…'
                  : stats?.totalPointsOutstanding.toLocaleString() ?? '0'
              }
              icon={Coins}
              trend="Across all users"
            />
            <StatCard
              title="₦ liability"
              value={
                statsLoading
                  ? '…'
                  : `₦${(stats?.ngnLiabilityIfFullRedemption ?? 0).toLocaleString()}`
              }
              icon={TrendingDown}
              trend="If every user redeemed today"
            />
            <StatCard
              title="Users with points"
              value={
                statsLoading ? '…' : (stats?.usersWithPoints ?? 0).toLocaleString()
              }
              icon={Users}
              trend="Positive balances only"
            />
            <StatCard
              title="Redeemed last 30d"
              value={
                statsLoading
                  ? '…'
                  : `₦${(stats?.redemptionsLast30d.totalNgn ?? 0).toLocaleString()}`
              }
              icon={ArrowDownCircle}
              trend={`${stats?.redemptionsLast30d.count ?? 0} cash-outs`}
            />
          </div>

          {/* Top earners */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Top earners last 30 days
            </h3>
            {stats?.topEarnersLast30d?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2">User</th>
                      <th className="text-left py-2">Email</th>
                      <th className="text-right py-2">Reviews</th>
                      <th className="text-right py-2">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topEarnersLast30d.map((earner) => (
                      <tr
                        key={earner.userId}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSearchUserId(earner.userId);
                          setSubmittedUserId(earner.userId);
                        }}
                      >
                        <td className="py-3 text-gray-900">
                          {earner.firstName || earner.lastName
                            ? `${earner.firstName ?? ''} ${earner.lastName ?? ''}`.trim()
                            : earner.userId.slice(0, 8) + '…'}
                        </td>
                        <td className="py-3 text-gray-600">
                          {earner.email ?? '—'}
                        </td>
                        <td className="py-3 text-right text-gray-700">
                          {earner.reviewsCount}
                        </td>
                        <td className="py-3 text-right font-semibold text-ruby-700">
                          +{earner.totalEarned.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : statsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2" role="status">
                <div
                  className="w-3.5 h-3.5 border-2 border-gray-300 border-t-ruby-500 rounded-full animate-spin"
                  aria-hidden
                />
                <span>Loading top earners…</span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No reward credits in the last 30 days. Top earners will appear
                here once customers start earning points.
              </p>
            )}
          </div>

          {/* User lookup */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              User lookup
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter user _id (24-char Mongo ObjectId)"
                aria-label="User ID to look up"
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500"
              />
              <button
                onClick={handleSearch}
                disabled={!searchUserId.trim()}
                aria-label="Look up user rewards profile"
                className="px-4 py-2 bg-ruby-500 text-white text-sm font-semibold rounded-md hover:bg-ruby-600 disabled:opacity-60 flex items-center gap-1"
              >
                <Search className="w-4 h-4" aria-hidden /> Look up
              </button>
            </div>

            {submittedUserId && (
              <div className="mt-4">
                {userLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-500" role="status" aria-live="polite">
                    <div
                      className="w-3.5 h-3.5 border-2 border-gray-300 border-t-ruby-500 rounded-full animate-spin"
                      aria-hidden
                    />
                    <span>Loading user…</span>
                  </div>
                )}
                {!!userError && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
                    <div className="flex-1">
                      <div className="font-semibold">Could not load user</div>
                      <div className="mt-0.5">
                        {(userError as any)?.message ||
                          (userError as any)?.response?.data?.error?.message ||
                          (userError as any)?.response?.data?.message ||
                          'Verify the ObjectId and try again.'}
                      </div>
                    </div>
                  </div>
                )}
                {userData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <StatCard
                        title="Balance"
                        value={userData.status.points.toLocaleString()}
                        trend={`₦${userData.status.cashValueNgn.toLocaleString()}`}
                        icon={Gift}
                      />
                      <StatCard
                        title="Lifetime earned"
                        value={userData.status.lifetimeEarned.toLocaleString()}
                        icon={TrendingDown}
                      />
                      <StatCard
                        title="Lifetime redeemed"
                        value={userData.status.lifetimeRedeemed.toLocaleString()}
                        icon={ArrowDownCircle}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setAdjustOpen(true)}
                        className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 text-sm font-semibold rounded-md hover:bg-amber-100 flex items-center gap-1"
                      >
                        <Edit3 className="w-4 h-4" /> Adjust points
                      </button>
                    </div>

                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">
                        Recent ledger (last 30 entries)
                      </h4>
                      {userData.ledger.items.length === 0 ? (
                        <p className="text-sm text-gray-500">No entries yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                              <tr>
                                <th className="text-left py-2">When</th>
                                <th className="text-left py-2">Type</th>
                                <th className="text-left py-2">Description</th>
                                <th className="text-right py-2">Δ pts</th>
                                <th className="text-right py-2">Balance after</th>
                              </tr>
                            </thead>
                            <tbody>
                              {userData.ledger.items.map((entry) => (
                                <tr
                                  key={entry._id}
                                  className="border-b border-gray-100"
                                >
                                  <td className="py-2 text-gray-600">
                                    {new Date(entry.createdAt).toLocaleString()}
                                  </td>
                                  <td className="py-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono">
                                      {entry.type}
                                    </span>
                                  </td>
                                  <td className="py-2 text-gray-700">
                                    {entry.description}
                                    {entry.reason && (
                                      <span className="block text-xs text-gray-500 italic">
                                        {entry.reason}
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    className={`py-2 text-right font-semibold ${
                                      entry.pointsDelta > 0
                                        ? 'text-emerald-700'
                                        : 'text-red-700'
                                    }`}
                                  >
                                    {entry.pointsDelta > 0 ? '+' : ''}
                                    {entry.pointsDelta}
                                  </td>
                                  <td className="py-2 text-right text-gray-600">
                                    {entry.balanceAfter.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        // ─── Quarantine tab ──────────────────────────────────────────────
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Quarantine queue
              </h3>
              <p className="text-xs text-gray-500">
                Credits flagged by fraud signals. User balance is unaffected
                until you Clear; the row is deleted on Reject.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-gray-500">
                Source
              </span>
              <select
                value={quarantineSourceFilter}
                onChange={(e) => setQuarantineSourceFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500"
              >
                <option value="">All sources</option>
                <option value="REVIEW">Review</option>
                <option value="REFERRAL">Referral</option>
                <option value="REEL">Reel</option>
                <option value="PAYMENT">Payment</option>
              </select>
            </div>
          </div>

          {quarantineLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center" role="status" aria-live="polite">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-ruby-500 rounded-full animate-spin" aria-hidden />
              <span>Loading queue…</span>
            </div>
          ) : !quarantineData?.items?.length ? (
            <div className="text-center py-10 px-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" aria-hidden />
              <p className="text-sm font-semibold text-gray-700">
                Queue is clean
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {quarantineSourceFilter
                  ? `No quarantined ${quarantineSourceFilter.toLowerCase()} credits awaiting triage.`
                  : 'No quarantined credits awaiting triage. New flagged credits will appear here automatically.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2">When</th>
                    <th className="text-left py-2">User</th>
                    <th className="text-left py-2">Source</th>
                    <th className="text-right py-2">Δ pts</th>
                    <th className="text-right py-2">Fraud score</th>
                    <th className="text-left py-2">Signals</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quarantineData.items.map((row) => {
                    const user =
                      typeof row.userId === 'object' && row.userId
                        ? row.userId
                        : null;
                    const userLabel = user
                      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
                        user.email ||
                        user._id?.slice(0, 8)
                      : typeof row.userId === 'string'
                        ? row.userId.slice(0, 8) + '…'
                        : '—';
                    return (
                      <tr
                        key={row._id}
                        className="border-b border-gray-100 align-top"
                      >
                        <td className="py-2 text-gray-600 whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 text-gray-900">
                          <div>{userLabel}</div>
                          {user?.email && (
                            <div className="text-xs text-gray-500">
                              {user.email}
                            </div>
                          )}
                        </td>
                        <td className="py-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono">
                            {row.sourceType ?? '—'}:{row.type}
                          </span>
                        </td>
                        <td className="py-2 text-right font-semibold text-emerald-700">
                          +{row.pointsDelta}
                        </td>
                        <td className="py-2 text-right text-gray-700">
                          {row.fraudScore !== undefined
                            ? row.fraudScore.toFixed(2)
                            : '—'}
                        </td>
                        <td className="py-2 text-xs text-gray-600">
                          {row.deviceFingerprintId && (
                            <div>
                              dev:{' '}
                              <span className="font-mono">
                                {row.deviceFingerprintId.slice(0, 8)}…
                              </span>
                            </div>
                          )}
                          {row.clientIp && <div>ip: {row.clientIp}</div>}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => doClear(row._id)}
                              disabled={clearLoading}
                              aria-label={`Clear and credit user ${userLabel} +${row.pointsDelta} points`}
                              title="Clear: credit the user with these points"
                              className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 disabled:opacity-60 flex items-center gap-1"
                            >
                              {clearLoading ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" aria-hidden />
                                  Clearing
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3" aria-hidden /> Clear
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setRejectEntryId(row._id);
                                setRejectReason('');
                                setRejectOpen(true);
                              }}
                              aria-label={`Reject and delete quarantined credit for ${userLabel}`}
                              title="Reject: delete the row, do not credit"
                              className="px-2 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" aria-hidden /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {quarantineData?.pagination &&
            quarantineData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Page {quarantineData.pagination.page} of{' '}
                  {quarantineData.pagination.totalPages} · total{' '}
                  {quarantineData.pagination.total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setQuarantinePage((p) => Math.max(1, p - 1))
                    }
                    disabled={quarantinePage <= 1}
                    className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded-md disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setQuarantinePage((p) =>
                        p < (quarantineData?.pagination.totalPages ?? 1)
                          ? p + 1
                          : p,
                      )
                    }
                    disabled={
                      quarantinePage >=
                      (quarantineData?.pagination.totalPages ?? 1)
                    }
                    className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Adjust modal */}
      <Modal
        isOpen={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Manual reward adjustment"
        subtitle="Use sparingly — every adjustment is audit-logged AND visible to the user in their reward ledger."
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Point delta (negative to debit)
            </label>
            <input
              type="number"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(e.target.value)}
              placeholder="e.g. 100 or -50"
              className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Reason (≥ 5 chars, visible to user)
            </label>
            <textarea
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Support ticket #1234 — compensating for clawback on legitimate review."
              rows={3}
              className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setAdjustOpen(false)}
              disabled={adjustLoading}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleAdjustSubmit}
              disabled={adjustLoading}
              aria-busy={adjustLoading}
              className="px-4 py-2 bg-ruby-500 text-white text-sm font-semibold rounded-md hover:bg-ruby-600 disabled:opacity-60 flex items-center gap-1.5"
            >
              {adjustLoading ? (
                <>
                  <div
                    className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                    aria-hidden
                  />
                  Saving…
                </>
              ) : (
                'Apply adjustment'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject quarantine modal */}
      <Modal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject quarantined credit"
        subtitle="This deletes the ledger row. The user is not credited. The audit log preserves the rejection trail."
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Reason (≥ 3 chars)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Confirmed sock-puppet ring — same device fingerprint across 8 accounts."
              rows={3}
              className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRejectOpen(false)}
              disabled={rejectLoading}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!rejectEntryId) return;
                if (rejectReason.trim().length < 3) {
                  toast.error('Reason required (min 3 chars).');
                  return;
                }
                doReject({
                  entryId: rejectEntryId,
                  reason: rejectReason.trim(),
                });
              }}
              disabled={rejectLoading}
              aria-busy={rejectLoading}
              className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-md hover:bg-red-600 disabled:opacity-60 flex items-center gap-1.5"
            >
              {rejectLoading ? (
                <>
                  <div
                    className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                    aria-hidden
                  />
                  Rejecting…
                </>
              ) : (
                'Reject + delete'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
