'use client';

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, StatCard } from '@/components/ui';

/**
 * P121 — Admin moderation queue (App Store Guideline 1.2 SLA: act on
 * every report within 24 hours).
 *
 * Queue sort: PENDING reports, oldest-first, so the row at the top is
 * always the one nearest to breaching the 24-hour deadline.
 *
 * Resolutions:
 *   - REMOVE  : hide the offending content
 *   - SUSPEND : hide content + flip the author's `isActive` to false
 *   - DISMISS : record no-action with an optional admin note
 *
 * Side effects (content removal, user suspension) happen polymorphically
 * on the backend — this page just drives the UX.
 */

type Tab = 'PENDING' | 'RESOLVED' | 'ALL';

type ResolutionChoice =
  | 'RESOLVED_CONTENT_REMOVED'
  | 'RESOLVED_USER_SUSPENDED'
  | 'DISMISSED';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  RESOLVED_CONTENT_REMOVED: 'bg-emerald-100 text-emerald-800',
  RESOLVED_USER_SUSPENDED: 'bg-red-100 text-red-800',
  DISMISSED: 'bg-gray-100 text-gray-700',
};

const REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Harassment',
  HATE_SPEECH: 'Hate speech',
  SEXUAL_CONTENT: 'Sexual / explicit',
  VIOLENCE: 'Violence',
  MISINFORMATION: 'Misinformation',
  OTHER: 'Other',
};

function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleString();
}

function getReporterName(r: any): string {
  const rep = r?.reporterId;
  if (!rep) return 'Unknown reporter';
  if (typeof rep === 'string') return rep;
  return [rep.firstName, rep.lastName].filter(Boolean).join(' ') || rep.email || 'User';
}

function getOwnerName(r: any): string {
  const owner = r?.contentOwnerId;
  if (!owner) return '—';
  if (typeof owner === 'string') return owner;
  return [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email || '—';
}

export default function ModerationPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const [resolving, setResolving] = useState<{
    reportId: string;
    resolution: ResolutionChoice;
  } | null>(null);
  const [notes, setNotes] = useState('');

  // Stats (light card row at the top).
  const { data: stats, refetch: refetchStats } = useApi<any>(
    () => api.moderation.stats(),
    [],
  );

  const params = useMemo(() => {
    if (tab === 'PENDING') return { status: 'PENDING', limit: 50 };
    if (tab === 'RESOLVED') return { status: 'RESOLVED_CONTENT_REMOVED', limit: 50 };
    return { limit: 50 };
  }, [tab]);

  const { data: reports, isLoading, refetch } = useApi<any[]>(
    () => api.moderation.listReports(params),
    [params],
  );

  const resolveMutation = useMutation(
    (vars: { reportId: string; body: { resolution: ResolutionChoice; adminNotes?: string } }) =>
      api.moderation.resolveReport(vars.reportId, vars.body),
    {
      onSuccess: () => {
        setResolving(null);
        setNotes('');
        refetch();
        refetchStats();
      },
    },
  );

  const confirmResolve = useCallback(() => {
    if (!resolving) return;
    resolveMutation.mutate({
      reportId: resolving.reportId,
      body: {
        resolution: resolving.resolution,
        adminNotes: notes.trim() || undefined,
      },
    });
  }, [resolving, notes, resolveMutation]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation queue"
        description="Reports of objectionable content. App Store Guideline 1.2 requires action within 24 hours."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Pending" value={stats?.pending ?? 0} icon={ShieldAlert} />
        <StatCard
          title="Resolved today"
          value={stats?.resolvedToday ?? 0}
          icon={ShieldCheck}
        />
        <StatCard
          title="Oldest pending"
          value={
            stats?.oldestAgeHours != null
              ? `${stats.oldestAgeHours}h ago`
              : '—'
          }
          icon={Clock}
        />
      </div>

      {/* Tabs */}
      <div className="card p-2">
        <div className="flex gap-1">
          {(['PENDING', 'RESOLVED', 'ALL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                tab === t
                  ? 'bg-ruby-50 text-ruby-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'PENDING' ? 'Pending' : t === 'RESOLVED' ? 'Resolved' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : !reports || reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No reports in this view.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reports.map((r: any) => {
              const statusClass =
                STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-700';
              const isPending = r.status === 'PENDING';
              return (
                <div key={r._id} className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {r.contentType}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusClass}`}>
                          {r.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                          {REASON_LABELS[r.reason] || r.reason}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{getReporterName(r)}</span>
                        {' reported content by '}
                        <span className="font-medium">{getOwnerName(r)}</span>
                      </p>
                      {r.details ? (
                        <p className="text-sm text-gray-600 italic">
                          “{r.details}”
                        </p>
                      ) : null}
                      <p className="text-xs text-gray-500">
                        Filed {fmtDate(r.createdAt)}
                        {r.resolvedAt ? ` · Resolved ${fmtDate(r.resolvedAt)}` : null}
                      </p>
                      {r.adminNotes ? (
                        <p className="text-xs text-gray-700 bg-gray-50 rounded p-2">
                          Admin notes: {r.adminNotes}
                        </p>
                      ) : null}
                    </div>

                    {isPending ? (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className="px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() =>
                            setResolving({
                              reportId: r._id,
                              resolution: 'RESOLVED_CONTENT_REMOVED',
                            })
                          }
                        >
                          Remove content
                        </button>
                        <button
                          className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
                          onClick={() =>
                            setResolving({
                              reportId: r._id,
                              resolution: 'RESOLVED_USER_SUSPENDED',
                            })
                          }
                        >
                          Suspend user
                        </button>
                        <button
                          className="px-3 py-1.5 text-sm rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                          onClick={() =>
                            setResolving({
                              reportId: r._id,
                              resolution: 'DISMISSED',
                            })
                          }
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolution confirmation modal */}
      {resolving ? (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => !resolveMutation.isLoading && setResolving(null)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-600" size={20} />
              <h3 className="text-lg font-semibold">
                {resolving.resolution === 'RESOLVED_CONTENT_REMOVED'
                  ? 'Remove this content?'
                  : resolving.resolution === 'RESOLVED_USER_SUSPENDED'
                    ? 'Suspend this user?'
                    : 'Dismiss this report?'}
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              {resolving.resolution === 'RESOLVED_CONTENT_REMOVED'
                ? 'The offending content will be hidden from all customers and the reviewer/author will not be notified directly.'
                : resolving.resolution === 'RESOLVED_USER_SUSPENDED'
                  ? "The user's account will be deactivated AND their content removed. They will not be able to log in."
                  : 'This report will be marked as no action required.'}
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional admin notes (audit trail)"
              rows={3}
              className="input w-full"
              maxLength={500}
            />
            <div className="flex gap-2 justify-end">
              <button
                className="btn-secondary"
                onClick={() => setResolving(null)}
                disabled={resolveMutation.isLoading}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={confirmResolve}
                disabled={resolveMutation.isLoading}
              >
                {resolveMutation.isLoading ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
