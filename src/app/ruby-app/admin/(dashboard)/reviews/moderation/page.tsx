'use client';

import { useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, ShieldOff, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, Modal, type Column } from '@/components/ui';
import { formatDate } from '@/lib/utils';

/**
 * P51 (PRD §7) — admin moderation queue. Lists reviews routed to
 * QUARANTINED or AUTO_REJECTED by the FraudScoringService, ordered
 * oldest-first so genuine quarantines clear before they age out.
 *
 * Two terminal actions:
 *   • Clear  → flips state to CLEARED, rejoins the rating pool
 *   • Remove → flips state to REMOVED (requires reason ≥ 5 chars)
 *
 * Every transition writes an immutable audit-log entry (G4 wiring
 * on the backend service).
 */

type QueueState = 'QUARANTINED' | 'AUTO_REJECTED';

interface ModerationReview {
  _id: string;
  rating: number;
  text?: string;
  state: string;
  reviewerTier?: string;
  trustWeight?: number;
  fraudScore?: number;
  fraudFlags?: string[];
  submittedAt?: string;
  createdAt: string;
  businessId?: { _id: string; name?: string; slug?: string; logoUrl?: string };
  userId?: { _id: string; firstName?: string; lastName?: string; email?: string };
  signals?: Record<string, any>;
}

export default function ReviewModerationPage() {
  const [queueState, setQueueState] = useState<QueueState>('QUARANTINED');
  const [filters, setFilters] = useState<{ page: number; limit: number }>({
    page: 1,
    limit: 20,
  });
  const [selected, setSelected] = useState<ModerationReview | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ModerationReview | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [clearNotes, setClearNotes] = useState('');

  const { data: items, isLoading, refetch } = useApi<ModerationReview[]>(
    () =>
      api.reviews.listQuarantined({
        ...filters,
        state: queueState,
      }),
    [filters, queueState],
  );

  const { mutate: clearMutate, isLoading: clearing } = useMutation(
    (args: { id: string; notes?: string }) =>
      api.reviews.clear(args.id, args.notes),
  );
  const { mutate: removeMutate, isLoading: removing } = useMutation(
    (args: { id: string; reason: string }) =>
      api.reviews.remove(args.id, args.reason),
  );

  const handleClear = useCallback(async () => {
    if (!selected) return;
    const result = await clearMutate({
      id: selected._id,
      notes: clearNotes.trim() || undefined,
    });
    if (result) {
      toast.success('Review cleared — back in the public pool');
      setSelected(null);
      setClearNotes('');
      refetch();
    }
  }, [clearMutate, selected, clearNotes, refetch]);

  const handleRemove = useCallback(async () => {
    if (!removeTarget) return;
    if (removeReason.trim().length < 5) {
      toast.error('Reason must be at least 5 characters');
      return;
    }
    const result = await removeMutate({
      id: removeTarget._id,
      reason: removeReason.trim(),
    });
    if (result) {
      toast.success('Review removed');
      setRemoveTarget(null);
      setRemoveReason('');
      refetch();
    }
  }, [removeMutate, removeTarget, removeReason, refetch]);

  const columns: Column<ModerationReview>[] = [
    {
      key: 'business',
      header: 'Business',
      render: (r) => (
        <div>
          <p className="font-medium text-sm">{r.businessId?.name ?? '—'}</p>
          <p className="text-xs text-gray-500">{r.businessId?.slug}</p>
        </div>
      ),
    },
    {
      key: 'reviewer',
      header: 'Reviewer',
      render: (r) => (
        <div>
          <p className="text-sm">
            {r.userId?.firstName} {r.userId?.lastName}
          </p>
          <p className="text-xs text-gray-500">{r.userId?.email}</p>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-sm">
          {r.rating}★
        </span>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (r) => (
        <span className="text-xs font-medium text-gray-700">
          {r.reviewerTier ?? '—'}
          {r.trustWeight ? ` · ${r.trustWeight}×` : ''}
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (r) => (
        <span
          className={`text-xs font-semibold ${
            (r.fraudScore ?? 0) >= 0.9
              ? 'text-red-600'
              : (r.fraudScore ?? 0) >= 0.7
                ? 'text-amber-600'
                : 'text-gray-700'
          }`}
        >
          {r.fraudScore !== undefined ? r.fraudScore.toFixed(2) : '—'}
        </span>
      ),
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (r) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {(r.fraudFlags ?? []).slice(0, 3).map((f) => (
            <span
              key={f}
              className="inline-block px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded"
            >
              {f}
            </span>
          ))}
          {(r.fraudFlags ?? []).length > 3 && (
            <span className="text-[10px] text-gray-500">
              +{(r.fraudFlags ?? []).length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'submittedAt',
      header: 'Submitted',
      render: (r) => (
        <span className="text-xs text-gray-600">
          {formatDate(r.submittedAt ?? r.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelected(r)}
            className="p-1.5 rounded hover:bg-gray-100"
            title="View"
          >
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setSelected(r)}
            className="p-1.5 rounded hover:bg-green-50"
            title="Clear"
          >
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </button>
          <button
            onClick={() => {
              setRemoveTarget(r);
              setRemoveReason('');
            }}
            className="p-1.5 rounded hover:bg-red-50"
            title="Remove"
          >
            <ShieldOff className="w-4 h-4 text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Review moderation"
        description={`Reviews routed to ${queueState} by the fraud scorer. Clear or remove with reason.`}
      />

      {/* Queue toggle */}
      <div className="flex items-center gap-2 mb-4">
        {(['QUARANTINED', 'AUTO_REJECTED'] as QueueState[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setQueueState(s);
              setFilters({ page: 1, limit: 20 });
            }}
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${
              queueState === s
                ? 'bg-ruby-500 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {s === 'QUARANTINED' ? 'Quarantined' : 'Auto-rejected'}
          </button>
        ))}
      </div>

      <DataTable
        data={items ?? []}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={
          queueState === 'QUARANTINED'
            ? 'Nothing in quarantine.'
            : 'No auto-rejected reviews.'
        }
      />

      {/* Clear / Detail modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => {
          setSelected(null);
          setClearNotes('');
        }}
        title="Review details"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Business
                </span>
                <p className="font-medium">{selected.businessId?.name}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Reviewer
                </span>
                <p className="font-medium">
                  {selected.userId?.firstName} {selected.userId?.lastName}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Rating
                </span>
                <p className="font-medium">{selected.rating} stars</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Fraud score
                </span>
                <p className="font-medium">
                  {selected.fraudScore !== undefined
                    ? selected.fraudScore.toFixed(2)
                    : '—'}
                </p>
              </div>
            </div>

            {selected.text && (
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Text
                </span>
                <p className="text-sm bg-gray-50 rounded-md p-3 whitespace-pre-wrap">
                  {selected.text}
                </p>
              </div>
            )}

            {(selected.fraudFlags ?? []).length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Triggered rules
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selected.fraudFlags!.map((f) => (
                    <span
                      key={f}
                      className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin notes (optional)
              </label>
              <textarea
                value={clearNotes}
                onChange={(e) => setClearNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                placeholder="Why are you clearing this? (visible to other admins, not the user.)"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleClear}
                disabled={clearing}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {clearing ? 'Clearing...' : 'Clear review'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Remove confirmation */}
      <Modal
        isOpen={!!removeTarget}
        onClose={() => {
          setRemoveTarget(null);
          setRemoveReason('');
        }}
        title="Remove review"
        size="md"
      >
        {removeTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
              <div className="text-xs text-red-700">
                This removes the review from public view permanently. The
                row is preserved for audit but no longer counts toward the
                business' rating.
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (required, ≥ 5 chars)
              </label>
              <textarea
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                placeholder="e.g. Confirmed fake account, photo stolen from web, abusive content"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setRemoveTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removing || removeReason.trim().length < 5}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <ShieldOff className="w-4 h-4" />
                {removing ? 'Removing...' : 'Remove review'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
