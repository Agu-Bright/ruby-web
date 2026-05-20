'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui';
import type {
  DisputeResolutionRequest,
  DisputeResolution,
} from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DisputeResolutionRequest) => Promise<void> | void;
  /** For the refund-amount label; defaults to NGN. */
  currency?: string;
}

/**
 * Resolves a dispute via the dedicated `POST /admin/disputes/:id/resolve`
 * endpoint. Three required pieces map 1:1 to the backend `ResolveDisputeDto`:
 *   - `resolution`        → one of 8 enum outcomes
 *   - `resolutionNotes`   → free text (required, max 2000)
 *   - `refundAmount`      → optional kobo-precision amount; backend uses
 *                           it for refund-side effects when applicable
 *
 * Earlier this modal also handled escalate + close via a status dropdown,
 * but those operations have their own endpoints (`/escalate`, `/close`)
 * with different payloads — so they live in separate UI surfaces:
 *   - Escalate: `EscalateDisputeModal` (reason required)
 *   - Close: a plain confirm() from the chat header
 */

const RESOLUTION_OPTIONS: Array<{
  value: DisputeResolution;
  label: string;
  description: string;
  refundRelevant: boolean;
}> = [
  {
    value: 'FULL_REFUND',
    label: 'Full refund',
    description: 'Refund the entire disputed amount to the customer.',
    refundRelevant: true,
  },
  {
    value: 'PARTIAL_REFUND',
    label: 'Partial refund',
    description: 'Refund part of the disputed amount.',
    refundRelevant: true,
  },
  {
    value: 'REPLACEMENT',
    label: 'Replacement',
    description: 'Customer gets a replacement product / re-delivery.',
    refundRelevant: false,
  },
  {
    value: 'CREDIT_ISSUED',
    label: 'Credit issued',
    description: 'Wallet credit added in lieu of refund.',
    refundRelevant: true,
  },
  {
    value: 'BUSINESS_FAVOR',
    label: 'In favor of business',
    description: 'Investigation concluded — no payout to customer.',
    refundRelevant: false,
  },
  {
    value: 'CUSTOMER_FAVOR',
    label: 'In favor of customer',
    description: 'Customer is right; resolution may include refund.',
    refundRelevant: true,
  },
  {
    value: 'MUTUAL_AGREEMENT',
    label: 'Mutual agreement',
    description: 'Both parties agreed to a settlement. Document the terms.',
    refundRelevant: true,
  },
  {
    value: 'NO_ACTION',
    label: 'No action needed',
    description: 'Not a real issue / withdrawn / out of scope.',
    refundRelevant: false,
  },
];

export function ResolveDisputeModal({
  isOpen,
  onClose,
  onSubmit,
  currency = 'NGN',
}: Props) {
  const [resolution, setResolution] = useState<DisputeResolution>('FULL_REFUND');
  const [notes, setNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset on open so re-opening doesn't show stale state.
  useEffect(() => {
    if (isOpen) {
      setResolution('FULL_REFUND');
      setNotes('');
      setRefundAmount('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const selectedOption = RESOLUTION_OPTIONS.find((o) => o.value === resolution);
  const showRefund = selectedOption?.refundRelevant ?? false;

  const handleSubmit = async () => {
    const trimmedNotes = notes.trim();
    if (!trimmedNotes) return;
    setSubmitting(true);
    try {
      const refundParsed = refundAmount ? parseFloat(refundAmount) : undefined;
      await onSubmit({
        resolution,
        resolutionNotes: trimmedNotes,
        // Only send `refundAmount` for outcomes where it's meaningful —
        // backend allows it for any value, but keeping the payload clean
        // avoids accidental refunds when REPLACEMENT / NO_ACTION are
        // picked but the amount field still has stale text.
        refundAmount: showRefund && refundParsed && refundParsed > 0
          ? refundParsed
          : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve dispute"
      subtitle="Choose an outcome, document it, and (optionally) trigger a refund."
      size="md"
    >
      <div className="space-y-4">
        {/* Outcome guidance banner */}
        <div className="flex items-start gap-3 rounded-lg p-3 bg-green-50 border border-green-200">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
          <p className="text-xs text-gray-700 leading-relaxed">
            Marks the ticket <strong>RESOLVED</strong> and notifies the filer.
            Pick the outcome that matches what actually happened — it&apos;s
            stored on the dispute for reporting and customer transparency.
          </p>
        </div>

        {/* Resolution outcome picker */}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
            Resolution outcome <span className="text-red-500">*</span>
          </label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value as DisputeResolution)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-200 focus:border-ruby-300"
          >
            {RESOLUTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {selectedOption && (
            <p className="text-[11px] text-gray-500 mt-1">
              {selectedOption.description}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
            Resolution notes <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you do? What was the outcome?"
            maxLength={2000}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-200 focus:border-ruby-300 resize-none"
          />
          <p className="text-[11px] text-gray-400 mt-1 text-right">
            {notes.length} / 2000
          </p>
        </div>

        {/* Refund amount — only shown for refund-relevant outcomes */}
        {showRefund && (
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Refund amount ({currency}){' '}
              <span className="text-gray-400 normal-case font-normal">
                — optional
              </span>
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
            <p className="text-[11px] text-gray-400 mt-1">
              Leave blank if the refund is already handled outside the
              dispute (e.g. via a separate wallet adjustment).
            </p>
          </div>
        )}

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
            Resolve dispute
          </button>
        </div>
      </div>
    </Modal>
  );
}
