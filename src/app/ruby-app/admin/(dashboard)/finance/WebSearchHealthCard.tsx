'use client';

/**
 * Web Search provider health card.
 *
 * Surfaces the operational health of the Google Custom Search proxy
 * powering the customer search tab's "Web results" section. The
 * provider charges $5 per 1,000 cache-miss queries past the 100/day
 * free tier, so ops needs at-a-glance visibility into:
 *
 *   1. Is the provider configured at all? (env vars present)
 *   2. How many cached rows are alive right now? (cache effectiveness)
 *   3. Last 7d hit rate? (high = cheap, low = burning real money)
 *   4. Can we run a test search right now? (canary)
 *
 * Mirrors the layout of `DeoluHealthCard` and `MessagingHealthCard` so
 * the Finance page reads as a single coherent "infrastructure status"
 * row. Banners spell out the action to take so a support engineer
 * doesn't need to open the backend code to triage misconfig.
 */
import { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Database,
  PieChart,
  Play,
} from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';

export function WebSearchHealthCard() {
  const { data: health, refetch, isLoading } = useApi(() =>
    api.webSearch.getHealth(),
  );

  // Live test-search panel — proves the provider works end-to-end
  // from the admin's vantage point. Reuses the same code path as the
  // customer endpoint so the test is meaningful (hits cache if the
  // same query was searched in the last 24h, otherwise burns one
  // real Google query).
  const [testQ, setTestQ] = useState('jollof rice lagos');
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    count?: number;
    cached?: boolean;
    error?: string;
  } | null>(null);

  const runTest = async () => {
    if (!testQ.trim()) return;
    setTestRunning(true);
    setTestResult(null);
    try {
      const res = await api.webSearch.testSearch(testQ.trim());
      // `request` returns the standardized ApiResponse envelope; the
      // actual payload lives on `.data`.
      const payload = res.data;
      setTestResult({
        ok: true,
        count: payload?.results?.length ?? 0,
        cached: payload?.cached ?? false,
      });
    } catch (err) {
      setTestResult({
        ok: false,
        error: (err as Error).message || 'Unknown error',
      });
    } finally {
      setTestRunning(false);
    }
  };

  // Status synthesis — pessimistic. If provider isn't configured at
  // all, that's a hard red. Otherwise green by default; cache stats
  // are informational, not pass/fail.
  const configured = !!health?.configured;
  const statusColor = !health ? 'gray' : configured ? 'green' : 'red';
  const StatusIcon =
    statusColor === 'green'
      ? CheckCircle2
      : statusColor === 'gray'
        ? Loader2
        : AlertTriangle;
  const statusLabel = !health
    ? 'Loading'
    : configured
      ? `Healthy · ${health.activeProvider || 'GOOGLE'}`
      : 'Not configured';

  // Cache hit rate — totalHits is the sum of `hitCount` across alive
  // rows in the last 7d; uniqueQueries is the row count. So the ratio
  // is hits per unique query — > 1 means at least some queries are
  // being repeated within the 24h TTL window. Higher is better.
  const totalHits = health?.last7d?.totalHits ?? 0;
  const uniqueQueries = health?.last7d?.uniqueQueries ?? 0;
  const hitsPerQuery = uniqueQueries > 0 ? totalHits / uniqueQueries : 0;
  // Rough cost saved estimate — every cache hit beyond the first per
  // row is a $5/1000 query we didn't pay. uniqueQueries=N means we
  // paid for N. totalHits-N is the saved count.
  const savedQueries = Math.max(0, totalHits - uniqueQueries);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Search size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Web Search (Google CSE)
            </h3>
            <p className="text-xs text-gray-500">
              Customer search tab → Web results section · 24h Mongo cache
            </p>
          </div>
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          {isLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Status
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <StatusIcon
              size={14}
              className={
                statusColor === 'green'
                  ? 'text-green-600'
                  : statusColor === 'red'
                    ? 'text-red-600'
                    : 'text-gray-400'
              }
            />
            <p className="text-sm font-bold text-gray-900">{statusLabel}</p>
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Database size={11} /> Cache rows
          </p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {health ? health.cacheRowsAlive.toLocaleString() : '—'}
          </p>
          <p className="text-[11px] text-gray-400">alive · 24h TTL</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <PieChart size={11} /> Hits / query
          </p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {health ? hitsPerQuery.toFixed(2) : '—'}
          </p>
          <p className="text-[11px] text-gray-400">last 7d</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Queries saved
          </p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {health ? savedQueries.toLocaleString() : '—'}
          </p>
          <p className="text-[11px] text-gray-400">cache hits / 7d</p>
        </div>
      </div>

      {/* Misconfig banner — first priority. If the env vars aren't set
          the customer mobile search tab will silently render zero web
          results forever; this banner tells ops exactly what to do. */}
      {health && !configured && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 mb-3">
          <p className="text-xs text-red-900">
            <strong>Web search is not configured.</strong> Set{' '}
            <code className="bg-red-100 px-1 rounded">GOOGLE_CSE_API_KEY</code>{' '}
            and{' '}
            <code className="bg-red-100 px-1 rounded">
              GOOGLE_CSE_ENGINE_ID
            </code>{' '}
            in the backend environment. Until this is fixed, the
            customer search tab&apos;s &ldquo;Web results&rdquo; section
            renders nothing. See <code className="bg-red-100 px-1 rounded">.env.example</code> for the 5-minute provisioning steps.
          </p>
        </div>
      )}

      {/* Test-search panel — proves end-to-end. Reuses the customer
          code path (cache → provider → cache write) so a successful
          test guarantees real searches will work too. */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Test search
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={testQ}
            onChange={(e) => setTestQ(e.target.value)}
            placeholder="Try a query"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
            disabled={!configured || testRunning}
          />
          <button
            onClick={runTest}
            disabled={!configured || testRunning || !testQ.trim()}
            className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={12} />
            {testRunning ? 'Running…' : 'Run'}
          </button>
        </div>
        {testResult && (
          <p
            className={`text-xs mt-2 ${
              testResult.ok ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {testResult.ok
              ? `${testResult.count} result${testResult.count === 1 ? '' : 's'} · ${
                  testResult.cached ? 'served from cache' : 'fresh from Google'
                }`
              : `Error: ${testResult.error}`}
          </p>
        )}
      </div>
    </div>
  );
}
