'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui';
import type { DisputeResolutionRequest, DisputeStatus } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DisputeResolutionRequest) => Promise<void> | void;
  /** For the refund-amount label; defaults to NGN. */
  currency?: string;
}

/**
 * Resolve / Escalate / Close form. Single modal handles all three
 * because the backend's resolve endpoint accepts any of these states —
 * the choice drives the toast copy and audit-log action only.
 *
 * Notes-required validation kept lightweight: a single trim check.
 * Refund amount is optional even when status is RESOLVED.
 */
export function ResolveDisputeModal({
  isOpen,
  onClose,
  onSubmit,
  currency = 'NGN',
}: Props) {
  const [action, setAction] = useState<DisputeStatus>('RESOLVED');
  const [notes, setNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form on open so re-opening doesn't show stale state.
  useEffect(() => {
    if (isOpen) {
      setAction('RESOLVED');
      setNotes('');
      setRefundAmount('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        status: action,
        resolution: notes.trim(),
        refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve Dispute"
      subtitle="Choose an outcome, document it, and optionally trigger a refund."
      size="md"
    >
      <div className="space-y-4">
        {/* Outcome banner — color-coded per choice */}
        <div
          className={`flex items-start gap-3 rounded-lg p-3 ${
            action === 'RESOLVED'
              ? 'bg-green-50 border border-green-200'
              : action === 'ESCALATED'
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-gray-50 border border-gray-200'
          }`}
        >
          <CheckCircle
            className={`w-4 h-4 mt-0.5 shrink-0 ${
              action === 'RESOLVED'
                ? 'text-green-600'
                : action === 'ESCALATED'
                  ? 'text-amber-600'
                  : 'text-gray-500'
            }`}
          />
          <p className="text-xs text-gray-700 leading-relaxed">
            {action === 'RESOLVED' &&
              'Marks the ticket resolved and notifies the filer. Use this once the issue is genuinely handled.'}
            {action === 'ESCALATED' &&
              'Escalates the ticket to URGENT priority. Use when this needs senior attention.'}
            {action === 'CLOSED' &&
              'Closes the ticket without resolution. The filer can&apos;t reply unless reopened.'}
          </p>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
            Outcome
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as DisputeStatus)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-200 focus:border-ruby-300"
          >
            <option value="RESOLVED">Resolve</option>
            <option value="ESCALATED">Escalate</option>
            <option value="CLOSED">Close</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
            Resolution notes <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you do? What was the outcome?"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-200 focus:border-ruby-300 resize-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
            Refund amount ({currency}){' '}
            <span className="text-gray-400 normal-case font-normal">— optional</span>
          </label>
          <input
            type="number"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-200 focus:border-ruby-300"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!notes.trim() || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ruby-500 text-white text-sm font-semibold rounded-lg hover:bg-ruby-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Submit
          </button>
        </div>
      </div>
    </Modal>
  );
}
