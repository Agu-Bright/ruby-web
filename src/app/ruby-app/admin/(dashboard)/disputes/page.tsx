'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Eye,
  CheckCircle,
  ShoppingCart,
  CalendarCheck,
  MessageSquare,
  Send,
  ExternalLink,
  CreditCard,
  Wallet,
  ArrowUpRight,
  Truck,
  Zap,
  Map as MapIcon,
  HelpCircle,
  Lock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { useDisputeSocket } from '@/lib/hooks/useDisputeSocket';
import { PageHeader, DataTable, StatusBadge, Modal, type Column } from '@/components/ui';
import type {
  Dispute,
  DisputeFilterParams,
  DisputeStatus,
  DisputeType,
  DisputeResolutionRequest,
  DisputeMessage,
} from '@/lib/types';
import { formatDate, formatDateTime, formatCurrency, toLocationId } from '@/lib/utils';

const STATUS_OPTIONS: DisputeStatus[] = [
  'OPEN',
  'UNDER_REVIEW',
  'AWAITING_RESPONSE',
  'RESOLVED',
  'ESCALATED',
  'CLOSED',
];

const TYPE_OPTIONS: DisputeType[] = [
  'ORDER',
  'BOOKING',
  'PAYMENT',
  'PAYOUT',
  'WALLET',
  'DELIVERY',
  'RIDE',
  'AD',
  'GENERAL',
];

// ---------- Type icon + color ----------
const TYPE_ICONS: Record<DisputeType, { icon: React.ComponentType<{ className?: string }>; bg: string; color: string }> = {
  ORDER: { icon: ShoppingCart, bg: 'bg-blue-50', color: 'text-blue-600' },
  BOOKING: { icon: CalendarCheck, bg: 'bg-violet-50', color: 'text-violet-600' },
  PAYMENT: { icon: CreditCard, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  WALLET: { icon: Wallet, bg: 'bg-amber-50', color: 'text-amber-600' },
  PAYOUT: { icon: ArrowUpRight, bg: 'bg-cyan-50', color: 'text-cyan-600' },
  DELIVERY: { icon: Truck, bg: 'bg-orange-50', color: 'text-orange-600' },
  RIDE: { icon: MapIcon, bg: 'bg-pink-50', color: 'text-pink-600' },
  AD: { icon: Zap, bg: 'bg-indigo-50', color: 'text-indigo-600' },
  GENERAL: { icon: HelpCircle, bg: 'bg-gray-100', color: 'text-gray-600' },
};

/**
 * Build the admin URL that points at the underlying transaction so the admin
 * can jump from a dispute straight to the record it's about.
 */
function getReferenceUrl(d: Dispute): string | null {
  const refId =
    d.referenceId ||
    (typeof d.orderId === 'object' ? d.orderId._id : d.orderId) ||
    (typeof d.bookingId === 'object' ? d.bookingId._id : d.bookingId);
  if (!refId) return null;
  switch (d.type) {
    case 'ORDER':
      return `/ruby-app/admin/orders?id=${refId}`;
    case 'BOOKING':
      return `/ruby-app/admin/bookings?id=${refId}`;
    case 'PAYOUT':
      return `/ruby-app/admin/finance?tab=payouts&id=${refId}`;
    case 'WALLET':
    case 'PAYMENT':
      return `/ruby-app/admin/finance?tab=ledger&id=${refId}`;
    case 'AD':
      return `/ruby-app/admin/ads?id=${refId}`;
    default:
      return null;
  }
}

function getReferenceLabel(d: Dispute): string {
  if (d.referenceLabel) return d.referenceLabel;
  if (typeof d.orderId === 'object' && d.orderId.orderNumber) return `Order #${d.orderId.orderNumber}`;
  if (typeof d.bookingId === 'object' && d.bookingId.bookingRef) return `Booking ${d.bookingId.bookingRef}`;
  return d.type;
}

function getCustomerName(d: Dispute): string {
  if (typeof d.userId === 'object') {
    const u = d.userId;
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return name || u.email || 'Customer';
  }
  return d.filedByName || 'Customer';
}

export default function DisputesPage() {
  const { admin } = useAuth();
  const [filters, setFilters] = useState<DisputeFilterParams>({
    page: 1,
    limit: 20,
    ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1
      ? { locationId: toLocationId(admin.locationIds[0]) }
      : {}),
  });
  const [detailDispute, setDetailDispute] = useState<Dispute | null>(null);
  const [resolveModal, setResolveModal] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolutionAction, setResolutionAction] = useState<'RESOLVED' | 'ESCALATED' | 'CLOSED'>('RESOLVED');
  const [refundAmount, setRefundAmount] = useState('');

  // Compose state
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: disputes, meta, isLoading, refetch } = useApi<Dispute[]>(
    () => api.disputes.list(filters),
    [filters],
  );

  const { mutate: resolveDispute, isLoading: resolving } = useMutation(
    ({ id, data }: { id: string; data: DisputeResolutionRequest }) =>
      api.disputes.resolve(id, data),
  );

  const { mutate: sendReply, isLoading: sending } = useMutation(
    ({
      id,
      message,
      attachments,
      isInternal,
    }: {
      id: string;
      message: string;
      attachments?: string[];
      isInternal?: boolean;
    }) => api.disputes.addMessage(id, { message, attachments, isInternal }),
  );

  const { mutate: updateStatus } = useMutation(
    ({ id, status, note }: { id: string; status: string; note?: string }) =>
      api.disputes.updateStatus(id, { status, note }),
  );

  // ---------- Real-time: subscribe to the currently-open dispute ----------
  useDisputeSocket(detailDispute?._id, {
    onMessage: (msg) => {
      setDetailDispute((curr) => {
        if (!curr) return curr;
        const already = (curr.messages || []).some(
          (m) =>
            m.senderId === msg.senderId &&
            (m.message || m.text) === (msg.message || msg.text) &&
            m.createdAt === msg.createdAt,
        );
        if (already) return curr;
        return { ...curr, messages: [...(curr.messages || []), msg] };
      });
    },
    onStatus: (status) => {
      setDetailDispute((curr) => (curr ? { ...curr, status: status as DisputeStatus } : curr));
      refetch();
    },
  });

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (detailDispute?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detailDispute?.messages?.length]);

  const handleResolve = useCallback(async () => {
    if (!resolveModal || !resolution) {
      toast.error('Please provide a resolution note');
      return;
    }
    const result = await resolveDispute({
      id: resolveModal._id,
      data: {
        status: resolutionAction,
        resolution,
        refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
      },
    });
    if (result) {
      toast.success(`Dispute ${resolutionAction.toLowerCase()}`);
      setResolveModal(null);
      setResolution('');
      setRefundAmount('');
      refetch();
    }
  }, [resolveModal, resolution, resolutionAction, refundAmount, resolveDispute, refetch]);

  const handleSendReply = useCallback(async () => {
    if (!detailDispute || !reply.trim()) return;
    const result = await sendReply({
      id: detailDispute._id,
      message: reply.trim(),
      isInternal,
    });
    if (result) {
      // Add optimistically — socket echo is deduped by useDisputeSocket
      setDetailDispute({ ...result });
      setReply('');
      if (!isInternal) toast.success('Reply sent');
      else toast.success('Internal note added');
    }
  }, [detailDispute, reply, isInternal, sendReply]);

  const handleChangeStatus = useCallback(
    async (status: DisputeStatus) => {
      if (!detailDispute) return;
      const result = await updateStatus({ id: detailDispute._id, status });
      if (result) {
        setDetailDispute({ ...result });
        toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
        refetch();
      }
    },
    [detailDispute, updateStatus, refetch],
  );

  // Memoize referenceUrl so we don't re-render modal header unnecessarily
  const referenceUrl = useMemo(
    () => (detailDispute ? getReferenceUrl(detailDispute) : null),
    [detailDispute],
  );

  const columns: Column<Dispute>[] = [
    {
      key: 'dispute',
      header: 'Dispute',
      render: (d) => {
        const t = TYPE_ICONS[d.type] || TYPE_ICONS.GENERAL;
        const Icon = t.icon;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.bg}`}>
              <Icon className={`w-4 h-4 ${t.color}`} />
            </div>
            <div>
              <div className="font-medium text-gray-900">
                #{d.disputeRef ? d.disputeRef.slice(-8) : d._id.slice(-8)}
              </div>
              <div className="text-xs text-gray-500">
                {d.type} · {getReferenceLabel(d)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      key: 'filedBy',
      header: 'Filed by',
      render: (d) => (
        <div className="text-sm">
          <div className="font-medium text-gray-800">{getCustomerName(d)}</div>
          <div className="text-xs text-gray-500">
            {d.filedByRole === 'BUSINESS' ? 'Business owner' : 'Customer'}
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (d) => (
        <span className="text-sm text-gray-600 line-clamp-1">{d.reason.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (d) => {
        const amt = d.disputedAmount ?? d.amount ?? d.referenceAmount;
        return (
          <span className="text-sm font-medium">
            {amt != null ? formatCurrency(amt, d.currency) : '—'}
          </span>
        );
      },
    },
    {
      key: 'filed',
      header: 'Filed',
      render: (d) => <span className="text-sm text-gray-500">{formatDate(d.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (d) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDetailDispute(d);
            }}
            className="p-1.5 rounded hover:bg-gray-100"
            title="View"
          >
            <Eye className="w-3.5 h-3.5 text-gray-500" />
          </button>
          {(d.status === 'OPEN' || d.status === 'UNDER_REVIEW' || d.status === 'ESCALATED') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setResolveModal(d);
              }}
              className="p-1.5 rounded hover:bg-green-50"
              title="Resolve"
            >
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const isThreadClosed =
    detailDispute?.status === 'RESOLVED' || detailDispute?.status === 'CLOSED';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support & Disputes"
        description="Reply to customer and business support tickets in real time."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input w-auto"
          value={filters.status || ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: (e.target.value || undefined) as DisputeStatus | undefined,
              page: 1,
            }))
          }
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={filters.type || ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              type: (e.target.value || undefined) as DisputeType | undefined,
              page: 1,
            }))
          }
        >
          <option value="">All types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={disputes || []}
        meta={meta}
        isLoading={isLoading}
        emptyMessage="No disputes found"
        currentPage={filters.page}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
      />

      {/* ============================================================ */}
      {/* Detail Modal with reply compose + real-time                   */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!detailDispute}
        onClose={() => {
          setDetailDispute(null);
          setReply('');
          setIsInternal(false);
        }}
        title={detailDispute ? `Ticket #${detailDispute.disputeRef || detailDispute._id.slice(-8)}` : ''}
        size="xl"
      >
        {detailDispute && (
          <div className="flex flex-col gap-4" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            {/* Header strip with type/status/reference link */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {(() => {
                  const t = TYPE_ICONS[detailDispute.type] || TYPE_ICONS.GENERAL;
                  const Icon = t.icon;
                  return (
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.bg}`}>
                      <Icon className={`w-4 h-4 ${t.color}`} />
                    </div>
                  );
                })()}
                <div>
                  <div className="font-medium text-gray-900">
                    {detailDispute.type} · {getReferenceLabel(detailDispute)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDateTime(detailDispute.createdAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={detailDispute.status} />
                {referenceUrl && (
                  <Link
                    href={referenceUrl}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-ruby-600 hover:text-ruby-700 bg-ruby-50 px-2 py-1 rounded"
                  >
                    <ExternalLink className="w-3 h-3" /> View transaction
                  </Link>
                )}
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Filed By
                </span>
                <p className="font-medium text-gray-800 mt-0.5">{getCustomerName(detailDispute)}</p>
                <p className="text-xs text-gray-500">
                  {detailDispute.filedByRole === 'BUSINESS' ? 'Business owner' : 'Customer'}
                </p>
              </div>
              {detailDispute.businessId && !detailDispute.isAdminOnly && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Against
                  </span>
                  <p className="font-medium text-gray-800 mt-0.5">
                    {typeof detailDispute.businessId === 'object'
                      ? detailDispute.businessId.name
                      : detailDispute.againstName || 'Business'}
                  </p>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Reason
                </span>
                <p className="font-medium text-gray-800 mt-0.5">
                  {detailDispute.reason.replace(/_/g, ' ')}
                </p>
              </div>
              {(detailDispute.disputedAmount ?? detailDispute.amount ?? detailDispute.referenceAmount) != null && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Disputed Amount
                  </span>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {formatCurrency(
                      (detailDispute.disputedAmount ?? detailDispute.amount ?? detailDispute.referenceAmount) as number,
                      detailDispute.currency,
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Description
              </h4>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                {detailDispute.description}
              </p>
            </div>

            {/* Resolution */}
            {(detailDispute.resolution || detailDispute.resolutionNotes) && (
              <div>
                <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Resolution
                </h4>
                <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">
                  {detailDispute.resolutionNotes || detailDispute.resolution}
                </p>
              </div>
            )}

            {/* ============================================================ */}
            {/* Messages thread                                               */}
            {/* ============================================================ */}
            <div className="flex flex-col border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-lg">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Conversation ({(detailDispute.messages || []).length})
                </div>
                <div className="flex items-center gap-2">
                  {!isThreadClosed && detailDispute.status === 'OPEN' && (
                    <button
                      onClick={() => handleChangeStatus('UNDER_REVIEW')}
                      className="text-[11px] bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"
                    >
                      Mark under review
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 p-3 space-y-3 overflow-y-auto" style={{ maxHeight: 320, minHeight: 180 }}>
                {(detailDispute.messages || []).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No messages yet.</p>
                ) : (
                  (detailDispute.messages || []).map((msg, i) => (
                    <MessageBubble key={msg._id || `${msg.senderId}-${msg.createdAt}-${i}`} msg={msg} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose */}
              {!isThreadClosed && (
                <div className="border-t bg-white rounded-b-lg">
                  <textarea
                    className="input border-0 rounded-none focus:ring-0 resize-none"
                    rows={3}
                    placeholder={isInternal ? 'Internal note (visible only to admins)' : 'Reply to the user…'}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className="flex items-center justify-between px-3 py-2 border-t">
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="accent-ruby-500"
                      />
                      <Lock className="w-3 h-3" />
                      Internal note
                    </label>
                    <button
                      onClick={handleSendReply}
                      disabled={!reply.trim() || sending}
                      className="inline-flex items-center gap-1.5 bg-ruby-500 text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-ruby-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {isInternal ? 'Save note' : 'Send reply'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {(detailDispute.status === 'OPEN' ||
              detailDispute.status === 'UNDER_REVIEW' ||
              detailDispute.status === 'ESCALATED' ||
              detailDispute.status === 'AWAITING_RESPONSE') && (
              <div className="flex justify-end">
                <button
                  className="btn-primary"
                  onClick={() => {
                    setDetailDispute(null);
                    setResolveModal(detailDispute);
                  }}
                >
                  <CheckCircle className="w-4 h-4" /> Resolve Dispute
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Resolve Modal */}
      <Modal
        isOpen={!!resolveModal}
        onClose={() => {
          setResolveModal(null);
          setResolution('');
          setRefundAmount('');
        }}
        title="Resolve Dispute"
      >
        {resolveModal && (
          <div className="space-y-4">
            <div>
              <label className="label">Action</label>
              <select
                className="input"
                value={resolutionAction}
                onChange={(e) =>
                  setResolutionAction(e.target.value as 'RESOLVED' | 'ESCALATED' | 'CLOSED')
                }
              >
                <option value="RESOLVED">Resolve</option>
                <option value="ESCALATED">Escalate</option>
                <option value="CLOSED">Close</option>
              </select>
            </div>
            <div>
              <label className="label">Resolution Notes</label>
              <textarea
                className="input"
                rows={3}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe the resolution..."
              />
            </div>
            <div>
              <label className="label">Refund Amount (optional)</label>
              <input
                type="number"
                className="input"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="btn-secondary"
                onClick={() => {
                  setResolveModal(null);
                  setResolution('');
                  setRefundAmount('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleResolve}
                disabled={resolving || !resolution}
              >
                {resolving ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Single chat bubble with role-aware coloring. */
function MessageBubble({ msg }: { msg: DisputeMessage }) {
  const role = (msg.senderRole || msg.sender || '').toString().toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isBusiness = role === 'BUSINESS' || role === 'BUSINESS_OWNER';
  const isInternal = !!msg.isInternal;

  const roleLabel = isAdmin ? 'Ruby+ Support' : isBusiness ? 'Business' : 'Customer';
  const roleClasses = isAdmin
    ? 'bg-ruby-50 border-ruby-200'
    : isBusiness
    ? 'bg-violet-50 border-violet-200'
    : 'bg-blue-50 border-blue-200';
  const roleBadge = isAdmin
    ? 'bg-ruby-100 text-ruby-700'
    : isBusiness
    ? 'bg-violet-100 text-violet-700'
    : 'bg-blue-100 text-blue-700';

  return (
    <div className={`border rounded-lg p-3 ${isInternal ? 'bg-yellow-50 border-yellow-200' : roleClasses}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${isInternal ? 'bg-yellow-200 text-yellow-900' : roleBadge}`}>
            {isInternal ? 'Internal note' : roleLabel}
          </span>
        </div>
        <span className="text-[11px] text-gray-500">{formatDateTime(msg.createdAt)}</span>
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.message || msg.text}</p>
      {msg.attachments && msg.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {msg.attachments.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-ruby-600 underline"
            >
              Attachment {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
