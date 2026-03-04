'use client';

import { useState } from 'react';
import { Truck, Search, Eye, MoreHorizontal, UserPlus, RefreshCw, XCircle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, type Column } from '@/components/ui';
import type { DeliveryJob, DeliveryJobFilterParams, DeliveryJobStatus } from '@/lib/types';
import { formatDate, formatDateTime, toLocationId } from '@/lib/utils';

const STATUS_OPTIONS: DeliveryJobStatus[] = ['CREATED', 'ASSIGNED', 'RIDER_ACCEPTED', 'RIDER_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'RIDER_AT_DROPOFF', 'DELIVERED', 'FAILED', 'CANCELLED'];

export default function DeliveryPage() {
  const { admin } = useAuth();
  const [filters, setFilters] = useState<DeliveryJobFilterParams>({
    page: 1,
    limit: 20,
    ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1 ? { locationId: toLocationId(admin.locationIds[0]) } : {}),
  });
  const [search, setSearch] = useState('');
  const [detailJob, setDetailJob] = useState<DeliveryJob | null>(null);
  const [actionJob, setActionJob] = useState<DeliveryJob | null>(null);
  const [actionType, setActionType] = useState<'assign' | 'status' | 'cancel' | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Assign rider form
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderVehicleType, setRiderVehicleType] = useState('');
  const [riderPlate, setRiderPlate] = useState('');

  // Status/cancel form
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const { data: jobs, meta, isLoading, refetch } = useApi<DeliveryJob[]>(
    () => api.delivery.listJobs(filters),
    [filters]
  );

  const assignMutation = useMutation(
    async () => {
      return await api.delivery.assignRider(actionJob!._id, { name: riderName, phone: riderPhone, vehicleType: riderVehicleType || undefined, vehiclePlate: riderPlate || undefined });
    }
  );

  const statusMutation = useMutation(
    async () => {
      return await api.delivery.updateJobStatus(actionJob!._id, newStatus, statusNote || undefined);
    }
  );

  const cancelMutation = useMutation(
    async () => {
      return await api.delivery.cancelJob(actionJob!._id, cancelReason);
    }
  );

  const handleAssignConfirm = async () => {
    const result = await assignMutation.mutate();
    if (result !== null) {
      toast.success('Rider assigned');
      closeAction();
      refetch();
    }
  };

  const handleStatusConfirm = async () => {
    const result = await statusMutation.mutate();
    if (result !== null) {
      toast.success('Status updated');
      closeAction();
      refetch();
    }
  };

  const handleCancelConfirm = async () => {
    const result = await cancelMutation.mutate();
    if (result !== null) {
      toast.success('Delivery job cancelled');
      closeAction();
      refetch();
    }
  };

  const openAction = (job: DeliveryJob, type: 'assign' | 'status' | 'cancel') => {
    setActionJob(job);
    setActionType(type);
    setActiveDropdown(null);
  };

  const closeAction = () => {
    setActionJob(null);
    setActionType(null);
    setRiderName(''); setRiderPhone(''); setRiderVehicleType(''); setRiderPlate('');
    setNewStatus(''); setStatusNote('');
    setCancelReason('');
  };

  const columns: Column<DeliveryJob>[] = [
    {
      key: 'id',
      header: 'Job',
      render: (j) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900 text-xs">{j._id.slice(-8)}</div>
            {j.orderId && <div className="text-xs text-gray-500">Order: {j.orderId.slice(-8)}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (j) => <StatusBadge status={j.status} />,
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (j) => <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100">{j.provider}</span>,
    },
    {
      key: 'pickup',
      header: 'Pickup',
      render: (j) => <span className="text-sm text-gray-600 truncate max-w-[150px] block">{j.pickup?.address || '—'}</span>,
    },
    {
      key: 'dropoff',
      header: 'Dropoff',
      render: (j) => <span className="text-sm text-gray-600 truncate max-w-[150px] block">{j.dropoff?.address || '—'}</span>,
    },
    {
      key: 'rider',
      header: 'Rider',
      render: (j) => j.riderInfo ? (
        <div className="text-sm">
          <div className="font-medium">{j.riderInfo.name}</div>
          <div className="text-xs text-gray-500">{j.riderInfo.phone}</div>
        </div>
      ) : <span className="text-xs text-gray-400">Unassigned</span>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (j) => <span className="text-sm text-gray-500">{formatDate(j.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (j) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setDetailJob(j); }} className="p-1.5 rounded hover:bg-gray-100">
            <Eye className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === j._id ? null : j._id); }}
              className="p-1.5 rounded hover:bg-gray-100"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {activeDropdown === j._id && (
              <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                {['CREATED', 'ASSIGNED'].includes(j.status) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openAction(j, 'assign'); }}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Assign Rider
                  </button>
                )}
                {!['DELIVERED', 'FAILED', 'CANCELLED'].includes(j.status) && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); openAction(j, 'status'); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Update Status
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openAction(j, 'cancel'); }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel Job
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  const filtered = (jobs || []).filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return j._id.toLowerCase().includes(q)
      || (j.orderId || '').toLowerCase().includes(q)
      || (j.riderInfo?.name || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6" onClick={() => setActiveDropdown(null)}>
      <PageHeader
        title="Delivery Management"
        description="Track and manage delivery jobs"
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search jobs..."
              className="input pl-9 bg-gray-50 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-auto"
            value={filters.status || ''}
            onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value || undefined) as DeliveryJobStatus | undefined, page: 1 }))}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <input
            type="date"
            className="input w-auto"
            value={filters.startDate || ''}
            onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value || undefined, page: 1 }))}
          />
          <input
            type="date"
            className="input w-auto"
            value={filters.endDate || ''}
            onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value || undefined, page: 1 }))}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        meta={meta}
        isLoading={isLoading}
        emptyMessage="No delivery jobs found"
        currentPage={filters.page}
        onPageChange={(page) => setFilters(f => ({ ...f, page }))}
      />

      {/* Detail Modal */}
      <Modal isOpen={!!detailJob} onClose={() => setDetailJob(null)} title="Delivery Job Details" size="lg">
        {detailJob && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Job #{detailJob._id.slice(-8)}</h3>
                <p className="text-sm text-gray-500">{formatDateTime(detailJob.createdAt)}</p>
              </div>
              <StatusBadge status={detailJob.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Provider</span>
                <p className="font-medium">{detailJob.provider}</p>
              </div>
              {detailJob.orderId && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-xs text-gray-500 uppercase">Order ID</span>
                  <p className="font-medium">{detailJob.orderId.slice(-8)}</p>
                </div>
              )}
            </div>

            {/* Route */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Route</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Pickup</div>
                    <div className="text-sm font-medium">{detailJob.pickup?.address || '—'}</div>
                    {detailJob.pickup?.contactName && <div className="text-xs text-gray-500">{detailJob.pickup.contactName} · {detailJob.pickup.contactPhone}</div>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Dropoff</div>
                    <div className="text-sm font-medium">{detailJob.dropoff?.address || '—'}</div>
                    {detailJob.dropoff?.contactName && <div className="text-xs text-gray-500">{detailJob.dropoff.contactName} · {detailJob.dropoff.contactPhone}</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Rider */}
            {detailJob.riderInfo && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Rider</h4>
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium">{detailJob.riderInfo.name}</p>
                  <p className="text-gray-500">{detailJob.riderInfo.phone}</p>
                  {detailJob.riderInfo.vehicleType && <p className="text-gray-500">{detailJob.riderInfo.vehicleType} — {detailJob.riderInfo.vehiclePlate}</p>}
                </div>
              </div>
            )}

            {/* Timeline */}
            {detailJob.statusTimeline && detailJob.statusTimeline.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Timeline</h4>
                <div className="space-y-3">
                  {detailJob.statusTimeline.map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                      <div>
                        <div className="text-sm font-medium">{event.status.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-gray-500">{formatDateTime(event.timestamp)}</div>
                        {event.note && <div className="text-xs text-gray-400 mt-0.5">{event.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailJob.failureReason && (
              <div className="bg-red-50 rounded-lg p-3 text-sm">
                <span className="text-xs text-red-600 uppercase font-medium">Failure Reason</span>
                <p className="text-red-800 mt-1">{detailJob.failureReason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Assign Rider Modal */}
      <Modal isOpen={actionType === 'assign'} onClose={closeAction} title="Assign Rider">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Rider Name *</label>
            <input className="input w-full" value={riderName} onChange={(e) => setRiderName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Phone *</label>
            <input className="input w-full" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} placeholder="+234..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Vehicle Type</label>
              <input className="input w-full" value={riderVehicleType} onChange={(e) => setRiderVehicleType(e.target.value)} placeholder="e.g. Motorcycle" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Plate Number</label>
              <input className="input w-full" value={riderPlate} onChange={(e) => setRiderPlate(e.target.value)} placeholder="e.g. LAG 234 A5" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={closeAction} className="btn btn-ghost">Cancel</button>
            <button
              onClick={handleAssignConfirm}
              disabled={!riderName.trim() || !riderPhone.trim() || assignMutation.isLoading}
              className="btn bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {assignMutation.isLoading ? 'Assigning...' : 'Assign Rider'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal isOpen={actionType === 'status'} onClose={closeAction} title="Update Delivery Status">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">New Status *</label>
            <select className="input w-full" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="">Select status...</option>
              {STATUS_OPTIONS.filter(s => s !== actionJob?.status).map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Note (optional)</label>
            <textarea className="input w-full min-h-[60px]" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Optional note..." />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={closeAction} className="btn btn-ghost">Cancel</button>
            <button
              onClick={handleStatusConfirm}
              disabled={!newStatus || statusMutation.isLoading}
              className="btn bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {statusMutation.isLoading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Job Modal */}
      <Modal isOpen={actionType === 'cancel'} onClose={closeAction} title="Cancel Delivery Job">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
            This will cancel the delivery job. The order status may also need to be updated separately.
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Reason *</label>
            <textarea className="input w-full min-h-[80px]" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Cancellation reason..." />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={closeAction} className="btn btn-ghost">Go Back</button>
            <button
              onClick={handleCancelConfirm}
              disabled={!cancelReason.trim() || cancelMutation.isLoading}
              className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {cancelMutation.isLoading ? 'Cancelling...' : 'Cancel Job'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
