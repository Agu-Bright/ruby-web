'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Truck, Search, Eye, MoreHorizontal, UserPlus, RefreshCw, XCircle, MapPin,
  Clock, CheckCircle, AlertTriangle, Ban, ChevronDown, Loader2, Navigation, Phone, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, StatCard, type Column } from '@/components/ui';
import type { DeliveryJob, DeliveryJobFilterParams, DeliveryJobStatus, DeliveryStats } from '@/lib/types';
import { formatDate, formatDateTime, toLocationId, getDeliveryBusinessName, getDeliveryCustomerName } from '@/lib/utils';

const STATUS_OPTIONS: DeliveryJobStatus[] = ['CREATED', 'ASSIGNED', 'RIDER_ACCEPTED', 'RIDER_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'RIDER_AT_DROPOFF', 'DELIVERED', 'FAILED', 'CANCELLED'];
const TERMINAL_STATUSES: DeliveryJobStatus[] = ['DELIVERED', 'FAILED', 'CANCELLED'];

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-700', ASSIGNED: 'bg-blue-50 text-blue-700',
  RIDER_ACCEPTED: 'bg-indigo-50 text-indigo-700', RIDER_AT_PICKUP: 'bg-amber-50 text-amber-700',
  PICKED_UP: 'bg-purple-50 text-purple-700', IN_TRANSIT: 'bg-cyan-50 text-cyan-700',
  RIDER_AT_DROPOFF: 'bg-teal-50 text-teal-700', DELIVERED: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-700', CANCELLED: 'bg-gray-100 text-gray-600',
};

// ─── Action Dropdown ───
function ActionDropdown({ job, onAction, onView }: {
  job: DeliveryJob; onAction: (j: DeliveryJob, t: 'assign' | 'status' | 'cancel') => void;
  onView: (j: DeliveryJob) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const isTerminal = TERMINAL_STATUSES.includes(job.status);

  return (
    <div ref={ref} className="relative">
      <button ref={btnRef} onClick={(e) => {
        e.stopPropagation();
        if (!open && btnRef.current) { const r = btnRef.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, left: r.right - 192 }); }
        setOpen(!open);
      }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
        <MoreHorizontal className="w-4 h-4 text-gray-500" />
      </button>
      {open && (
        <div className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-fade-in" style={{ top: pos.top, left: pos.left }}>
          <button onClick={(e) => { e.stopPropagation(); onView(job); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Eye className="w-3.5 h-3.5" /> View Details
          </button>
          {['CREATED', 'ASSIGNED'].includes(job.status) && (
            <button onClick={(e) => { e.stopPropagation(); onAction(job, 'assign'); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50">
              <UserPlus className="w-3.5 h-3.5" /> Assign Rider
            </button>
          )}
          {!isTerminal && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onAction(job, 'status'); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <RefreshCw className="w-3.5 h-3.5" /> Update Status
              </button>
              <button onClick={(e) => { e.stopPropagation(); onAction(job, 'cancel'); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                <XCircle className="w-3.5 h-3.5" /> Cancel Job
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeliveryPage() {
  const { admin } = useAuth();
  const locationId = admin?.scope === 'LOCATION' && admin.locationIds.length === 1 ? toLocationId(admin.locationIds[0]) : undefined;
  const [filters, setFilters] = useState<DeliveryJobFilterParams>({ page: 1, limit: 20, ...(locationId ? { locationId } : {}) });
  const [search, setSearch] = useState('');
  const [detailJob, setDetailJob] = useState<DeliveryJob | null>(null);
  const [actionJob, setActionJob] = useState<DeliveryJob | null>(null);
  const [actionType, setActionType] = useState<'assign' | 'status' | 'cancel' | null>(null);

  // Assign rider form
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderVehicle, setRiderVehicle] = useState('');
  const [riderPlate, setRiderPlate] = useState('');
  // Status/cancel form
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const { data: jobs, meta, isLoading, refetch } = useApi<DeliveryJob[]>(() => api.delivery.listJobs(filters), [filters]);
  const { data: stats } = useApi<DeliveryStats>(() => api.delivery.stats({ locationId }), [locationId]);

  const { data: fullDetail } = useApi<DeliveryJob>(() => detailJob ? api.delivery.getJob(detailJob._id) : Promise.resolve({ success: true, data: detailJob! }), [detailJob?._id]);
  const displayJob = fullDetail || detailJob;

  const showError = useCallback((msg: string) => toast.error(msg), []);
  const opts = { onError: showError };
  const { mutate: assignRider, isLoading: assigning } = useMutation(({ id, data }: { id: string; data: { name: string; phone: string; vehicleType?: string; vehiclePlate?: string } }) => api.delivery.assignRider(id, data), opts);
  const { mutate: updateStatus, isLoading: updatingStatus } = useMutation(({ id, status, note }: { id: string; status: string; note?: string }) => api.delivery.updateJobStatus(id, status, note), opts);
  const { mutate: cancelJob, isLoading: cancellingJob } = useMutation(({ id, reason }: { id: string; reason: string }) => api.delivery.cancelJob(id, reason), opts);

  const closeAction = () => {
    setActionJob(null); setActionType(null);
    setRiderName(''); setRiderPhone(''); setRiderVehicle(''); setRiderPlate('');
    setNewStatus(''); setStatusNote(''); setCancelReason('');
  };

  const handleAssign = async () => {
    if (!actionJob || !riderName.trim() || !riderPhone.trim()) return;
    const r = await assignRider({ id: actionJob._id, data: { name: riderName, phone: riderPhone, vehicleType: riderVehicle || undefined, vehiclePlate: riderPlate || undefined } });
    if (r !== null) { toast.success('Rider assigned'); closeAction(); refetch(); }
  };
  const handleStatus = async () => {
    if (!actionJob || !newStatus) return;
    const r = await updateStatus({ id: actionJob._id, status: newStatus, note: statusNote || undefined });
    if (r !== null) { toast.success('Status updated'); closeAction(); refetch(); }
  };
  const handleCancel = async () => {
    if (!actionJob || !cancelReason.trim()) return;
    const r = await cancelJob({ id: actionJob._id, reason: cancelReason });
    if (r !== null) { toast.success('Delivery job cancelled'); closeAction(); refetch(); }
  };

  // Derive stats
  const totalJobs = stats?.total ?? 0;
  const statusMap: Record<string, number> = {};
  (stats?.statusBreakdown || []).forEach(s => { statusMap[s._id] = s.count; });
  const activeCount = (statusMap['ASSIGNED'] ?? 0) + (statusMap['RIDER_ACCEPTED'] ?? 0) + (statusMap['RIDER_AT_PICKUP'] ?? 0) + (statusMap['PICKED_UP'] ?? 0) + (statusMap['IN_TRANSIT'] ?? 0) + (statusMap['RIDER_AT_DROPOFF'] ?? 0);
  const deliveredCount = statusMap['DELIVERED'] ?? 0;
  const failedCount = statusMap['FAILED'] ?? 0;
  const pendingCount = statusMap['CREATED'] ?? 0;
  const cancelledCount = statusMap['CANCELLED'] ?? 0;

  const columns: Column<DeliveryJob>[] = [
    {
      key: 'id', header: 'Job',
      render: (j) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ring-1 ${TERMINAL_STATUSES.includes(j.status) ? 'bg-gray-50 ring-gray-200' : 'bg-gradient-to-br from-emerald-50 to-emerald-100 ring-emerald-200/50'}`}>
            <Truck className={`w-4 h-4 ${TERMINAL_STATUSES.includes(j.status) ? 'text-gray-400' : 'text-emerald-600'}`} />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 text-xs font-mono">{j._id.slice(-8).toUpperCase()}</div>
            {j.orderId && <div className="text-xs text-gray-500">Order: {typeof j.orderId === 'string' ? j.orderId.slice(-8) : j.orderId}</div>}
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (j) => <StatusBadge status={j.status} /> },
    {
      key: 'provider', header: 'Provider',
      render: (j) => {
        const colors: Record<string, string> = { MANUAL: 'bg-gray-100 text-gray-700', INTERNAL: 'bg-blue-50 text-blue-700', TOPSHIP: 'bg-purple-50 text-purple-700', GLOVO: 'bg-orange-50 text-orange-700' };
        return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${colors[j.provider] || 'bg-gray-100 text-gray-700'}`}>{j.provider}</span>;
      },
    },
    {
      key: 'business', header: 'Business',
      render: (j) => <span className="text-sm text-gray-600 truncate">{getDeliveryBusinessName(j) || '\u2014'}</span>,
    },
    {
      key: 'route', header: 'Route',
      render: (j) => (
        <div className="text-xs space-y-0.5 max-w-[180px]">
          <div className="flex items-center gap-1 text-gray-600"><div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /><span className="truncate">{j.pickup?.address || '\u2014'}</span></div>
          <div className="flex items-center gap-1 text-gray-600"><div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" /><span className="truncate">{j.dropoff?.address || '\u2014'}</span></div>
        </div>
      ),
    },
    {
      key: 'rider', header: 'Rider',
      render: (j) => j.riderInfo ? (
        <div className="text-sm"><div className="font-medium text-gray-700">{j.riderInfo.name}</div><div className="text-xs text-gray-500">{j.riderInfo.phone}</div></div>
      ) : <span className="text-xs text-gray-400 italic">Unassigned</span>,
    },
    { key: 'date', header: 'Date', render: (j) => <span className="text-sm text-gray-500">{formatDate(j.createdAt)}</span> },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (j) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); setDetailJob(j); }} className="p-1.5 rounded-lg hover:bg-gray-100" title="View details">
            <Eye className="w-4 h-4 text-gray-400" />
          </button>
          <ActionDropdown job={j} onAction={(job, t) => { setActionJob(job); setActionType(t); }} onView={setDetailJob} />
        </div>
      ),
    },
  ];

  const filtered = (jobs || []).filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return j._id.toLowerCase().includes(q) || (j.orderId && typeof j.orderId === 'string' && j.orderId.toLowerCase().includes(q)) || (j.riderInfo?.name || '').toLowerCase().includes(q) || getDeliveryBusinessName(j).toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Management" description="Track and manage delivery jobs across the platform" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Total Jobs" value={totalJobs} icon={Truck} />
        <StatCard title="Pending" value={pendingCount} icon={Clock} className={pendingCount > 0 ? 'ring-1 ring-amber-200' : ''} />
        <StatCard title="In Transit" value={activeCount} icon={Navigation} />
        <StatCard title="Delivered" value={deliveredCount} icon={CheckCircle} />
        <StatCard title="Failed" value={failedCount} icon={AlertTriangle} className={failedCount > 0 ? 'ring-1 ring-red-200' : ''} />
        <StatCard title="Cancelled" value={cancelledCount} icon={Ban} />
      </div>

      {/* Filters */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 placeholder:text-gray-400" placeholder="Search by job ID, order, rider, business..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="relative">
            <select className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={filters.status || ''} onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value || undefined) as DeliveryJobStatus | undefined, page: 1 }))}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <input type="date" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={filters.startDate || ''} onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value || undefined, page: 1 }))} />
          <input type="date" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={filters.endDate || ''} onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value || undefined, page: 1 }))} />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} meta={meta} isLoading={isLoading} emptyMessage="No delivery jobs found" currentPage={filters.page} onPageChange={(page) => setFilters(f => ({ ...f, page }))} />

      {/* Detail Modal */}
      <Modal isOpen={!!detailJob} onClose={() => setDetailJob(null)} title="Delivery Job Details" size="lg">
        {displayJob && <DeliveryDetailContent job={displayJob} onAction={(t) => { setDetailJob(null); setActionJob(displayJob); setActionType(t); }} />}
      </Modal>

      {/* Assign Rider Modal */}
      <Modal isOpen={actionType === 'assign'} onClose={closeAction} title="Assign Rider">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            Assign a rider to delivery job <strong>#{actionJob?._id.slice(-8).toUpperCase()}</strong>.
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Rider Name *</label>
            <input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={riderName} onChange={(e) => setRiderName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Phone *</label>
            <input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} placeholder="+234..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Vehicle Type</label>
              <input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={riderVehicle} onChange={(e) => setRiderVehicle(e.target.value)} placeholder="e.g. Motorcycle" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Plate Number</label>
              <input className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={riderPlate} onChange={(e) => setRiderPlate(e.target.value)} placeholder="e.g. LAG 234 A5" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <button onClick={closeAction} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={handleAssign} disabled={!riderName.trim() || !riderPhone.trim() || assigning} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {assigning ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning...</> : 'Assign Rider'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal isOpen={actionType === 'status'} onClose={closeAction} title="Update Delivery Status">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">New Status *</label>
            <div className="relative">
              <select className="w-full appearance-none px-3 py-2 pr-8 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="">Select status...</option>
                {STATUS_OPTIONS.filter(s => s !== actionJob?.status).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Note (optional)</label>
            <textarea className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 resize-none" rows={2} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Optional note..." />
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <button onClick={closeAction} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={handleStatus} disabled={!newStatus || updatingStatus} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {updatingStatus ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Status'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Job Modal */}
      <Modal isOpen={actionType === 'cancel'} onClose={closeAction} title="Cancel Delivery Job">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            Cancel delivery job <strong>#{actionJob?._id.slice(-8).toUpperCase()}</strong>? The order status may also need to be updated separately.
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Reason *</label>
            <textarea className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 resize-none" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Cancellation reason..." />
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <button onClick={closeAction} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Go Back</button>
            <button onClick={handleCancel} disabled={!cancelReason.trim() || cancellingJob} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
              {cancellingJob ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling...</> : 'Cancel Job'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Detail Content ───
function DeliveryDetailContent({ job, onAction }: { job: DeliveryJob; onAction: (t: 'assign' | 'status' | 'cancel') => void }) {
  const isTerminal = TERMINAL_STATUSES.includes(job.status);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 font-mono">#{job._id.slice(-8).toUpperCase()}</h3>
          <p className="text-sm text-gray-500">{formatDateTime(job.createdAt)}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Provider</span>
          <p className="text-sm font-medium text-gray-900 mt-0.5">{job.provider}</p>
        </div>
        {getDeliveryBusinessName(job) && (
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Business</span>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{getDeliveryBusinessName(job)}</p>
          </div>
        )}
        {getDeliveryCustomerName(job) && (
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Customer</span>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{getDeliveryCustomerName(job)}</p>
          </div>
        )}
        {job.distanceKm && (
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Distance</span>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{job.distanceKm.toFixed(1)} km</p>
          </div>
        )}
      </div>

      {/* Route */}
      <div>
        <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Route</h4>
        <div className="space-y-3">
          <RoutePoint type="pickup" address={job.pickup?.address} contact={job.pickup?.contactName} phone={job.pickup?.contactPhone} instructions={job.pickup?.instructions} />
          <RoutePoint type="dropoff" address={job.dropoff?.address} contact={job.dropoff?.contactName} phone={job.dropoff?.contactPhone} instructions={job.dropoff?.instructions} />
        </div>
      </div>

      {/* Rider */}
      {job.riderInfo && (
        <div>
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Rider</h4>
          <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{job.riderInfo.name}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{job.riderInfo.phone}</span>
                {job.riderInfo.vehicleType && <span>{job.riderInfo.vehicleType}{job.riderInfo.vehiclePlate ? ` \u2022 ${job.riderInfo.vehiclePlate}` : ''}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ETA */}
      {(job.estimatedPickupAt || job.estimatedDeliveryAt) && (
        <div className="grid grid-cols-2 gap-3">
          {job.estimatedPickupAt && (
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Est. Pickup</span>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDateTime(job.estimatedPickupAt)}</p>
            </div>
          )}
          {job.estimatedDeliveryAt && (
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Est. Delivery</span>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDateTime(job.estimatedDeliveryAt)}</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {job.statusTimeline && job.statusTimeline.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Timeline</h4>
          <div className="space-y-0">
            {job.statusTimeline.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 relative">
                {i < job.statusTimeline!.length - 1 && <div className="absolute left-[7px] top-4 w-px h-full bg-gray-200" />}
                <div className={`mt-1 w-[14px] h-[14px] rounded-full border-2 shrink-0 z-10 ${i === 0 ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`} />
                <div className="pb-4 min-w-0">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[ev.status] || 'bg-gray-100 text-gray-600'}`}>{ev.status.replace(/_/g, ' ')}</span>
                  <div className="text-xs text-gray-500 mt-0.5">{formatDateTime(ev.timestamp)}</div>
                  {ev.note && <div className="text-xs text-gray-400 mt-0.5">{ev.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failure */}
      {job.failureReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">Failure Reason</span>
          <p className="text-sm text-red-800 mt-1">{job.failureReason}</p>
        </div>
      )}

      {/* Proof of Delivery */}
      {job.proofOfDeliveryUrl && (
        <div>
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Proof of Delivery</h4>
          <img src={job.proofOfDeliveryUrl} alt="Proof of delivery" className="w-full max-w-xs rounded-lg border border-gray-200" />
        </div>
      )}

      {/* Actions */}
      {!isTerminal && (
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {['CREATED', 'ASSIGNED'].includes(job.status) && (
            <button onClick={() => onAction('assign')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
              <UserPlus className="w-3.5 h-3.5" /> Assign Rider
            </button>
          )}
          <button onClick={() => onAction('status')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
            <RefreshCw className="w-3.5 h-3.5" /> Update Status
          </button>
          <button onClick={() => onAction('cancel')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
            <XCircle className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function RoutePoint({ type, address, contact, phone, instructions }: { type: 'pickup' | 'dropoff'; address?: string; contact?: string; phone?: string; instructions?: string }) {
  const isPickup = type === 'pickup';
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isPickup ? 'bg-red-100' : 'bg-green-100'}`}>
        <MapPin className={`w-3.5 h-3.5 ${isPickup ? 'text-red-500' : 'text-green-500'}`} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 font-medium uppercase">{type}</div>
        <div className="text-sm font-medium text-gray-900">{address || '\u2014'}</div>
        {contact && <div className="text-xs text-gray-500">{contact}{phone ? ` \u2022 ${phone}` : ''}</div>}
        {instructions && <div className="text-xs text-amber-600 italic mt-0.5">{instructions}</div>}
      </div>
    </div>
  );
}
