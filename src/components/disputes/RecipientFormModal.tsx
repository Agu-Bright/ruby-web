'use client';

import { useState, useEffect } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Modal } from '@/components/ui';
import {
  DISPUTE_NOTIFICATION_EVENT_LABELS,
  type DisputeNotificationEvent,
  type DisputeNotificationRecipient,
  type CreateDisputeRecipientRequest,
  type UpdateDisputeRecipientRequest,
} from '@/lib/types';

const ALL_EVENTS: DisputeNotificationEvent[] = [
  'filed',
  'messageAdded',
  'statusChanged',
  'resolved',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** When editing, pre-fills the form. When null, the form is for create. */
  recipient: DisputeNotificationRecipient | null;
  onCreate: (data: CreateDisputeRecipientRequest) => Promise<void> | void;
  onUpdate: (
    id: string,
    data: UpdateDisputeRecipientRequest,
  ) => Promise<void> | void;
}

/**
 * Single modal that handles both create and edit. The mode is implicit
 * from the `recipient` prop: null = create, populated = edit. In edit
 * mode the email field is disabled (changing email = delete + re-add;
 * keeps the unique-index audit trail clean).
 *
 * Events are rendered as checkboxes — each one toggles independently
 * so admins can put senior staff on `resolved` only, on-call ops on
 * everything, etc.
 */
export function RecipientFormModal({
  isOpen,
  onClose,
  recipient,
  onCreate,
  onUpdate,
}: Props) {
  const isEdit = !!recipient;

  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [events, setEvents] = useState<Record<DisputeNotificationEvent, boolean>>({
    filed: true,
    messageAdded: true,
    statusChanged: true,
    resolved: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from the prop whenever it changes (or when opening).
  useEffect(() => {
    if (!isOpen) return;
    if (recipient) {
      setEmail(recipient.email);
      setLabel(recipient.label || '');
      setEvents({ ...recipient.events });
    } else {
      setEmail('');
      setLabel('');
      setEvents({
        filed: true,
        messageAdded: true,
        statusChanged: true,
        resolved: true,
      });
    }
    setSubmitting(false);
    setError(null);
  }, [isOpen, recipient]);

  const toggleEvent = (e: DisputeNotificationEvent) =>
    setEvents((prev) => ({ ...prev, [e]: !prev[e] }));

  const validate = (): string | null => {
    if (!isEdit) {
      if (!email.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return 'Enter a valid email address';
      }
    }
    // At least one event must be on — otherwise the row is dead weight.
    if (!Object.values(events).some(Boolean)) {
      return 'Pick at least one event for this recipient to receive';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit && recipient) {
        await onUpdate(recipient._id, { label: label.trim() || undefined, events });
      } else {
        await onCreate({
          email: email.trim().toLowerCase(),
          label: label.trim() || undefined,
          events,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit recipient' : 'Add recipient'}
      subtitle={
        isEdit
          ? 'Adjust the label or event subscriptions. Email is locked — delete and re-add to change it.'
          : 'New addresses get all four dispute alerts by default. Untick what they don’t need.'
      }
      size="md"
    >
      <div className="space-y-4">
        {/* Email */}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEdit}
              placeholder="ops-oncall@rubyplus.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-200 focus:border-ruby-300 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Label */}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
            Label{' '}
            <span className="text-gray-400 normal-case font-normal">— optional</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Ops on-call, Founder"
            maxLength={100}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-200 focus:border-ruby-300"
          />
        </div>

        {/* Events */}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
            Send emails for
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_EVENTS.map((evt) => (
              <label
                key={evt}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  events[evt]
                    ? 'bg-ruby-50/50 border-ruby-200 text-gray-900'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={events[evt]}
                  onChange={() => toggleEvent(evt)}
                  className="accent-ruby-500"
                />
                <span className="text-xs font-medium">
                  {DISPUTE_NOTIFICATION_EVENT_LABELS[evt]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
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
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ruby-500 text-white text-sm font-semibold rounded-lg hover:bg-ruby-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Save changes' : 'Add recipient'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
