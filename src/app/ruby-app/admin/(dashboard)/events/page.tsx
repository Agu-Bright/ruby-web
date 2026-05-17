'use client';

import { useState, useMemo } from 'react';
import {
  Ticket, Eye, Plus, Search, Calendar, MapPin, MoreHorizontal,
  CheckCircle2, XCircle, Trash2, Edit3, RotateCcw,
} from 'lucide-react';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import {
  DataTable, StatusBadge, Modal, type Column,
} from '@/components/ui';
import type {
  RubyEvent, EventStatus, CreateEventRequest, UpdateEventRequest,
  EventTicketTier,
} from '@/lib/types';
import { formatDateTime, formatCurrency } from '@/lib/utils';

/**
 * Events admin page. Mirrors the look of /admin/bookings: search +
 * status filter at the top, paginated DataTable, kebab menu per row.
 *
 * Three actions live in the kebab:
 *   - Publish (DRAFT → PUBLISHED)
 *   - Cancel (PUBLISHED → CANCELLED; tickets auto-cancelled)
 *   - Delete (only if no tickets sold)
 *
 * Create / edit live in a modal launched from the "+ New event" CTA in
 * the page header. The form is single-page (no multi-step) — we ship
 * the simplest thing that works and iterate.
 */

const STATUS_OPTIONS: (EventStatus | 'ALL')[] = [
  'ALL', 'DRAFT', 'PUBLISHED', 'SOLD_OUT', 'CANCELLED', 'COMPLETED',
];

export default function EventsAdminPage() {
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [editingEvent, setEditingEvent] = useState<RubyEvent | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const { data, isLoading, refetch } = useApi(() => api.events.list({ limit: 100 }));

  const events = data?.items || [];

  const filtered = useMemo(() => {
    let list = events;
    if (statusFilter !== 'ALL') {
      list = list.filter((e) => e.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venueName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [events, statusFilter, search]);

  const publishMutation = useMutation((id: string) => api.events.publish(id));
  const cancelMutation = useMutation((id: string) => api.events.cancel(id));
  const deleteMutation = useMutation((id: string) => api.events.delete(id));
  const refundMutation = useMutation((id: string) =>
    api.events.refundAllTickets(id),
  );

  const handlePublish = async (id: string) => {
    setActionMenu(null);
    await publishMutation.mutate(id);
    refetch();
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this event? All ACTIVE tickets will be marked CANCELLED. Refunds are handled separately via the wallet refund flow.')) {
      return;
    }
    setActionMenu(null);
    await cancelMutation.mutate(id);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event permanently? Only allowed if no tickets have been sold.')) {
      return;
    }
    setActionMenu(null);
    await deleteMutation.mutate(id);
    refetch();
  };

  const handleRefundAll = async (id: string, title: string) => {
    if (
      !confirm(
        `Refund every wallet-paid ticket for "${title}"?\n\n` +
          'This credits each attendee\'s Ruby+ wallet by what they paid. ' +
          'Action is idempotent — already-refunded tickets are skipped. ' +
          'Card (Paystack) payments are NOT refunded here — those need a separate Paystack refund.',
      )
    ) {
      return;
    }
    setActionMenu(null);
    const result = await refundMutation.mutate(id);
    if (result) {
      alert(
        `Refund complete:\n` +
          `  ${result.refunded} tickets refunded (₦${result.totalNgnRefunded.toLocaleString()})\n` +
          `  ${result.skipped} skipped (already refunded / free)\n` +
          `  ${result.failures} failures`,
      );
    }
    refetch();
  };

  const columns: Column<RubyEvent>[] = [
    {
      key: 'title',
      header: 'Event',
      render: (e) => (
        <div className="flex items-center gap-3">
          <img
            src={e.coverImageUrl}
            alt={e.title}
            className="h-10 w-14 rounded object-cover"
          />
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{e.title}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={11} /> {e.venueName}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'startsAt',
      header: 'Start',
      render: (e) => (
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <Calendar size={12} /> {formatDateTime(e.startsAt)}
        </div>
      ),
    },
    {
      key: 'tiers',
      header: 'Tickets',
      render: (e) => {
        const total = e.ticketTiers.reduce((s, t) => s + t.quantityAvailable, 0);
        const sold = e.ticketTiers.reduce((s, t) => s + t.quantitySold, 0);
        return (
          <div className="text-sm text-gray-700">
            <span className="font-medium">{sold}</span>
            <span className="text-gray-400"> / {total}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <div className="relative">
          <button
            onClick={() => setActionMenu(actionMenu === e._id ? null : e._id)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <MoreHorizontal size={16} />
          </button>
          {actionMenu === e._id && (
            <div className="absolute right-0 top-9 z-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                  setActionMenu(null);
                  setEditingEvent(e);
                }}
              >
                <Edit3 size={14} /> Edit
              </button>
              {e.status === 'DRAFT' && (
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 text-green-700 flex items-center gap-2"
                  onClick={() => handlePublish(e._id)}
                >
                  <CheckCircle2 size={14} /> Publish
                </button>
              )}
              {(e.status === 'PUBLISHED' || e.status === 'SOLD_OUT') && (
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-amber-50 text-amber-700 flex items-center gap-2"
                  onClick={() => handleCancel(e._id)}
                >
                  <XCircle size={14} /> Cancel
                </button>
              )}
              {/* Refund all is available once at least one ticket has
                  been sold. Most useful after cancelling — but also
                  works for one-off "refund everyone, we're moving the
                  date" scenarios. */}
              {e.ticketTiers.some((t) => t.quantitySold > 0) && (
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-blue-700 flex items-center gap-2"
                  onClick={() => handleRefundAll(e._id, e.title)}
                >
                  <RotateCcw size={14} /> Refund all tickets
                </button>
              )}
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-700 flex items-center gap-2"
                onClick={() => handleDelete(e._id)}
              >
                <Trash2 size={14} /> Delete
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
            <Ticket size={24} /> Events
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage tickets and event listings. Drafts stay hidden from customers
            until you publish.
          </p>
        </div>
        <button
          className="bg-ruby-500 hover:bg-ruby-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          onClick={() => setCreating(true)}
        >
          <Plus size={16} /> New event
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-col md:flex-row gap-3 p-4">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by title or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ruby-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'ALL')}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ruby-400"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No events yet. Create your first event to get started."
      />

      {creating && (
        <EventFormModal
          mode="create"
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            refetch();
          }}
        />
      )}
      {editingEvent && (
        <EventFormModal
          mode="edit"
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSuccess={() => {
            setEditingEvent(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Create / Edit modal
// ============================================================

function EventFormModal({
  mode,
  event,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  event?: RubyEvent;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<{
    title: string;
    description: string;
    venueName: string;
    venueAddress: string;
    locationId: string;
    startsAt: string;
    endsAt: string;
    coverImageUrl: string;
    galleryUrls: string;
    askRubyTags: string;
    tiers: {
      name: string;
      description?: string;
      priceNgn: number;
      quantityAvailable: number;
      perks: string;
    }[];
  }>({
    title: event?.title || '',
    description: event?.description || '',
    venueName: event?.venueName || '',
    venueAddress: event?.venueAddress || '',
    locationId:
      typeof event?.locationId === 'object'
        ? event.locationId._id
        : (event?.locationId as string) || '',
    startsAt: event?.startsAt
      ? new Date(event.startsAt).toISOString().slice(0, 16)
      : '',
    endsAt: event?.endsAt
      ? new Date(event.endsAt).toISOString().slice(0, 16)
      : '',
    coverImageUrl: event?.coverImageUrl || '',
    galleryUrls: event?.galleryUrls?.join('\n') || '',
    askRubyTags: event?.askRubyTags?.join(', ') || '',
    tiers: event?.ticketTiers?.map((t) => ({
      name: t.name,
      description: t.description,
      priceNgn: t.priceNgn,
      quantityAvailable: t.quantityAvailable,
      perks: t.perks.join(', '),
    })) || [
      { name: 'General Admission', priceNgn: 5000, quantityAvailable: 100, perks: '' },
    ],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: CreateEventRequest = {
        title: form.title,
        description: form.description,
        venueName: form.venueName,
        venueAddress: form.venueAddress,
        locationId: form.locationId,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        coverImageUrl: form.coverImageUrl,
        galleryUrls: form.galleryUrls
          .split('\n')
          .map((u) => u.trim())
          .filter(Boolean),
        ticketTiers: form.tiers.map((t) => ({
          name: t.name,
          description: t.description,
          priceNgn: Number(t.priceNgn),
          quantityAvailable: Number(t.quantityAvailable),
          perks: t.perks
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean),
        })),
      };

      if (mode === 'create') {
        await api.events.create(payload);
      } else if (event) {
        const updatePayload: UpdateEventRequest = {
          ...payload,
          askRubyTags: form.askRubyTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        };
        await api.events.update(event._id, updatePayload);
      }
      onSuccess();
    } catch (err: any) {
      alert(`Save failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    setForm({
      ...form,
      tiers: [
        ...form.tiers,
        { name: '', priceNgn: 0, quantityAvailable: 0, perks: '' },
      ],
    });
  };

  const removeTier = (i: number) => {
    setForm({ ...form, tiers: form.tiers.filter((_, idx) => idx !== i) });
  };

  const updateTier = (i: number, patch: Partial<typeof form.tiers[0]>) => {
    setForm({
      ...form,
      tiers: form.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === 'create' ? 'Create event' : 'Edit event'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Title">
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Description">
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Venue name">
            <input
              required
              value={form.venueName}
              onChange={(e) => setForm({ ...form, venueName: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Venue address">
            <input
              required
              value={form.venueAddress}
              onChange={(e) =>
                setForm({ ...form, venueAddress: e.target.value })
              }
              className="input"
            />
          </Field>
        </div>

        <Field label="Location ID (Mongo ObjectId)">
          <input
            required
            value={form.locationId}
            onChange={(e) => setForm({ ...form, locationId: e.target.value })}
            placeholder="65f1a2..."
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts at">
            <input
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Ends at">
            <input
              type="datetime-local"
              required
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="input"
            />
          </Field>
        </div>

        <Field label="Cover image URL">
          <input
            required
            value={form.coverImageUrl}
            onChange={(e) =>
              setForm({ ...form, coverImageUrl: e.target.value })
            }
            placeholder="https://..."
            className="input"
          />
        </Field>

        <Field label="Gallery URLs (one per line, optional)">
          <textarea
            rows={3}
            value={form.galleryUrls}
            onChange={(e) => setForm({ ...form, galleryUrls: e.target.value })}
            className="input"
          />
        </Field>

        {mode === 'edit' && (
          <Field label="Deolu tags (comma-separated, ops-approved only)">
            <input
              value={form.askRubyTags}
              onChange={(e) =>
                setForm({ ...form, askRubyTags: e.target.value })
              }
              placeholder="live-music, nightlife"
              className="input"
            />
          </Field>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Ticket tiers
            </label>
            <button
              type="button"
              onClick={addTier}
              className="text-sm text-ruby-500 hover:text-ruby-600"
            >
              + Add tier
            </button>
          </div>
          {form.tiers.map((t, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-lg p-3 mb-2 space-y-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Name (e.g. VIP)"
                  required
                  value={t.name}
                  onChange={(e) => updateTier(i, { name: e.target.value })}
                  className="input"
                />
                <input
                  placeholder="Price ₦"
                  type="number"
                  required
                  value={t.priceNgn}
                  onChange={(e) =>
                    updateTier(i, { priceNgn: Number(e.target.value) })
                  }
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Quantity available"
                  type="number"
                  required
                  value={t.quantityAvailable}
                  onChange={(e) =>
                    updateTier(i, {
                      quantityAvailable: Number(e.target.value),
                    })
                  }
                  className="input"
                />
                <input
                  placeholder="Perks (comma-separated)"
                  value={t.perks}
                  onChange={(e) => updateTier(i, { perks: e.target.value })}
                  className="input"
                />
              </div>
              {form.tiers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTier(i)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove tier
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-ruby-500 hover:bg-ruby-600 text-white rounded disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create event' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
