'use client';

import { useState } from 'react';
import { ShoppingCart, Search, Eye, Package, Truck, MapPin, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, type Column } from '@/components/ui';
import type { Order, OrderFilterParams, OrderStatus } from '@/lib/types';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';

const STATUS_OPTIONS: OrderStatus[] = ['PLACED', 'ACCEPTED', 'REJECTED', 'PREPARING', 'READY', 'DISPATCHED', 'PICKED_UP', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

export default function OrdersPage() {
  const { admin } = useAuth();
  const [filters, setFilters] = useState<OrderFilterParams>({
    page: 1,
    limit: 20,
    ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1 ? { locationId: admin.locationIds[0] } : {}),
  });
  const [search, setSearch] = useState('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const { data: orders, meta, isLoading } = useApi<Order[]>(
    () => api.orders.list(filters),
    [filters]
  );

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
      key: 'business',
      header: 'Business',
      render: (o) => <span className="text-sm text-gray-600">{o.businessName || o.businessId}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: (o) => <span className="text-sm font-medium">{formatCurrency(o.totalAmount ?? 0, o.currency)}</span>,
    },
    {
      key: 'created',
      header: 'Date',
      render: (o) => <span className="text-sm text-gray-500">{formatDate(o.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-16',
      render: (o) => (
        <button onClick={(e) => { e.stopPropagation(); setDetailOrder(o); }} className="p-1.5 rounded hover:bg-gray-100">
          <Eye className="w-3.5 h-3.5 text-gray-500" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Monitor and track shopping orders"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
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

      <DataTable
        columns={columns}
        data={orders || []}
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
                <p className="font-medium">{detailOrder.customerName || detailOrder.customerId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Fulfillment</span>
                <p className="font-medium">{detailOrder.fulfillmentType === 'DELIVERY' ? '🚚 Delivery' : '🏪 Pickup'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Total</span>
                <p className="font-semibold text-lg">{formatCurrency(detailOrder.totalAmount ?? 0, detailOrder.currency)}</p>
              </div>
            </div>

            {/* Items */}
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

            {/* Fee Breakdown */}
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
                    <span>Total</span><span>{formatCurrency(detailOrder.totalAmount ?? 0, detailOrder.currency)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Status Timeline */}
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
          </div>
        )}
      </Modal>
    </div>
  );
}
