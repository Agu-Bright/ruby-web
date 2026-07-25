'use client';

/**
 * OrderCard — row in the orders list. Web parity with mobile `OrderCard.tsx`.
 * Renders order number, customer, item count, total, status pill, elapsed time.
 * Clicks route to `/business/dashboard/orders/[id]`.
 */

import Link from 'next/link';
import { ShoppingBag, Truck, Clock } from 'lucide-react';
import type { BusinessOrder } from '@/lib/business-api/orders';
import {
  getOrderTotal,
  getCustomerName,
  getFulfillmentType,
  timeAgo,
  formatCurrency,
} from '@/lib/business-format';

const STATUS_TINT: Record<string, string> = {
  PLACED: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  READY: 'bg-purple-100 text-purple-800',
  DISPATCHED: 'bg-purple-100 text-purple-800',
  PICKED_UP: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

interface Props {
  order: BusinessOrder;
}

export function OrderCard({ order }: Props) {
  const itemCount = order.items?.length ?? 0;
  const total = getOrderTotal(order);
  const customer = getCustomerName(order);
  const fulfillment = getFulfillmentType(order);
  const tint = STATUS_TINT[order.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <Link
      href={`/business/dashboard/orders/${order._id}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            #{order.orderNumber}
          </p>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${tint}`}
          >
            {order.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-xs text-gray-500 shrink-0 flex items-center gap-1">
          <Clock size={12} />
          {timeAgo(order.createdAt)}
        </p>
      </div>

      <p className="text-sm text-gray-700 mb-2 truncate">{customer}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <ShoppingBag size={12} />
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
          {fulfillment && (
            <span className="inline-flex items-center gap-1">
              {fulfillment === 'DELIVERY' ? (
                <Truck size={12} />
              ) : (
                <ShoppingBag size={12} />
              )}
              {fulfillment === 'DELIVERY' ? 'Delivery' : 'Pickup'}
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-gray-900">
          {formatCurrency(total, order.currency ?? 'NGN')}
        </p>
      </div>
    </Link>
  );
}
