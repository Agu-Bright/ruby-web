'use client';

import { useState } from 'react';
import {
  TrendingUp,
  Shield,
  ShieldOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, StatCard } from '@/components/ui';

/**
 * P51 (PRD §6) — trust dashboard. Operational visibility on the
 * fraud-scoring pipeline:
 *   • State distribution (PUBLISHED / QUARANTINED / AUTO_REJECTED / …)
 *   • Tier distribution (UNVERIFIED / VISITED / RUBY_INSIDER / …)
 *   • Avg + max fraud score, quarantine rate, auto-reject rate,
 *     verified-visit share
 *
 * Window switcher (7d / 30d / 90d) drives the `sinceDays` query.
 */

interface Dashboard {
  sinceDays: number;
  byState: Record<string, number>;
  byTier: Record<string, number>;
  fraudScoreStats: {
    avgScore: number;
    maxScore: number;
    quarantineRate: number;
    autoRejectRate: number;
    verifiedVisitRate: number;
  } | null;
}

const WINDOWS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const STATE_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-green-50 text-green-700 border-green-200',
  CLEARED: 'bg-blue-50 text-blue-700 border-blue-200',
  QUARANTINED: 'bg-amber-50 text-amber-700 border-amber-200',
  AUTO_REJECTED: 'bg-red-50 text-red-700 border-red-200',
  REMOVED: 'bg-gray-200 text-gray-700 border-gray-300',
  SUBMITTED: 'bg-purple-50 text-purple-700 border-purple-200',
  DRAFT: 'bg-gray-50 text-gray-600 border-gray-200',
};

const TIER_COLORS: Record<string, string> = {
  UNVERIFIED: 'bg-gray-100 text-gray-600',
  VISITED: 'bg-blue-50 text-blue-700',
  IDENTITY_VERIFIED: 'bg-green-50 text-green-700',
  RUBY_INSIDER: 'bg-purple-50 text-purple-700',
  TRANSACTION_VERIFIED: 'bg-amber-50 text-amber-700',
};

export default function TrustDashboardPage() {
  const [sinceDays, setSinceDays] = useState<number>(7);
  const { data, isLoading } = useApi<Dashboard>(
    () => api.reviews.trustDashboard(sinceDays),
    [sinceDays],
  );

  const stats = data?.fraudScoreStats;
  const stateTotal = data
    ? Object.values(data.byState).reduce((acc, n) => acc + n, 0)
    : 0;
  const tierTotal = data
    ? Object.values(data.byTier).reduce((acc, n) => acc + n, 0)
    : 0;

  return (
    <div>
      <PageHeader
        title="Trust dashboard"
        description="Operational visibility on review state machine + fraud scoring."
      />

      {/* Window selector */}
      <div className="flex items-center gap-2 mb-6">
        {WINDOWS.map((w) => (
          <button
            key={w.days}
            onClick={() => setSinceDays(w.days)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${
              sinceDays === w.days
                ? 'bg-ruby-500 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total reviews"
          value={isLoading ? '…' : stateTotal.toLocaleString()}
          icon={TrendingUp}
        />
        <StatCard
          title="Verified visits"
          value={
            stats ? `${Math.round(stats.verifiedVisitRate * 100)}%` : '—'
          }
          icon={CheckCircle2}
        />
        <StatCard
          title="Quarantine rate"
          value={
            stats ? `${Math.round(stats.quarantineRate * 100)}%` : '—'
          }
          icon={AlertCircle}
        />
        <StatCard
          title="Auto-reject rate"
          value={
            stats ? `${Math.round(stats.autoRejectRate * 100)}%` : '—'
          }
          icon={ShieldOff}
        />
      </div>

      {/* Fraud score line */}
      {stats && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Fraud score
          </h3>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Avg
              </p>
              <p className="text-2xl font-bold">{stats.avgScore?.toFixed(2) ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Max
              </p>
              <p className="text-2xl font-bold">{stats.maxScore?.toFixed(2) ?? '—'}</p>
            </div>
            <div className="text-xs text-gray-500 ml-auto max-w-xs">
              Thresholds: 0.00–0.69 → PUBLISHED · 0.70–0.89 → QUARANTINED
              · 0.90–1.00 → AUTO_REJECTED
            </div>
          </div>
        </div>
      )}

      {/* State distribution */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Reviews by state
          </h3>
          <Shield className="w-4 h-4 text-gray-400" />
        </div>
        {data && stateTotal > 0 ? (
          <div className="space-y-2">
            {Object.entries(data.byState)
              .sort(([, a], [, b]) => b - a)
              .map(([state, count]) => (
                <div key={state} className="flex items-center gap-3">
                  <span
                    className={`inline-block min-w-[150px] px-2 py-1 text-xs font-medium border rounded-md ${STATE_COLORS[state] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}
                  >
                    {state}
                  </span>
                  <div className="flex-1 bg-gray-100 h-2 rounded">
                    <div
                      className="h-2 rounded bg-ruby-400"
                      style={{
                        width: `${Math.round((count / stateTotal) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-12 text-right">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No data in this window.</p>
        )}
      </div>

      {/* Tier distribution */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Reviewer tier mix
        </h3>
        {data && tierTotal > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(data.byTier).map(([tier, count]) => (
              <div
                key={tier}
                className={`rounded-md p-3 ${TIER_COLORS[tier] ?? 'bg-gray-50 text-gray-700'}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  {tier.replace(/_/g, ' ')}
                </p>
                <p className="text-2xl font-bold mt-1">{count}</p>
                <p className="text-[10px] opacity-70 mt-0.5">
                  {Math.round((count / tierTotal) * 100)}% of reviews
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No data in this window.</p>
        )}
      </div>
    </div>
  );
}
