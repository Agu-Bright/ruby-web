'use client';

import { useState } from 'react';
import { ShoppingCart, Search, Eye, Package, MoreHorizontal, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, type Column } from '@/components/ui';
import type { Order, OrderFilterParams, OrderStatus } from '@/lib/types';
import { formatDate, formatDateTime, formatCurrency, toLocationId } from '@/lib/utils';

const STATUS_OPTIONS: OrderStatus[] = ['PLACED', 'ACCEPTED', 'REJECTED', 'PREPARING', 'READY', 'DISPATCHED', 'PICKED_UP', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
const CANCELLABLE_STATUSES: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'];

export default function OrdersPage() {
  const { admin } = useAuth();
  const [filters, setFilters] = useState<OrderFilterParams>({
    page: 1,
    limit: 20,
    ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1 ? { locationId: toLocationId(admin.locationIds[0]) } : {}),
  });
  const [search, setSearch] = useState('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [actionOrder, setActionOrder] = useState<Order | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'override' | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const { data: orders, meta, isLoading, refetch } = useApi<Order[]>(
    () => api.orders.list(filters),
    [filters]
  );

  const cancelMutation = useMutation(
    async () => {
      return await api.orders.cancel(actionOrder!._id, cancelReason);
    }
  );

  const overrideMutation = useMutation(
    async () => {
      return await api.orders.updateStatus(actionOrder!._id, overrideStatus, overrideNote || undefined);
    }
  );

  const handleCancelConfirm = async () => {
    const result = await cancelMutation.mutate();
    if (result !== null) {
      toast.success('Order cancelled');
      setActionOrder(null);
      setActionType(null);
      setCancelReason('');
      refetch();
    }
  };

  const handleOverrideConfirm = async () => {
    const result = await overrideMutation.mutate();
    if (result !== null) {
      toast.success('Order status updated');
      setActionOrder(null);
      setActionType(null);
      setOverrideStatus('');
      setOverrideNote('');
      refetch();
    }
  };

  const openAction = (order: Order, type: 'cancel' | 'override') => {
    setActionOrder(order);
    setActionType(type);
    setActiveDropdown(null);
  };

  const isSuperAdmin = admin?.roles?.includes('super_admin');

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (o) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">#{o.orderNumber || o._id.slice(-8)}</div>
            <div className="text-xs text-gray-500">{o.items?.length || 0} items</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: 'fulfillment',
      header: 'Type',
      render: (o) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100">
          {o.fulfillmentType === 'DELIVERY' ? '🚚 Delivery' : '🏪 Pickup'}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => <span className="text-sm text-gray-600">{o.customerName || '—'}</span>,
    },
    {
      key: 'business',
      header: 'Business',
      render: (o) => <span className="text-sm text-gray-600">{o.businessName || o.businessId}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: (o) => <span className="text-sm font-medium">{formatCurrency(o.totalAmount ?? o.total ?? 0, o.currency)}</span>,
    },
    {
      key: 'created',
      header: 'Date',
      render: (o) => <span className="text-sm text-gray-500">{formatDate(o.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (o) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setDetailOrder(o); }} className="p-1.5 rounded hover:bg-gray-100">
            <Eye className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === o._id ? null : o._id); }}
              className="p-1.5 rounded hover:bg-gray-100"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {activeDropdown === o._id && (
              <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                {CANCELLABLE_STATUSES.includes(o.status) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openAction(o, 'cancel'); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel Order
                  </button>
                )}
                {isSuperAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openAction(o, 'override'); }}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Override Status
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  // Filter data client-side by search
  const filtered = (orders || []).filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (o.orderNumber || '').toLowerCase().includes(q)
      || (o.customerName || '').toLowerCase().includes(q)
      || (o.businessName || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6" onClick={() => setActiveDropdown(null)}>
      <PageHeader
        title="Orders"
        description="Monitor and track shopping orders"
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search orders..."
              className="input pl-9 bg-gray-50 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-auto"
            value={filters.status || ''}
            onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value || undefined) as OrderStatus | undefined, page: 1 }))}
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
        emptyMessage="No orders found"
        currentPage={filters.page}
        onPageChange={(page) => setFilters(f => ({ ...f, page }))}
      />

      {/* Detail Modal */}
      <Modal isOpen={!!detailOrder} onClose={() => setDetailOrder(null)} title="Order Details" size="lg">
        {detailOrder && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">#{detailOrder.orderNumber || detailOrder._id.slice(-8)}</h3>
                <p className="text-sm text-gray-500">{formatDateTime(detailOrder.createdAt)}</p>
              </div>
              <StatusBadge status={detailOrder.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Business</span>
                <p className="font-medium">{detailOrder.businessName || detailOrder.businessId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Customer</span>
                <p className="font-medium">{detailOrder.customerName || detailOrder.customerId || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Fulfillment</span>
                <p className="font-medium">{detailOrder.fulfillmentType === 'DELIVERY' ? '🚚 Delivery' : '🏪 Pickup'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Total</span>
                <p className="font-semibold text-lg">{formatCurrency(detailOrder.totalAmount ?? detailOrder.total ?? 0, detailOrder.currency)}</p>
              </div>
            </div>

            {detailOrder.deliveryAddress && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <span className="text-xs text-gray-500 uppercase">Delivery Address</span>
                <p className="font-medium mt-1">{detailOrder.deliveryAddress}</p>
              </div>
            )}

            {detailOrder.items && detailOrder.items.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Items</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {detailOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-gray-400" />
                        <div>
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-xs text-gray-500 ml-2">×{item.quantity}</span>
                        </div>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(item.price * item.quantity, detailOrder.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailOrder.fees && detailOrder.fees.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Fee Breakdown</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                  {detailOrder.fees.map((fee, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-500">{fee.label}</span>
                      <span>{formatCurrency(fee.amount, detailOrder.currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1">
                    <span>Total</span><span>{formatCurrency(detailOrder.totalAmount ?? detailOrder.total ?? 0, detailOrder.currency)}</span>
                  </div>
                </div>
              </div>
            )}

            {detailOrder.notes && (
              <div className="bg-amber-50 rounded-lg p-3 text-sm">
                <span className="text-xs text-amber-600 uppercase font-medium">Customer Notes</span>
                <p className="text-amber-800 mt-1">{detailOrder.notes}</p>
              </div>
            )}

            {detailOrder.cancellationReason && (
              <div className="bg-red-50 rounded-lg p-3 text-sm">
                <span className="text-xs text-red-600 uppercase font-medium">Cancellation Reason</span>
                <p className="text-red-800 mt-1">{detailOrder.cancellationReason}</p>
              </div>
            )}

            {detailOrder.statusHistory && detailOrder.statusHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Timeline</h4>
                <div className="space-y-3">
                  {detailOrder.statusHistory.map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-ruby-500 ring-4 ring-ruby-50" />
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

            {/* Modal actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {CANCELLABLE_STATUSES.includes(detailOrder.status) && (
                <button
                  onClick={() => { setDetailOrder(null); openAction(detailOrder, 'cancel'); }}
                  className="px-3 py-1.5 text-sm rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                >
                  Cancel Order
                </button>
              )}
              {isSuperAdmin && (
                <button
                  onClick={() => { setDetailOrder(null); openAction(detailOrder, 'override'); }}
                  className="px-3 py-1.5 text-sm rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  Override Status
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal isOpen={actionType === 'cancel'} onClose={() => { setActionType(null); setActionOrder(null); setCancelReason(''); }} title="Cancel Order">
        {actionOrder && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              You are about to cancel order <strong>#{actionOrder.orderNumber}</strong>. This action cannot be undone.
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Cancellation Reason *</label>
              <textarea
                className="input w-full min-h-[80px]"
                placeholder="Enter reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setActionType(null); setCancelReason(''); }} className="btn btn-ghost">Go Back</button>
              <button
                onClick={handleCancelConfirm}
                disabled={!cancelReason.trim() || cancelMutation.isLoading}
                className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelMutation.isLoading ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Override Status Modal */}
      <Modal isOpen={actionType === 'override'} onClose={() => { setActionType(null); setActionOrder(null); setOverrideStatus(''); setOverrideNote(''); }} title="Override Order Status">
        {actionOrder && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
              Manually override the status of order <strong>#{actionOrder.orderNumber}</strong>. Current status: <StatusBadge status={actionOrder.status} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">New Status *</label>
              <select className="input w-full" value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}>
                <option value="">Select status...</option>
                {STATUS_OPTIONS.filter(s => s !== actionOrder.status).map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Note (optional)</label>
              <textarea
                className="input w-full min-h-[60px]"
                placeholder="Reason for override..."
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setActionType(null); setOverrideStatus(''); setOverrideNote(''); }} className="btn btn-ghost">Cancel</button>
              <button
                onClick={handleOverrideConfirm}
                disabled={!overrideStatus || overrideMutation.isLoading}
                className="btn bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {overrideMutation.isLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
