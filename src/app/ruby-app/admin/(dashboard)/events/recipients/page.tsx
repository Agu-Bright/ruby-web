'use client';

import { useState } from 'react';
import { Mail, Plus, Trash2, Edit3, Send, MoreHorizontal } from 'lucide-react';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { DataTable, Modal, type Column } from '@/components/ui';
import type {
  EventNotificationRecipient,
  CreateEventRecipientRequest,
  UpdateEventRecipientRequest,
} from '@/lib/types';

/**
 * Phase 40 — admin-managed event-recipient list. Mirrors the dispute
 * recipients pattern: same per-event flags + soft-mute + send-test
 * endpoint. Editing email is disabled (delete + recreate instead).
 *
 * The four flags map to event-lifecycle moments the backend dispatches:
 *   submitted  — new event awaiting review
 *   approved   — admin approved an event (ops mirror)
 *   rejected   — admin rejected with reason
 *   salesMilestone — V1.1; reserved here for forward-compat
 */

const FLAG_LABELS: Record<keyof EventNotificationRecipient['events'], string> = {
  submitted: 'New submission',
  approved: 'Approved',
  rejected: 'Rejected',
  salesMilestone: 'Sales milestone (V1.1)',
};

export default function EventRecipientsPage() {
  const [editing, setEditing] = useState<EventNotificationRecipient | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const { data, isLoading, refetch } = useApi(() => api.eventRecipients.list());
  const recipients: EventNotificationRecipient[] = data || [];

  const deleteMut = useMutation((id: string) => api.eventRecipients.delete(id));
  const sendTestMut = useMutation(() => api.eventRecipients.sendTest());
  const toggleActiveMut = useMutation(
    (args: { id: string; isActive: boolean }) =>
      api.eventRecipients.update(args.id, { isActive: args.isActive }),
  );

  const handleSendTest = async () => {
    const result = await sendTestMut.mutate();
    if (result) {
      alert(`Test email dispatched to ${result.sentTo}.`);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from event alerts?`)) return;
    setActionMenu(null);
    await deleteMut.mutate(id);
    refetch();
  };

  const handleToggleActive = async (r: EventNotificationRecipient) => {
    setActionMenu(null);
    await toggleActiveMut.mutate({ id: r._id, isActive: !r.isActive });
    refetch();
  };

  const columns: Column<EventNotificationRecipient>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{r.email}</span>
          {r.label && (
            <span className="text-xs text-gray-500 mt-0.5">{r.label}</span>
          )}
        </div>
      ),
    },
    {
      key: 'events',
      header: 'Subscribed to',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {(Object.keys(r.events) as Array<keyof typeof r.events>).map((k) => {
            const on = r.events[k];
            return (
              <span
                key={k}
                className={`text-[11px] px-2 py-0.5 rounded ${
                  on
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-50 text-gray-400 border border-gray-200'
                }`}
              >
                {FLAG_LABELS[k]}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (r) => (
        <button
          onClick={() => handleToggleActive(r)}
          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
            r.isActive ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform mt-0.5 ${
              r.isActive ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="relative">
          <button
            onClick={() => setActionMenu(actionMenu === r._id ? null : r._id)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <MoreHorizontal size={16} />
          </button>
          {actionMenu === r._id && (
            <div className="absolute right-0 top-9 z-10 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                  setActionMenu(null);
                  setEditing(r);
                }}
              >
                <Edit3 size={14} /> Edit
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-700 flex items-center gap-2"
                onClick={() => handleDelete(r._id, r.email)}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail size={24} /> Event notification recipients
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            These email addresses receive event-lifecycle alerts (submissions, approvals, rejections). Merged with the <code className="text-xs bg-gray-100 px-1 rounded">EVENTS_INBOX_EMAIL</code> env-var inbox.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSendTest}
            disabled={sendTestMut.isLoading}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            <Send size={16} /> Send test to me
          </button>
          <button
            onClick={() => setCreating(true)}
            className="bg-ruby-500 hover:bg-ruby-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={16} /> Add recipient
          </button>
        </div>
      </div>

      <DataTable
        data={recipients}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No recipients yet. Add an email to start receiving event alerts."
      />

      {creating && (
        <RecipientFormModal
          mode="create"
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            refetch();
          }}
        />
      )}
      {editing && (
        <RecipientFormModal
          mode="edit"
          recipient={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function RecipientFormModal({
  mode,
  recipient,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  recipient?: EventNotificationRecipient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState(recipient?.email || '');
  const [label, setLabel] = useState(recipient?.label || '');
  const [events, setEvents] = useState<EventNotificationRecipient['events']>(
    recipient?.events || {
      submitted: true,
      approved: true,
      rejected: true,
      salesMilestone: false,
    },
  );

  const createMut = useMutation((data: CreateEventRecipientRequest) =>
    api.eventRecipients.create(data),
  );
  const updateMut = useMutation(
    (args: { id: string; data: UpdateEventRecipientRequest }) =>
      api.eventRecipients.update(args.id, args.data),
  );

  const isBusy = createMut.isLoading || updateMut.isLoading;

  const handleSubmit = async () => {
    if (!email.trim()) return alert('Email is required.');
    if (mode === 'create') {
      const res = await createMut.mutate({
        email: email.trim(),
        label: label.trim() || undefined,
        events,
      });
      if (res) onSuccess();
    } else if (recipient) {
      const res = await updateMut.mutate({
        id: recipient._id,
        data: { label: label.trim() || undefined, events },
      });
      if (res) onSuccess();
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title={mode === 'create' ? 'Add event recipient' : 'Edit recipient'}
    >
      <div className="space-y-4 p-4">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={mode === 'edit'}
            placeholder="ops@rubyplus.net"
            className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ruby-400 disabled:opacity-60"
          />
          {mode === 'edit' && (
            <p className="text-xs text-gray-500 mt-1">
              Email can't be changed — delete and re-add to update.
            </p>
          )}
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Label (optional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Content lead, Ops on-call, etc."
            className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ruby-400"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Subscribe to
          </label>
          <div className="mt-2 space-y-2">
            {(
              Object.keys(events) as Array<keyof typeof events>
            ).map((k) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={events[k]}
                  onChange={(e) =>
                    setEvents((prev) => ({ ...prev, [k]: e.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{FLAG_LABELS[k]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
        <button
          onClick={onClose}
          disabled={isBusy}
          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isBusy}
          className="px-4 py-2 text-sm bg-ruby-500 hover:bg-ruby-600 text-white rounded-lg disabled:opacity-50"
        >
          {isBusy ? 'Saving…' : mode === 'create' ? 'Add recipient' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
