'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Mail, Check, Minus, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApi, useMutation } from '@/lib/hooks';
import {
  DISPUTE_NOTIFICATION_EVENT_LABELS,
  type DisputeNotificationEvent,
  type DisputeNotificationRecipient,
  type CreateDisputeRecipientRequest,
  type UpdateDisputeRecipientRequest,
} from '@/lib/types';
import { RecipientFormModal } from './RecipientFormModal';

const ALL_EVENTS: DisputeNotificationEvent[] = [
  'filed',
  'messageAdded',
  'statusChanged',
  'resolved',
];

/**
 * Recipients tab body. Renders the full recipient table with:
 *  - inline isActive toggle (no modal needed for the most common change)
 *  - event flag chips (visual at-a-glance of who gets what)
 *  - row actions: edit (opens form modal), delete (with inline confirm)
 *  - "Add recipient" button → form modal in create mode
 *
 * Doesn't use the shared DataTable component because the layout is
 * recipient-specific (event chips, isActive toggle inline) and trying to
 * cram it into a generic table column makes both worse.
 */
export function RecipientList() {
  const { data: recipients, isLoading, refetch } = useApi<
    DisputeNotificationRecipient[]
  >(() => api.disputeRecipients.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DisputeNotificationRecipient | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { mutate: createMutation } = useMutation(
    (data: CreateDisputeRecipientRequest) => api.disputeRecipients.create(data),
  );

  const { mutate: updateMutation } = useMutation(
    ({
      id,
      data,
    }: {
      id: string;
      data: UpdateDisputeRecipientRequest;
    }) => api.disputeRecipients.update(id, data),
  );

  const { mutate: deleteMutation, isLoading: deleting } = useMutation(
    (id: string) => api.disputeRecipients.delete(id),
  );

  // Self-service "Send test email to me" mutation. Hits the backend
  // endpoint that fires a sample messageAdded email to the calling
  // admin's own address — lets ops verify SMTP + template render
  // without filing a real dispute.
  const { mutate: sendTestMutation, isLoading: sendingTest } = useMutation(
    () => api.disputeRecipients.sendTest(),
    {
      onSuccess: (data) => {
        toast.success(`Test email sent to ${data.sentTo}`);
      },
    },
  );

  const handleCreate = async (data: CreateDisputeRecipientRequest) => {
    const created = await createMutation(data);
    if (created) {
      toast.success(`Added ${created.email} to dispute alerts`);
      setModalOpen(false);
      refetch();
    }
  };

  const handleUpdate = async (
    id: string,
    data: UpdateDisputeRecipientRequest,
  ) => {
    const updated = await updateMutation({ id, data });
    if (updated) {
      toast.success('Recipient updated');
      setModalOpen(false);
      setEditing(null);
      refetch();
    }
  };

  const handleToggleActive = async (r: DisputeNotificationRecipient) => {
    // Inline toggle — bypasses the modal for the most common change.
    const updated = await updateMutation({
      id: r._id,
      data: { isActive: !r.isActive },
    });
    if (updated) {
      toast.success(
        updated.isActive
          ? `Resumed alerts for ${updated.email}`
          : `Paused alerts for ${updated.email}`,
      );
      refetch();
    }
  };

  const handleDelete = async (r: DisputeNotificationRecipient) => {
    await deleteMutation(r._id);
    toast.success(`Removed ${r.email}`);
    setPendingDelete(null);
    refetch();
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Notification recipients
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Emails on this list receive dispute alerts in addition to the
              admin-team defaults.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Self-service test — sends sample messageAdded email to
                the admin's own address so they can verify SMTP +
                template render without filing a real dispute. */}
            <button
              type="button"
              onClick={() => sendTestMutation()}
              disabled={sendingTest}
              className="inline-flex items-center gap-1.5 bg-white text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Send a sample dispute-message email to your own address"
            >
              {sendingTest ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send test email
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-ruby-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-ruby-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add recipient
            </button>
          </div>
        </div>

        {/* List body */}
        {isLoading ? (
          <ListSkeleton />
        ) : !recipients || recipients.length === 0 ? (
          <EmptyState onAdd={() => setModalOpen(true)} />
        ) : (
          <div className="divide-y divide-gray-100">
            {recipients.map((r) => (
              <div key={r._id} className="px-4 py-3 flex items-start gap-3">
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    r.isActive ? 'bg-ruby-50 text-ruby-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={`text-sm font-medium truncate ${
                        r.isActive ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {r.email}
                    </p>
                    {r.label && (
                      <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {r.label}
                      </span>
                    )}
                    {!r.isActive && (
                      <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        Paused
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ALL_EVENTS.map((evt) => {
                      const on = r.events[evt];
                      return (
                        <span
                          key={evt}
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            on
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-gray-50 text-gray-400 border border-gray-200'
                          }`}
                        >
                          {on ? (
                            <Check className="w-2.5 h-2.5" />
                          ) : (
                            <Minus className="w-2.5 h-2.5" />
                          )}
                          {DISPUTE_NOTIFICATION_EVENT_LABELS[evt]}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Active toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(r)}
                    role="switch"
                    aria-checked={r.isActive}
                    title={r.isActive ? 'Pause alerts' : 'Resume alerts'}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      r.isActive ? 'bg-ruby-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        r.isActive ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditing(r);
                      setModalOpen(true);
                    }}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {pendingDelete === r._id ? (
                    <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-md px-1.5 py-0.5">
                      <span className="text-[10px] text-red-700 font-medium">
                        Sure?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        disabled={deleting}
                        className="text-[10px] text-red-700 font-bold hover:underline disabled:opacity-50"
                      >
                        {deleting ? '…' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(null)}
                        className="text-[10px] text-gray-500 hover:underline"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(r._id)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <strong className="text-gray-700">Tip:</strong> recipients here are
            merged with the legacy <code className="text-[10px] bg-white border border-gray-200 px-1 rounded">DISPUTES_INBOX_EMAIL</code>{' '}
            env-var list (dedupe is case-insensitive). Existing per-admin
            emails continue to fire for the original{' '}
            <em>new-dispute-filed</em> event.
          </p>
        </div>
      </div>

      <RecipientFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        recipient={editing}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-start gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-lg bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-2.5 bg-gray-100 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Mail className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">
        No recipients yet
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mb-4">
        Add an email to start receiving dispute alerts. You can opt each
        recipient into the events that matter to them.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 bg-ruby-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-ruby-600 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add the first recipient
      </button>
    </div>
  );
}
