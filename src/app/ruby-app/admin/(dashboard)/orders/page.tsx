'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ShoppingCart, Search, Eye, Package, MoreHorizontal, XCircle, RefreshCw,
  Clock, CheckCircle, Truck, Store, User, MapPin, DollarSign, TrendingUp,
  Ban, ChevronDown, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, StatCard, type Column } from '@/components/ui';
import type { Order, OrderFilterParams, OrderStatus, OrderStats } from '@/lib/types';
import {
  formatDate, formatDateTime, formatCurrency, toLocationId,
  getOrderBusinessName, getOrderBusinessLogo, getOrderCustomerName,
  getOrderCustomerEmail, getOrderCustomerPhone, getOrderFulfillmentType,
  getOrderTotal, getOrderSubtotal, getOrderDeliveryFee, getOrderPlatformFee,
  getOrderDiscount, getOrderNotes, getOrderDeliveryAddressStr,
  getItemPrice, getItemTotal,
} from '@/lib/utils';

const STATUS_OPTIONS: OrderStatus[] = ['PLACED', 'ACCEPTED', 'REJECTED', 'PREPARING', 'READY', 'DISPATCHED', 'PICKED_UP', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
const CANCELLABLE_STATUSES: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'];

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-50 text-blue-700', ACCEPTED: 'bg-indigo-50 text-indigo-700',
  REJECTED: 'bg-red-50 text-red-700', PREPARING: 'bg-amber-50 text-amber-700',
  READY: 'bg-emerald-50 text-emerald-700', DISPATCHED: 'bg-purple-50 text-purple-700',
  PICKED_UP: 'bg-teal-50 text-teal-700', DELIVERED: 'bg-green-50 text-green-700',
  COMPLETED: 'bg-green-50 text-green-700', CANCELLED: 'bg-gray-100 text-gray-600',
};

// ─── Action Dropdown ───
function ActionDropdown({ order, onAction, onView, isSuperAdmin }: {
  order: Order; onAction: (o: Order, t: 'cancel' | 'override') => void;
  onView: (o: Order) => void; isSuperAdmin: boolean;
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
          <button onClick={(e) => { e.stopPropagation(); onView(order); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Eye className="w-3.5 h-3.5" /> View Details
          </button>
          {CANCELLABLE_STATUSES.includes(order.status) && (
            <button onClick={(e) => { e.stopPropagation(); onAction(order, 'cancel'); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <XCircle className="w-3.5 h-3.5" /> Cancel Order
            </button>
          )}
          {isSuperAdmin && (
            <button onClick={(e) => { e.stopPropagation(); onAction(order, 'override'); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50">
              <RefreshCw className="w-3.5 h-3.5" /> Override Status
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { admin } = useAuth();
  const locationId = admin?.scope === 'LOCATION' && admin.locationIds.length === 1 ? toLocationId(admin.locationIds[0]) : undefined;
  const [filters, setFilters] = useState<OrderFilterParams>({ page: 1, limit: 20, ...(locationId ? { locationId } : {}) });
  const [search, setSearch] = useState('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [actionOrder, setActionOrder] = useState<Order | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'override' | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const isSuperAdmin = admin?.roles?.includes('super_admin') ?? false;

  const { data: orders, meta, isLoading, refetch } = useApi<Order[]>(() => api.orders.list({ ...filters, search: search || undefined }), [filters, search]);
  const { data: stats } = useApi<OrderStats>(() => api.orders.stats({ locationId }), [locationId]);
  const { data: fullDetail } = useApi<Order>(() => detailOrder ? api.orders.get(detailOrder._id) : Promise.resolve({ success: true, data: detailOrder! }), [detailOrder?._id]);
  const displayOrder = fullDetail || detailOrder;

  const showError = useCallback((msg: string) => toast.error(msg), []);
  const opts = { onError: showError };
  const { mutate: cancelOrder, isLoading: cancelling } = useMutation(({ id, reason }: { id: string; reason: string }) => api.orders.cancel(id, reason), opts);
  const { mutate: overrideOrder, isLoading: overriding } = useMutation(({ id, status, note }: { id: string; status: string; note?: string }) => api.orders.updateStatus(id, status, note), opts);

  const closeAction = () => { setActionOrder(null); setActionType(null); setCancelReason(''); setOverrideStatus(''); setOverrideNote(''); };

  const handleCancel = async () => {
    if (!actionOrder || !cancelReason.trim()) return;
    const r = await cancelOrder({ id: actionOrder._id, reason: cancelReason });
    if (r !== null) { toast.success('Order cancelled'); closeAction(); refetch(); }
  };
  const handleOverride = async () => {
    if (!actionOrder || !overrideStatus) return;
    const r = await overrideOrder({ id: actionOrder._id, status: overrideStatus, note: overrideNote || undefined });
    if (r !== null) { toast.success('Order status updated'); closeAction(); refetch(); }
  };

  const totalOrders = stats?.total ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const pendingCount = (stats?.byStatus?.PLACED?.count ?? 0) + (stats?.byStatus?.ACCEPTED?.count ?? 0);
  const completedCount = stats?.byStatus?.COMPLETED?.count ?? 0;
  const cancelledCount = stats?.byStatus?.CANCELLED?.count ?? 0;
  const activeCount = Math.max(0, totalOrders - completedCount - cancelledCount - (stats?.byStatus?.REJECTED?.count ?? 0));

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber', header: 'Order',
      render: (o) => (
        <div className="flex items-center gap-3">
          {getOrderBusinessLogo(o) ? (
            <img src={getOrderBusinessLogo(o)} alt="" className="w-9 h-9 rounded-lg object-cover ring-1 ring-gray-200" />
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center ring-1 ring-blue-200/50">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-gray-900">#{o.orderNumber || o._id.slice(-8)}</div>
            <div className="text-xs text-gray-500">{o.items?.length || 0} items</div>
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    {
      key: 'fulfillment', header: 'Type',
      render: (o) => {
        const t = getOrderFulfillmentType(o);
        return (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${t === 'DELIVERY' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
            {t === 'DELIVERY' ? <Truck className="w-3 h-3" /> : <Store className="w-3 h-3" />}
            {t === 'DELIVERY' ? 'Delivery' : 'Pickup'}
          </span>
        );
      },
    },
    { key: 'customer', header: 'Customer', render: (o) => <span className="text-sm text-gray-700 font-medium truncate">{getOrderCustomerName(o) || 'Unknown'}</span> },
    { key: 'business', header: 'Business', render: (o) => <span className="text-sm text-gray-600 truncate">{getOrderBusinessName(o) || '\u2014'}</span> },
    { key: 'total', header: 'Total', render: (o) => <span className="text-sm font-semibold text-gray-900">{formatCurrency(getOrderTotal(o), o.currency)}</span> },
    {
      key: 'payment', header: 'Payment',
      render: (o) => {
        const ps = o.paymentStatus || 'PENDING';
        const c: Record<string, string> = { PAID: 'bg-green-50 text-green-700', PENDING: 'bg-amber-50 text-amber-700', FAILED: 'bg-red-50 text-red-700', REFUNDED: 'bg-gray-100 text-gray-600' };
        return <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${c[ps] || 'bg-gray-100 text-gray-600'}`}>{ps}</span>;
      },
    },
    { key: 'created', header: 'Date', render: (o) => <span className="text-sm text-gray-500">{formatDate(o.createdAt)}</span> },
    {
      key: 'actions', header: '', className: 'w-20',
      render: (o) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); setDetailOrder(o); }} className="p-1.5 rounded-lg hover:bg-gray-100" title="View details">
            <Eye className="w-4 h-4 text-gray-400" />
          </button>
          <ActionDropdown order={o} onAction={(ord, t) => { setActionOrder(ord); setActionType(t); }} onView={setDetailOrder} isSuperAdmin={isSuperAdmin} />
        </div>
      ),
    },
  ];

  const filtered = (orders || []).filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (o.orderNumber || '').toLowerCase().includes(q) || getOrderCustomerName(o).toLowerCase().includes(q) || getOrderBusinessName(o).toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Monitor and manage all shopping orders across the platform" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Total Orders" value={totalOrders} icon={ShoppingCart} />
        <StatCard title="Pending" value={pendingCount} icon={Clock} className={pendingCount > 0 ? 'ring-1 ring-amber-200' : ''} />
        <StatCard title="Active" value={activeCount} icon={TrendingUp} />
        <StatCard title="Completed" value={completedCount} icon={CheckCircle} />
        <StatCard title="Cancelled" value={cancelledCount} icon={Ban} />
        <StatCard title="Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} />
      </div>

      {/* Filters */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 placeholder:text-gray-400" placeholder="Search by order #, customer, business..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="relative">
            <select className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={filters.status || ''} onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value || undefined) as OrderStatus | undefined, page: 1 }))}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <input type="date" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={filters.startDate || ''} onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value || undefined, page: 1 }))} />
          <input type="date" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={filters.endDate || ''} onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value || undefined, page: 1 }))} />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} meta={meta} isLoading={isLoading} emptyMessage="No orders found" currentPage={filters.page} onPageChange={(page) => setFilters(f => ({ ...f, page }))} />

      {/* Detail Modal */}
      <Modal isOpen={!!detailOrder} onClose={() => setDetailOrder(null)} title="Order Details" size="lg">
        {displayOrder && <OrderDetailContent order={displayOrder} isSuperAdmin={isSuperAdmin} onAction={(t) => { setDetailOrder(null); setActionOrder(displayOrder); setActionType(t); }} />}
      </Modal>

      {/* Cancel Modal */}
      <Modal isOpen={actionType === 'cancel'} onClose={closeAction} title="Cancel Order">
        {actionOrder && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              Cancel order <strong>#{actionOrder.orderNumber || actionOrder._id.slice(-8)}</strong>? This cannot be undone.
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Cancellation Reason *</label>
              <textarea className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 resize-none" rows={3} placeholder="Explain why..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button onClick={closeAction} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleCancel} disabled={!cancelReason.trim() || cancelling} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                {cancelling ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling...</> : 'Cancel Order'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Override Modal */}
      <Modal isOpen={actionType === 'override'} onClose={closeAction} title="Override Order Status">
        {actionOrder && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">Override status for <strong>#{actionOrder.orderNumber || actionOrder._id.slice(-8)}</strong>.</p>
              <p className="text-xs text-blue-600 mt-1">Current: <StatusBadge status={actionOrder.status} /></p>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">New Status *</label>
              <div className="relative">
                <select className="w-full appearance-none px-3 py-2 pr-8 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}>
                  <option value="">Select status...</option>
                  {STATUS_OPTIONS.filter(s => s !== actionOrder.status).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Note (optional)</label>
              <textarea className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 resize-none" rows={2} placeholder="Reason for override..." value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button onClick={closeAction} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleOverride} disabled={!overrideStatus || overriding} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {overriding ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Status'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Order Detail Content ───
function OrderDetailContent({ order, isSuperAdmin, onAction }: { order: Order; isSuperAdmin: boolean; onAction: (t: 'cancel' | 'override') => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">#{order.orderNumber || order._id.slice(-8)}</h3>
          <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {order.paymentStatus && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${order.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {order.paymentStatus}
            </span>
          )}
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard icon={Store} label="Business" value={getOrderBusinessName(order) || 'Unknown'} />
        <InfoCard icon={User} label="Customer" value={getOrderCustomerName(order) || 'Unknown'} sub={getOrderCustomerEmail(order) || getOrderCustomerPhone(order)} />
        <InfoCard icon={Truck} label="Fulfillment" value={getOrderFulfillmentType(order) === 'DELIVERY' ? 'Delivery' : 'Pickup'} sub={order.estimatedPrepTime ? `Prep: ${order.estimatedPrepTime} min` : undefined} />
        <InfoCard icon={DollarSign} label="Total" value={formatCurrency(getOrderTotal(order), order.currency)} large />
      </div>

      {/* Delivery Address */}
      {getOrderDeliveryAddressStr(order) && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1"><MapPin className="w-3 h-3 text-gray-400" /><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Delivery Address</span></div>
          <p className="text-sm font-medium text-gray-900">{getOrderDeliveryAddressStr(order)}</p>
        </div>
      )}

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Items ({order.items.length})</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-gray-400" /></div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 block truncate">{item.name}</span>
                    <span className="text-xs text-gray-500">{formatCurrency(getItemPrice(item), order.currency)} x {item.quantity}</span>
                    {item.variations && item.variations.length > 0 && <div className="text-xs text-gray-400 mt-0.5">{item.variations.map(v => `${v.name}: ${v.option}`).join(', ')}</div>}
                    {item.specialInstructions && <div className="text-xs text-amber-600 mt-0.5 italic">{item.specialInstructions}</div>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0 ml-4">{formatCurrency(getItemTotal(item), order.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fee Breakdown */}
      <div>
        <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Fee Breakdown</h4>
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
          <FeeRow label="Subtotal" amount={getOrderSubtotal(order)} currency={order.currency} />
          {getOrderDeliveryFee(order) > 0 && <FeeRow label="Delivery Fee" amount={getOrderDeliveryFee(order)} currency={order.currency} />}
          {getOrderPlatformFee(order) > 0 && <FeeRow label="Platform Fee" amount={getOrderPlatformFee(order)} currency={order.currency} />}
          {(order.fees?.serviceFee ?? 0) > 0 && <FeeRow label="Service Fee" amount={order.fees!.serviceFee!} currency={order.currency} />}
          {(order.fees?.tax ?? 0) > 0 && <FeeRow label="Tax" amount={order.fees!.tax!} currency={order.currency} />}
          {getOrderDiscount(order) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(getOrderDiscount(order), order.currency)}</span></div>}
          {(order.fees?.tip ?? 0) > 0 && <FeeRow label="Tip" amount={order.fees!.tip!} currency={order.currency} />}
          <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5">
            <span>Total</span><span>{formatCurrency(getOrderTotal(order), order.currency)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {getOrderNotes(order) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Customer Notes</span>
          <p className="text-sm text-amber-800 mt-1">{getOrderNotes(order)}</p>
        </div>
      )}

      {/* Cancellation/Rejection */}
      {(order.cancellationReason || order.rejectionReason) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">{order.cancellationReason ? 'Cancellation Reason' : 'Rejection Reason'}</span>
          <p className="text-sm text-red-800 mt-1">{order.cancellationReason || order.rejectionReason}</p>
        </div>
      )}

      {/* Timeline */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Timeline</h4>
          <div className="space-y-0">
            {order.statusHistory.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 relative">
                {i < order.statusHistory!.length - 1 && <div className="absolute left-[7px] top-4 w-px h-full bg-gray-200" />}
                <div className={`mt-1 w-[14px] h-[14px] rounded-full border-2 shrink-0 z-10 ${i === 0 ? 'bg-ruby-500 border-ruby-500' : 'bg-white border-gray-300'}`} />
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

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        {CANCELLABLE_STATUSES.includes(order.status) && (
          <button onClick={() => onAction('cancel')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
            <XCircle className="w-3.5 h-3.5" /> Cancel Order
          </button>
        )}
        {isSuperAdmin && (
          <button onClick={() => onAction('override')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
            <RefreshCw className="w-3.5 h-3.5" /> Override Status
          </button>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, sub, large }: { icon: React.ElementType; label: string; value: string; sub?: string; large?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3 h-3 text-gray-400" /><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span></div>
      <p className={`font-medium text-gray-900 ${large ? 'text-lg font-bold' : 'text-sm'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function FeeRow({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  return <div className="flex justify-between"><span className="text-gray-500">{label}</span><span>{formatCurrency(amount, currency)}</span></div>;
}
