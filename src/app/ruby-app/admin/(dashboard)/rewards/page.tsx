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
} from 'lucide-react';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, StatCard, Modal } from '@/components/ui';
import { toast } from 'sonner';

/**
 * Phase 59 — Review Rewards Engine admin dashboard.
 *
 * Top: 4 stat tiles
 *   • Total points outstanding (the platform's open reward liability)
 *   • ₦ liability if every user redeemed today (= points × conversion)
 *   • Users with positive balance
 *   • Redemptions in last 30 days (count + ₦ paid out)
 *
 * Middle: top earners last 30d (the 5 users who earned the most by
 * publishing reviews — useful for spotting unusual concentration).
 *
 * Bottom: user lookup by ID + manual point-adjustment dialog. Every
 * adjustment is audit-logged + appears in the user's reward ledger.
 */
export default function AdminRewardsPage() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } =
    useApi(() => api.rewards.stats(), []);

  const [searchUserId, setSearchUserId] = useState('');
  const [submittedUserId, setSubmittedUserId] = useState<string | null>(null);

  // Manual state instead of useApi — useApi requires a stable function
  // signature whose Promise type matches the generic; the conditional
  // "no user submitted yet" branch made T widen to {}. State + effect
  // avoids the inference issue and stays equally readable.
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
      onError: (err: any) => {
        toast.error(
          err?.response?.data?.message || err?.message || 'Adjustment failed',
        );
      },
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
        description="Customer reward points earned from published reviews. 1 pt = ₦1; cash-out unlocks at 500 pts. Every credit, clawback, redemption, and admin adjustment is audit-logged."
      />

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
        ) : (
          <p className="text-sm text-gray-500">
            No reward credits in the last 30 days.
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
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-ruby-500 text-white text-sm font-semibold rounded-md hover:bg-ruby-600 flex items-center gap-1"
          >
            <Search className="w-4 h-4" /> Look up
          </button>
        </div>

        {submittedUserId && (
          <div className="mt-4">
            {userLoading && (
              <p className="text-sm text-gray-500">Loading user…</p>
            )}
            {!!userError && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {(userError as any)?.response?.data?.message ||
                    (userError as any)?.message ||
                    'Could not load user.'}
                </span>
              </div>
            )}
            {userData && (
              <div className="space-y-4">
                {/* Status card */}
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

                {/* Recent ledger */}
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
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleAdjustSubmit}
              disabled={adjustLoading}
              className="px-4 py-2 bg-ruby-500 text-white text-sm font-semibold rounded-md hover:bg-ruby-600 disabled:opacity-60"
            >
              {adjustLoading ? 'Saving…' : 'Apply adjustment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
