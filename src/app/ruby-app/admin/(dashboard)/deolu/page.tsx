'use client';

import { useEffect, useState } from 'react';
import {
  Activity, MessageSquare, Users, Clock, DollarSign,
  AlertTriangle, CheckCircle2, RefreshCw, Zap, TrendingUp, Lock,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { DeoluHealthMetrics } from '@/lib/types';

/**
 * Deolu health dashboard. Polls `/admin/ask-ruby/health` every 30s
 * (the API path stays under `ask-ruby` for backward compat with already-
 * deployed admin clients; the brand was renamed in Phase 12a). Surface
 * the three things ops cares about:
 *
 *   1. Money: cost today, MTD, % of budget cap, circuit-breaker state.
 *   2. Quality: latency, success rate, error rate.
 *   3. Volume: DAU, conversations, messages, top friction signals.
 *
 * Layout is one row of stat cards + two larger cards (cost + quality)
 * underneath. No charts in V1 — the dashboard's job is "are we OK right
 * now" not "what was the trend last week". Time-series visualisations
 * land when we wire this into Grafana.
 */
export default function DeoluHealthPage() {
  const [data, setData] = useState<DeoluHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (h: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.deolu.health(h);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError('Failed to load metrics');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(hours);
    const interval = setInterval(() => fetchData(hours), 30_000);
    return () => clearInterval(interval);
  }, [hours]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity size={24} /> Deolu health
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Live metrics for the conversational concierge. Refreshes every 30s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          >
            <option value={1}>Last hour</option>
            <option value={24}>Last 24h</option>
            <option value={168}>Last 7 days</option>
            <option value={720}>Last 30 days</option>
          </select>
          <button
            onClick={() => fetchData(hours)}
            disabled={loading}
            className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {!data && !error && (
        <div className="p-12 text-center text-gray-500">Loading metrics…</div>
      )}

      {data && (
        <>
          {/* Top stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="DAU today"
              value={data.usage.dauToday.toLocaleString()}
            />
            <StatCard
              icon={MessageSquare}
              label="Conversations today"
              value={data.usage.conversationsToday.toLocaleString()}
            />
            <StatCard
              icon={TrendingUp}
              label="Avg turns / convo"
              value={data.usage.avgTurnsPerConvo.toFixed(1)}
            />
            <StatCard
              icon={Lock}
              label="Hit daily cap"
              value={data.usage.usersAtCapToday.toLocaleString()}
              subtext={`of ${data.usage.freeTierDailyLimit}/day free`}
            />
          </div>

          {/* Cost card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign size={18} /> Cost
              </h2>
              <CircuitBreakerPill state={data.cost.circuitBreakerState} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Today
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  ₦{data.cost.todayNgn.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Month to date
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  ₦{data.cost.monthToDateNgn.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Monthly budget
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  ₦{data.cost.monthlyBudgetNgn.toLocaleString()}
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      data.cost.circuitBreakerState === 'HALTED'
                        ? 'bg-red-500'
                        : data.cost.circuitBreakerState === 'WARNING'
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, data.cost.budgetUsedPct)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {data.cost.budgetUsedPct}% used
                </div>
              </div>
            </div>
          </div>

          {/* Quality + Rollout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Zap size={18} /> Quality
              </h2>
              <div className="space-y-3">
                <QualityRow
                  label="Success rate"
                  value={`${data.quality.successRatePct}%`}
                  hint={`${data.quality.successfulConversations} of ${data.usage.conversationsInWindow}`}
                  good={data.quality.successRatePct >= 80}
                />
                <QualityRow
                  label="Avg latency"
                  value={`${data.quality.avgLatencyMs.toLocaleString()}ms`}
                  hint={`p100: ${data.quality.maxLatencyMs.toLocaleString()}ms`}
                  good={data.quality.avgLatencyMs < 3000}
                />
                <QualityRow
                  label="Assistant messages"
                  value={data.quality.totalAssistantMessages.toLocaleString()}
                  hint={`in the last ${data.window.hours}h`}
                />
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Activity size={18} /> Rollout
              </h2>
              <div className="text-5xl font-bold text-gray-900 mb-2">
                {data.rollout.percent}%
              </div>
              <div className="text-sm text-gray-600 mb-4">
                of eligible users see the Deolu button on home.
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                Set with{' '}
                <code className="text-gray-700">DEOLU_ROLLOUT_PERCENT</code>{' '}
                env var (legacy fallback: <code className="text-gray-700">ASK_RUBY_ROLLOUT_PERCENT</code>).
                Recommended ramp: 0 → 5% → 25% → 100% over ~7 days, watching
                this dashboard at each step.
              </div>
            </div>
          </div>

          {/* Phase 13.9 — quality-gate panel */}
          {data.qualityGates && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Lock size={18} /> Quality gates (Voice Filter + Hallucination Guard)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QualityRow
                  label="Voice Filter pass rate"
                  value={`${data.qualityGates.voiceFilter.firstTryPassRatePct}%`}
                  hint={`${data.qualityGates.voiceFilter.totalAssistantMessages} messages scanned`}
                  good={data.qualityGates.voiceFilter.firstTryPassRatePct >= 90}
                />
                <QualityRow
                  label="Voice Filter rewrites"
                  value={String(data.qualityGates.voiceFilter.rewriteCount)}
                  hint="Claude needed a meta-prompt rewrite"
                />
                <QualityRow
                  label="Scripted fallbacks"
                  value={String(data.qualityGates.voiceFilter.scriptedFallbackCount)}
                  hint="2 retries exhausted; template used"
                  good={data.qualityGates.voiceFilter.scriptedFallbackCount === 0}
                />
                <QualityRow
                  label="Hallucination flags"
                  value={String(data.qualityGates.hallucinationGuard.flaggedAssistantMessages)}
                  hint="Merchant names not in tool results"
                  good={data.qualityGates.hallucinationGuard.flaggedAssistantMessages === 0}
                />
              </div>
              {Object.keys(data.qualityGates.fallbackTemplatesByName).length > 0 && (
                <div className="mt-4 text-xs text-gray-600">
                  <div className="font-semibold mb-1 uppercase tracking-wider text-[10px] text-gray-500">
                    Fallback templates used
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.qualityGates.fallbackTemplatesByName).map(
                      ([name, count]) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 border border-gray-200"
                        >
                          <code className="text-gray-700">{name}</code>
                          <span className="text-gray-500">×{count}</span>
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase 13.9 — Atlas Vector Search index status */}
          {data.atlasVectorIndex && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Activity size={18} /> Atlas Vector Search index
              </h2>
              {data.atlasVectorIndex.error ? (
                <div className="text-sm text-red-700 bg-red-50 p-3 rounded">
                  Error: {data.atlasVectorIndex.error}
                </div>
              ) : data.atlasVectorIndex.present ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <QualityRow
                    label="Name"
                    value={data.atlasVectorIndex.name ?? '—'}
                  />
                  <QualityRow
                    label="Status"
                    value={data.atlasVectorIndex.status ?? '—'}
                    good={data.atlasVectorIndex.queryable === true}
                  />
                  <QualityRow
                    label="Queryable"
                    value={data.atlasVectorIndex.queryable ? 'Yes' : 'No'}
                    good={data.atlasVectorIndex.queryable === true}
                  />
                </div>
              ) : (
                <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded">
                  ⚠ Vector index <code>{data.atlasVectorIndex.name}</code> is
                  not present. Deolu searches will return empty. Set{' '}
                  <code>DEOLU_AUTO_BOOTSTRAP_INDEXES=true</code> and restart
                  to auto-create, or create it manually in Atlas.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: any;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <Icon size={16} className="text-gray-400" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
}

function QualityRow({
  label,
  value,
  hint,
  good,
}: {
  label: string;
  value: string;
  hint?: string;
  good?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm text-gray-700">{label}</div>
        {hint && <div className="text-xs text-gray-500">{hint}</div>}
      </div>
      <div
        className={`text-lg font-semibold ${
          good === true
            ? 'text-green-600'
            : good === false
            ? 'text-amber-600'
            : 'text-gray-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function CircuitBreakerPill({
  state,
}: {
  state: 'HEALTHY' | 'WARNING' | 'HALTED';
}) {
  const config = {
    HEALTHY: { icon: CheckCircle2, bg: 'bg-green-100', text: 'text-green-700', label: 'Healthy' },
    WARNING: { icon: AlertTriangle, bg: 'bg-amber-100', text: 'text-amber-700', label: 'Approaching cap' },
    HALTED: { icon: AlertTriangle, bg: 'bg-red-100', text: 'text-red-700', label: 'Halted — budget exceeded' },
  }[state];
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${config.bg}`}>
      <Icon size={14} className={config.text} />
      <span className={`text-xs font-semibold ${config.text}`}>{config.label}</span>
    </div>
  );
}
