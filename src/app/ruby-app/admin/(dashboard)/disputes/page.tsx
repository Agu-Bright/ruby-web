'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, Eye, CheckCircle, ShoppingCart, CalendarCheck, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, type Column } from '@/components/ui';
import type { Dispute, DisputeFilterParams, DisputeStatus, DisputeType, DisputeResolutionRequest } from '@/lib/types';
import { formatDate, formatDateTime, formatCurrency, toLocationId } from '@/lib/utils';

const STATUS_OPTIONS: DisputeStatus[] = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED', 'CLOSED'];

export default function DisputesPage() {
  const { admin } = useAuth();
  const [filters, setFilters] = useState<DisputeFilterParams>({
    page: 1,
    limit: 20,
    ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1 ? { locationId: toLocationId(admin.locationIds[0]) } : {}),
  });
  const [detailDispute, setDetailDispute] = useState<Dispute | null>(null);
  const [resolveModal, setResolveModal] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolutionAction, setResolutionAction] = useState<'RESOLVED' | 'ESCALATED' | 'CLOSED'>('RESOLVED');
  const [refundAmount, setRefundAmount] = useState('');

  const { data: disputes, meta, isLoading, refetch } = useApi<Dispute[]>(
    () => api.disputes.list(filters),
    [filters]
  );

  const { mutate: resolveDispute, isLoading: resolving } = useMutation(
    ({ id, data }: { id: string; data: DisputeResolutionRequest }) => api.disputes.resolve(id, data)
  );

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

  const columns: Column<Dispute>[] = [
    {
      key: 'dispute',
      header: 'Dispute',
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            d.type === 'ORDER' ? 'bg-blue-50' : 'bg-violet-50'
          }`}>
            {d.type === 'ORDER' ? <ShoppingCart className="w-4 h-4 text-blue-600" /> : <CalendarCheck className="w-4 h-4 text-violet-600" />}
          </div>
          <div>
            <div className="font-medium text-gray-900">#{d._id.slice(-8)}</div>
            <div className="text-xs text-gray-500">{d.type} dispute</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (d) => <span className="text-sm text-gray-600 line-clamp-1">{d.reason}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (d) => <span className="text-sm font-medium">{d.amount ? formatCurrency(d.amount, d.currency) : '—'}</span>,
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
          <button onClick={(e) => { e.stopPropagation(); setDetailDispute(d); }} className="p-1.5 rounded hover:bg-gray-100" title="View">
            <Eye className="w-3.5 h-3.5 text-gray-500" />
          </button>
          {(d.status === 'OPEN' || d.status === 'UNDER_REVIEW' || d.status === 'ESCALATED') && (
            <button onClick={(e) => { e.stopPropagation(); setResolveModal(d); }} className="p-1.5 rounded hover:bg-green-50" title="Resolve">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disputes"
        description="Manage order and booking disputes"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input w-auto"
          value={filters.status || ''}
          onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value || undefined) as DisputeStatus | undefined, page: 1 }))}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select
          className="input w-auto"
          value={filters.type || ''}
          onChange={(e) => setFilters(f => ({ ...f, type: (e.target.value || undefined) as DisputeType | undefined, page: 1 }))}
        >
          <option value="">All types</option>
          <option value="ORDER">Order</option>
          <option value="BOOKING">Booking</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={disputes || []}
        meta={meta}
        isLoading={isLoading}
        emptyMessage="No disputes found"
        currentPage={filters.page}
        onPageChange={(page) => setFilters(f => ({ ...f, page }))}
      />

      {/* Detail Modal */}
      <Modal isOpen={!!detailDispute} onClose={() => setDetailDispute(null)} title="Dispute Details" size="lg">
        {detailDispute && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Dispute #{detailDispute._id.slice(-8)}</h3>
                <p className="text-sm text-gray-500">{detailDispute.type} · {formatDateTime(detailDispute.createdAt)}</p>
              </div>
              <StatusBadge status={detailDispute.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Filed By</span>
                <p className="font-medium">{detailDispute.filedByName || detailDispute.filedById}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Against</span>
                <p className="font-medium">{detailDispute.againstName || detailDispute.againstId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Reference</span>
                <p className="font-medium">{detailDispute.referenceId}</p>
              </div>
              {detailDispute.amount && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-xs text-gray-500 uppercase">Disputed Amount</span>
                  <p className="font-semibold">{formatCurrency(detailDispute.amount, detailDispute.currency)}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Reason</h4>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detailDispute.reason}</p>
            </div>

            {detailDispute.resolution && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Resolution</h4>
                <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{detailDispute.resolution}</p>
              </div>
            )}

            {detailDispute.messages && detailDispute.messages.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Messages</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {detailDispute.messages.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                      <div>
                        <span className="font-medium">{msg.sender || 'User'}</span>
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="text-gray-500 text-xs">{formatDateTime(msg.createdAt)}</span>
                        <p className="text-gray-700">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(detailDispute.status === 'OPEN' || detailDispute.status === 'UNDER_REVIEW' || detailDispute.status === 'ESCALATED') && (
              <div className="flex justify-end">
                <button className="btn-primary" onClick={() => { setDetailDispute(null); setResolveModal(detailDispute); }}>
                  <CheckCircle className="w-4 h-4" /> Resolve Dispute
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Resolve Modal */}
      <Modal isOpen={!!resolveModal} onClose={() => { setResolveModal(null); setResolution(''); setRefundAmount(''); }} title="Resolve Dispute">
        {resolveModal && (
          <div className="space-y-4">
            <div>
              <label className="label">Action</label>
              <select className="input" value={resolutionAction} onChange={(e) => setResolutionAction(e.target.value as 'RESOLVED' | 'ESCALATED' | 'CLOSED')}>
                <option value="RESOLVED">Resolve</option>
                <option value="ESCALATED">Escalate</option>
                <option value="CLOSED">Close</option>
              </select>
            </div>
            <div>
              <label className="label">Resolution Notes</label>
              <textarea className="input" rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Describe the resolution..." />
            </div>
            <div>
              <label className="label">Refund Amount (optional)</label>
              <input type="number" className="input" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => { setResolveModal(null); setResolution(''); setRefundAmount(''); }}>Cancel</button>
              <button className="btn-primary" onClick={handleResolve} disabled={resolving || !resolution}>
                {resolving ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
