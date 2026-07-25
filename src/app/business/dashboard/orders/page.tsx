'use client';

/**
 * Orders list — M2.
 *
 * Filter chips (status) + search box + list of `OrderCard`s.
 * Polls every 30 s via `useOrders`. Search filters client-side over
 * order number + customer name (server-side search lands with the
 * mobile-parity `q` query param — noted in PROGRESS.md as M2-stretch).
 *
 * Real WebSocket-driven "new order arrives" updates land alongside the
 * `BusinessSocketsProvider` in a follow-up slice (called out in the
 * PLAN.md M2 file list).
 */

import { useMemo, useState } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import { useOrders } from '@/lib/business-api/orders';
import { useOrdersRealtime } from '@/lib/business-sockets';
import { FilterChips } from '@/components/business/orders/FilterChips';
import { OrderCard } from '@/components/business/orders/OrderCard';
import { getCustomerName } from '@/lib/business-format';

export default function OrdersListPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useOrders(
    statusFilter === 'all' ? undefined : statusFilter,
  );
  useOrdersRealtime({ onChange: refetch });

  const orders = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const inNumber = o.orderNumber?.toLowerCase().includes(q);
      const inCustomer = getCustomerName(o).toLowerCase().includes(q);
      return inNumber || inCustomer;
    });
  }, [orders, search]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Orders</h1>
        <p className="text-sm text-gray-500">
          Review, accept, and manage every order coming in.
        </p>
      </div>

      {/* Search + filter */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number or customer…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-red focus:border-transparent text-sm"
          />
        </div>
        <FilterChips active={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* List */}
      {isLoading && orders.length === 0 && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <div className="skeleton h-4 w-1/3 mb-2 rounded" />
              <div className="skeleton h-3 w-1/4 mb-3 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-900">
          Couldn&apos;t load orders. {error}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
            <ShoppingBag size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            {search || statusFilter !== 'all'
              ? 'No orders match your filter'
              : 'No orders yet'}
          </p>
          <p className="text-xs text-gray-500">
            {search || statusFilter !== 'all'
              ? 'Try clearing the search or picking a different status.'
              : 'When customers place orders they’ll show up here.'}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
