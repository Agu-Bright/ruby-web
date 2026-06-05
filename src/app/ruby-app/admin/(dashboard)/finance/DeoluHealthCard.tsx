'use client';

/**
 * P77 (f) — Deolu search-pipeline health card.
 *
 * Surfaces the three things that produce the "Deolu only returns the
 * canned 'no merchants' message" symptom even when businesses exist:
 *
 *   1. Atlas Vector Search index missing or misconfigured (silent zero
 *      results from $vectorSearch).
 *   2. LIVE businesses missing the `embedding` field (nothing for the
 *      vector index to match against).
 *   3. Canary query that's expected to return at least one hit returning
 *      zero — proves the pipeline is broken end-to-end even if the
 *      index itself looks healthy.
 *
 * Mirrors the SmsHealthCard layout from P70 so ops sees a consistent
 * "infrastructure status at a glance" row on the Finance page. Banners
 * spell out the action to take (run reindex, repair the index) so a
 * support engineer doesn't need to open the backend code to triage.
 */
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Database,
  Activity,
  PieChart,
} from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import type { DeoluHealthMetrics } from '@/lib/types';

export function DeoluHealthCard() {
  const { data: health, refetch, isLoading } = useApi<DeoluHealthMetrics>(() =>
    api.deolu.health(24),
  );

  const index = health?.atlasVectorIndex;
  const search = health?.searchHealth;
  const coverage = search?.businesses?.embeddingCoveragePct ?? 0;
  const totalLive = search?.businesses?.totalLive ?? 0;
  const missing = search?.businesses?.missingEmbedding ?? 0;
  const sampleHits = search?.sampleQuery?.hits ?? 0;
  const sampleErr = search?.sampleQuery?.error;
  const sampleLatency = search?.sampleQuery?.latencyMs;

  // Status synthesis — pessimistic by design. Any of (index missing,
  // coverage <95%, sample returned zero, sample errored) flips us off
  // the "healthy" path. Ops should treat any non-green state as needing
  // attention before a customer hits the canned fallback.
  const indexHealthy = index?.present && index?.queryable !== false;
  const dataHealthy = coverage >= 95 && totalLive > 0;
  const sampleHealthy = !sampleErr && sampleHits > 0;
  const allHealthy = indexHealthy && dataHealthy && sampleHealthy;
  const statusColor = !health
    ? 'gray'
    : allHealthy
      ? 'green'
      : !indexHealthy || !!sampleErr
        ? 'red'
        : 'amber';
  const StatusIcon =
    statusColor === 'green'
      ? CheckCircle2
      : statusColor === 'gray'
        ? Loader2
        : AlertTriangle;

  const statusLabel = !health
    ? 'Loading'
    : allHealthy
      ? 'Healthy'
      : !indexHealthy
        ? 'Index missing'
        : !!sampleErr
          ? 'Search erroring'
          : coverage < 95
            ? `Embeddings ${coverage}%`
            : sampleHits === 0
              ? 'Canary 0 hits'
              : 'Degraded';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <Bot size={18} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Deolu Search Pipeline
            </h3>
            <p className="text-xs text-gray-500">
              Atlas vector index · embedding coverage · canary query
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
                  : statusColor === 'amber'
                    ? 'text-amber-600'
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
            <Database size={11} /> Atlas index
          </p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {!index
              ? '—'
              : !index.present
                ? 'Missing'
                : index.queryable === false
                  ? `Building${index.status ? ` · ${index.status}` : ''}`
                  : 'Ready'}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <PieChart size={11} /> Embeddings
          </p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {search ? `${coverage}%` : '—'}
          </p>
          {search && (
            <p className="text-[11px] text-gray-400">
              {search.businesses.withEmbedding}/{totalLive} LIVE
            </p>
          )}
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Activity size={11} /> Canary
          </p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {sampleErr
              ? 'Error'
              : search?.sampleQuery
                ? `${sampleHits} hit${sampleHits === 1 ? '' : 's'}`
                : '—'}
          </p>
          {sampleLatency != null && (
            <p className="text-[11px] text-gray-400">{sampleLatency}ms</p>
          )}
        </div>
      </div>

      {/* Action banners — each spells out the next step a support
          engineer would take so they don't have to consult the runbook.
          Order matches the diagnostic flow: index first (downstream
          measurements are meaningless without it), then data, then
          end-to-end. */}
      {index && !index.present && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 mb-3">
          <p className="text-xs text-red-900">
            <strong>Atlas Vector Search index is missing.</strong> The
            backend tries to bootstrap{' '}
            <code className="bg-red-100 px-1 rounded">{index.name}</code> on
            boot — if it&apos;s still missing here, your cluster either
            doesn&apos;t have Search enabled or the bootstrap was disabled
            via{' '}
            <code className="bg-red-100 px-1 rounded">
              DEOLU_AUTO_BOOTSTRAP_INDEXES=false
            </code>
            . Until this is fixed, every Deolu search returns zero
            results.
          </p>
        </div>
      )}
      {index?.present && index.queryable === false && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 mb-3">
          <p className="text-xs text-amber-900">
            <strong>Index is building.</strong> Atlas typically takes 1–3
            minutes after creation to make the index queryable. Recheck
            after a few minutes.
          </p>
        </div>
      )}
      {search && totalLive > 0 && coverage < 95 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 mb-3">
          <p className="text-xs text-amber-900">
            <strong>{missing.toLocaleString()} LIVE businesses</strong> are
            missing their <code className="bg-amber-100 px-1 rounded">
              embedding
            </code>{' '}
            field — Deolu can&apos;t reach them via vector search. Run{' '}
            <code className="bg-amber-100 px-1 rounded">
              POST /admin/ask-ruby/reindex
            </code>{' '}
            to backfill, then refresh this card.
          </p>
        </div>
      )}
      {sampleErr && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 mb-3">
          <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider mb-1">
            Canary query error
          </p>
          <p className="text-xs text-red-800 font-mono break-all">
            {sampleErr}
          </p>
        </div>
      )}
      {search && !sampleErr && sampleHits === 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 mb-3">
          <p className="text-xs text-amber-900">
            <strong>Canary query returned zero hits.</strong> Even with the
            index present and embeddings populated, &ldquo;
            {search.sampleQuery?.query}&rdquo; matched nothing — check
            whether there&apos;s at least one LIVE business in Lagos with
            an embedding before opening an engineering ticket.
          </p>
        </div>
      )}
    </div>
  );
}
