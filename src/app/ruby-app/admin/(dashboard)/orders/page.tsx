'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ShoppingCart, Search, Eye, Package, MoreHorizontal, XCircle, RefreshCw,
  Clock, CheckCircle, Truck, Store, User, MapPin, DollarSign, TrendingUp,
  Ban, ChevronDown, Loader2, Bike, Phone, Mail, Hash, Camera,
  AlertTriangle, CircleDot,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, StatCard, type Column } from '@/components/ui';
import type {
  Order, OrderFilterParams, OrderStatus, OrderStats,
  AdminDeliveryJob, AdminDeliveryStatus, OrderItem,
} from '@/lib/types';
import {
  formatDate, formatDateTime, formatCurrency, toLocationId,
  getOrderBusinessName, getOrderBusinessLogo, getOrderCustomerName,
  getOrderCustomerEmail, getOrderCustomerPhone, getOrderFulfillmentType,
  getOrderTotal, getOrderSubtotal, getOrderDeliveryFee, getOrderPlatformFee,
  getOrderDiscount, getOrderNotes, getOrderDeliveryAddressStr,
  getItemPrice, getItemTotal,
} from '@/lib/utils';

// P155 — pull the first available image URL from an order item's populated
// productId ref. Falls back through: primary image → first image →
// undefined. Handles both `{url}` object shape and legacy raw-string shape.
function getItemImageUrl(item: OrderItem): string | undefined {
  const p = item.productId;
  if (!p || typeof p === 'string') return undefined;
  const images = p.images ?? [];
  if (!images.length) return undefined;
  const primary = images.find(
    (img) => typeof img === 'object' && img && (img as { isPrimary?: boolean }).isPrimary,
  );
  const chosen = primary ?? images[0];
  if (typeof chosen === 'string') return chosen;
  return (chosen as { url?: string })?.url;
}

const DELIVERY_STATUS_COLORS: Record<AdminDeliveryStatus, string> = {
  CREATED: 'bg-gray-100 text-gray-600',
  ASSIGNED: 'bg-indigo-50 text-indigo-700',
  RIDER_ACCEPTED: 'bg-blue-50 text-blue-700',
  RIDER_AT_PICKUP: 'bg-amber-50 text-amber-700',
  PICKED_UP: 'bg-teal-50 text-teal-700',
  IN_TRANSIT: 'bg-purple-50 text-purple-700',
  RIDER_AT_DROPOFF: 'bg-cyan-50 text-cyan-700',
  DELIVERED: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const PROVIDER_TINT: Record<string, string> = {
  GLOVO: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  TOPSHIP: 'bg-blue-50 text-blue-800 border-blue-200',
  INTERNAL: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  MANUAL: 'bg-gray-100 text-gray-700 border-gray-200',
};

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
  // Fetch the linked delivery job when the modal opens; only makes sense
  // for orders whose fulfillmentType is DELIVERY, but we still call for
  // pickup orders — the endpoint returns null and the panel just hides.
  const { data: deliveryJob } = useApi<AdminDeliveryJob | null>(
    () =>
      detailOrder
        ? api.orders.getDelivery(detailOrder._id)
        : Promise.resolve({ success: true, data: null }),
    [detailOrder?._id],
  );

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
      <Modal isOpen={!!detailOrder} onClose={() => setDetailOrder(null)} title="Order Details" size="xl">
        {displayOrder && <OrderDetailContent order={displayOrder} deliveryJob={deliveryJob ?? null} isSuperAdmin={isSuperAdmin} onAction={(t) => { setDetailOrder(null); setActionOrder(displayOrder); setActionType(t); }} />}
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
function OrderDetailContent({
  order,
  deliveryJob,
  isSuperAdmin,
  onAction,
}: {
  order: Order;
  deliveryJob: AdminDeliveryJob | null;
  isSuperAdmin: boolean;
  onAction: (t: 'cancel' | 'override') => void;
}) {
  const businessLogo = getOrderBusinessLogo(order);
  const isDelivery = getOrderFulfillmentType(order) === 'DELIVERY';

  return (
    <div className="space-y-5">
      {/* Hero header — business logo + order # + statuses */}
      <div className="flex items-start gap-4">
        {businessLogo ? (
          <img
            src={businessLogo}
            alt={getOrderBusinessName(order) || 'Business'}
            className="w-16 h-16 rounded-xl object-cover ring-1 ring-gray-200 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center ring-1 ring-blue-200/50 shrink-0">
            <Store className="w-6 h-6 text-blue-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900">
              #{order.orderNumber || order._id.slice(-8)}
            </h3>
            {order.paymentStatus && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : order.paymentStatus === 'FAILED'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : order.paymentStatus === 'REFUNDED'
                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {order.paymentStatus}
              </span>
            )}
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-gray-500">
            {getOrderBusinessName(order) || 'Unknown business'} · {formatDateTime(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Info Grid — 4 columns: business meta / customer / fulfillment / total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <InfoCard
          icon={User}
          label="Customer"
          value={getOrderCustomerName(order) || 'Unknown'}
          sub={
            getOrderCustomerEmail(order) ||
            getOrderCustomerPhone(order) ||
            undefined
          }
        />
        <InfoCard
          icon={isDelivery ? Truck : Store}
          label="Fulfillment"
          value={isDelivery ? 'Delivery' : 'Pickup'}
          sub={
            order.estimatedPrepTime
              ? `Prep: ${order.estimatedPrepTime} min`
              : undefined
          }
        />
        <InfoCard
          icon={Hash}
          label="Items"
          value={String(order.items?.length ?? 0)}
          sub={
            order.items?.length
              ? `${order.items.reduce((sum, i) => sum + (i.quantity ?? 0), 0)} units total`
              : undefined
          }
        />
        <InfoCard
          icon={DollarSign}
          label="Total"
          value={formatCurrency(getOrderTotal(order), order.currency)}
          large
        />
      </div>

      {/* Contact links row */}
      {(getOrderCustomerPhone(order) || getOrderCustomerEmail(order)) && (
        <div className="flex flex-wrap gap-2">
          {getOrderCustomerPhone(order) && (
            <a
              href={`tel:${getOrderCustomerPhone(order)}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <Phone className="w-3 h-3" />
              {getOrderCustomerPhone(order)}
            </a>
          )}
          {getOrderCustomerEmail(order) && (
            <a
              href={`mailto:${getOrderCustomerEmail(order)}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <Mail className="w-3 h-3" />
              {getOrderCustomerEmail(order)}
            </a>
          )}
        </div>
      )}

      {/* Delivery Address */}
      {getOrderDeliveryAddressStr(order) && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1"><MapPin className="w-3 h-3 text-gray-400" /><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Delivery Address</span></div>
          <p className="text-sm font-medium text-gray-900">{getOrderDeliveryAddressStr(order)}</p>
        </div>
      )}

      {/* Items with real product images */}
      {order.items && order.items.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Items ({order.items.length})</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {order.items.map((item, i) => {
              const imageUrl = getItemImageUrl(item);
              return (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover ring-1 ring-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-900 block truncate">{item.name}</span>
                      <span className="text-xs text-gray-500">{formatCurrency(getItemPrice(item), order.currency)} × {item.quantity}</span>
                      {item.variations && item.variations.length > 0 && <div className="text-xs text-gray-400 mt-0.5">{item.variations.map(v => `${v.name}: ${v.option}`).join(', ')}</div>}
                      {item.addOns && item.addOns.length > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          + {item.addOns.map((a) => `${a.name}${a.quantity > 1 ? ` ×${a.quantity}` : ''}`).join(', ')}
                        </div>
                      )}
                      {item.specialInstructions && <div className="text-xs text-amber-600 mt-0.5 italic">{item.specialInstructions}</div>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0 ml-4">{formatCurrency(getItemTotal(item), order.currency)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delivery + Rider card — only for DELIVERY fulfillment */}
      {isDelivery && (
        <DeliverySection job={deliveryJob} currency={order.currency} />
      )}

      {/* Fee Breakdown */}
      <div>
        <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Fee Breakdown</h4>
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
          <FeeRow label="Subtotal" amount={getOrderSubtotal(order)} currency={order.currency} />
          {getOrderDeliveryFee(order) > 0 && <FeeRow label="Delivery Fee" amount={getOrderDeliveryFee(order)} currency={order.currency} />}
          {getOrderPlatformFee(order) > 0 && <FeeRow label="Platform Fee" amount={getOrderPlatformFee(order)} currency={order.currency} />}
          {(order.fees?.serviceFee ?? 0) > 0 && <FeeRow label="Service Fee" amount={order.fees!.serviceFee!} currency={order.currency} />}
          {(order.fees?.vat ?? 0) > 0 && (
            <FeeRow
              label={`VAT (${order.fees?.vatRate ?? 7.5}%)`}
              amount={order.fees!.vat!}
              currency={order.currency}
            />
          )}
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

      {/* Unified Timeline — order + delivery events merged chronologically */}
      <UnifiedTimeline order={order} deliveryJob={deliveryJob} />

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

// ─── Delivery Section (P155) ───
// Renders rider + provider + delivery status + ETAs + proof of delivery for
// orders whose fulfillmentType is DELIVERY. `job === null` after fetch means
// no delivery has been dispatched yet (order is still with the merchant),
// which is the norm for PLACED/ACCEPTED/PREPARING states.
function DeliverySection({
  job,
  currency,
}: {
  job: AdminDeliveryJob | null;
  currency: string | undefined;
}) {
  if (!job) {
    return (
      <div>
        <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Delivery
        </h4>
        <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center bg-gray-50/50">
          <Truck className="w-5 h-5 text-gray-400 mx-auto mb-1.5" />
          <p className="text-xs text-gray-500">
            No delivery job yet — the merchant hasn&apos;t dispatched this order.
          </p>
        </div>
      </div>
    );
  }

  const rider = job.riderInfo;
  const provider = job.provider;
  const providerClass =
    PROVIDER_TINT[provider] ?? 'bg-gray-100 text-gray-700 border-gray-200';
  const deliveryStatusClass =
    DELIVERY_STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-600';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Delivery
        </h4>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${providerClass}`}
          >
            {provider}
          </span>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded ${deliveryStatusClass}`}
          >
            {job.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        {/* Rider */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {rider?.photoUrl ? (
              <img
                src={rider.photoUrl}
                alt={rider.name || 'Rider'}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <Bike className="w-5 h-5 text-purple-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {rider?.name || 'Rider not assigned yet'}
              </p>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                {rider?.phone && (
                  <a
                    href={`tel:${rider.phone}`}
                    className="inline-flex items-center gap-1 hover:text-ruby-600"
                  >
                    <Phone className="w-3 h-3" />
                    {rider.phone}
                  </a>
                )}
                {rider?.vehicleType && (
                  <span className="inline-flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {rider.vehicleType}
                    {rider.vehiclePlate ? ` · ${rider.vehiclePlate}` : ''}
                  </span>
                )}
                {typeof rider?.rating === 'number' && (
                  <span className="inline-flex items-center gap-1">
                    ★ {rider.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            {job.externalId && (
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                  Provider Ref
                </p>
                <p className="text-xs font-mono text-gray-700">{job.externalId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 text-xs">
          <MetricCell
            label="Distance"
            value={
              typeof job.distanceKm === 'number'
                ? `${job.distanceKm.toFixed(1)} km`
                : '—'
            }
          />
          <MetricCell
            label="Fee"
            value={
              typeof job.deliveryFee === 'number'
                ? formatCurrency(job.deliveryFee, job.currency || currency)
                : '—'
            }
          />
          <MetricCell
            label="Est. pickup"
            value={
              job.estimatedPickupAt ? formatDateTime(job.estimatedPickupAt) : '—'
            }
          />
          <MetricCell
            label="Est. delivery"
            value={
              job.estimatedDeliveryAt
                ? formatDateTime(job.estimatedDeliveryAt)
                : '—'
            }
          />
          {job.actualPickupAt && (
            <MetricCell
              label="Picked up"
              value={formatDateTime(job.actualPickupAt)}
              tint="teal"
            />
          )}
          {job.actualDeliveryAt && (
            <MetricCell
              label="Delivered"
              value={formatDateTime(job.actualDeliveryAt)}
              tint="green"
            />
          )}
          {job.lastKnownLocation && (
            <MetricCell
              label="Last location"
              value={`${job.lastKnownLocation.lat.toFixed(4)}, ${job.lastKnownLocation.lng.toFixed(4)}`}
              sub={
                job.lastKnownLocation.updatedAt
                  ? formatDateTime(job.lastKnownLocation.updatedAt)
                  : undefined
              }
            />
          )}
        </div>

        {/* Pickup / Dropoff addresses */}
        {(job.pickup?.address || job.dropoff?.address) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 text-xs">
            {job.pickup?.address && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-0.5">
                  Pickup
                </p>
                <p className="text-gray-900">{job.pickup.address}</p>
                {job.pickup.contactName && (
                  <p className="text-gray-500 mt-0.5">
                    {job.pickup.contactName}
                    {job.pickup.contactPhone ? ` · ${job.pickup.contactPhone}` : ''}
                  </p>
                )}
              </div>
            )}
            {job.dropoff?.address && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-0.5">
                  Dropoff
                </p>
                <p className="text-gray-900">{job.dropoff.address}</p>
                {job.dropoff.contactName && (
                  <p className="text-gray-500 mt-0.5">
                    {job.dropoff.contactName}
                    {job.dropoff.contactPhone ? ` · ${job.dropoff.contactPhone}` : ''}
                  </p>
                )}
                {job.dropoff.instructions && (
                  <p className="text-amber-600 italic mt-0.5">
                    {job.dropoff.instructions}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Failure / cancel banner */}
        {(job.failureReason || job.cancellationReason) && (
          <div className="p-4 bg-red-50 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-800 uppercase tracking-wider">
                {job.failureReason ? 'Delivery Failed' : 'Delivery Cancelled'}
                {job.cancelledBy ? ` · by ${job.cancelledBy}` : ''}
              </p>
              <p className="text-sm text-red-900 mt-0.5">
                {job.failureReason || job.cancellationReason}
              </p>
            </div>
          </div>
        )}

        {/* Proof of delivery */}
        {job.proofOfDeliveryUrl && (
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-2 inline-flex items-center gap-1">
              <Camera className="w-3 h-3" /> Proof of Delivery
            </p>
            <a
              href={job.proofOfDeliveryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block"
            >
              <img
                src={job.proofOfDeliveryUrl}
                alt="Proof of delivery"
                className="max-h-40 rounded-lg ring-1 ring-gray-200"
              />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  sub,
  tint,
}: {
  label: string;
  value: string;
  sub?: string;
  tint?: 'teal' | 'green';
}) {
  const valueClass =
    tint === 'green'
      ? 'text-green-700'
      : tint === 'teal'
      ? 'text-teal-700'
      : 'text-gray-900';
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
        {label}
      </p>
      <p className={`text-xs font-medium mt-0.5 ${valueClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Unified Timeline (P155) ───
// Merges order.statusHistory + deliveryJob.statusTimeline into a single
// chronologically-ordered list, tagging each event with its source so the
// admin can see the full lifecycle in one place. Delivery events use their
// own color palette; order events keep the existing STATUS_COLORS.
type TimelineEntry = {
  kind: 'order' | 'delivery';
  status: string;
  timestamp: string | Date;
  note?: string;
  colorClass: string;
};

function UnifiedTimeline({
  order,
  deliveryJob,
}: {
  order: Order;
  deliveryJob: AdminDeliveryJob | null;
}) {
  const entries: TimelineEntry[] = [];
  (order.statusHistory ?? []).forEach((ev) => {
    entries.push({
      kind: 'order',
      status: ev.status,
      timestamp: ev.timestamp,
      note: ev.note,
      colorClass: STATUS_COLORS[ev.status] ?? 'bg-gray-100 text-gray-600',
    });
  });
  (deliveryJob?.statusTimeline ?? []).forEach((ev) => {
    entries.push({
      kind: 'delivery',
      status: ev.status,
      timestamp: ev.timestamp,
      note: ev.note,
      colorClass: DELIVERY_STATUS_COLORS[ev.status] ?? 'bg-gray-100 text-gray-600',
    });
  });
  if (entries.length === 0) return null;

  entries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return (
    <div>
      <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Timeline ({entries.length})
      </h4>
      <div className="space-y-0">
        {entries.map((ev, i) => (
          <div key={i} className="flex items-start gap-3 relative">
            {i < entries.length - 1 && (
              <div className="absolute left-[7px] top-4 w-px h-full bg-gray-200" />
            )}
            {ev.kind === 'delivery' ? (
              <Bike
                className={`mt-0.5 w-4 h-4 shrink-0 z-10 rounded-full bg-white p-0.5 ring-2 ${
                  i === entries.length - 1
                    ? 'text-purple-600 ring-purple-500'
                    : 'text-gray-400 ring-gray-300'
                }`}
              />
            ) : (
              <CircleDot
                className={`mt-0.5 w-4 h-4 shrink-0 z-10 rounded-full bg-white ${
                  i === entries.length - 1 ? 'text-ruby-600' : 'text-gray-300'
                }`}
              />
            )}
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${ev.colorClass}`}
                >
                  {ev.status.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {ev.kind === 'delivery' ? 'delivery' : 'order'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {formatDateTime(ev.timestamp)}
              </div>
              {ev.note && (
                <div className="text-xs text-gray-400 mt-0.5">{ev.note}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
