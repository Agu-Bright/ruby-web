'use client';

/**
 * Order detail — M2.
 *
 * Renders order header, progress stepper, action bar (accept/reject/
 * status-advance/cancel based on current status + fulfilment), customer
 * card, items list, fee breakdown.
 *
 * Polls every 10 s via `useOrderDetail` — merchant is watching live,
 * needs quick reaction to customer cancellations + payment status flips.
 * Realtime socket update lands with the BusinessSocketsProvider slice.
 *
 * Delivery-tracking Leaflet map (`track-delivery/page.tsx`) is a
 * dedicated route deferred to M2-stretch (needs shared Leaflet setup
 * with M3 booking tracking + M9 venue picker).
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  X,
  Phone,
  MapPin,
  ShoppingBag,
  Truck,
  Clock,
} from 'lucide-react';
import {
  useOrderDetail,
  useAcceptOrder,
  useRejectOrder,
  useUpdateOrderStatus,
  useCancelOrder,
  type OrderStatus,
} from '@/lib/business-api/orders';
import { useOrdersRealtime } from '@/lib/business-sockets';
import { OrderProgressStepper } from '@/components/business/orders/OrderProgressStepper';
import {
  getOrderTotal,
  getOrderSubtotal,
  getOrderDeliveryFee,
  getOrderDiscount,
  getCustomerName,
  getCustomerPhone,
  getFulfillmentType,
  getStatusTimeline,
  getDeliveryStreet,
  getItemName,
  getItemPrice,
  getItemLineTotal,
  getItemNote,
  formatCurrency,
  formatDateTime,
  timeAgo,
} from '@/lib/business-format';

/**
 * Given current status + fulfilment, what actions can the merchant take?
 * Mirrors mobile `smartActions` on `app/(main)/order/[id].tsx`.
 */
function nextActions(
  status: OrderStatus,
  fulfillment: 'PICKUP' | 'DELIVERY' | null,
): { label: string; next: OrderStatus; tint: 'primary' | 'secondary' }[] {
  switch (status) {
    case 'ACCEPTED':
      return [
        { label: 'Start preparing', next: 'PREPARING', tint: 'primary' },
      ];
    case 'PREPARING':
      return [{ label: 'Mark ready', next: 'READY', tint: 'primary' }];
    case 'READY':
      if (fulfillment === 'DELIVERY') {
        return [
          { label: 'Mark dispatched', next: 'DISPATCHED', tint: 'primary' },
        ];
      }
      return [{ label: 'Complete order', next: 'COMPLETED', tint: 'primary' }];
    case 'DISPATCHED':
    case 'PICKED_UP':
      return [{ label: 'Mark delivered', next: 'DELIVERED', tint: 'primary' }];
    case 'DELIVERED':
      return [{ label: 'Complete order', next: 'COMPLETED', tint: 'primary' }];
    default:
      return [];
  }
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params?.id ?? '';

  const { data: order, isLoading, error, refetch } = useOrderDetail(orderId);
  useOrdersRealtime({ onChange: refetch, id: orderId });
  const [prepTime, setPrepTime] = useState<number>(20);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const accept = useAcceptOrder(() => {
    toast.success('Order accepted.');
    refetch();
  });
  const reject = useRejectOrder(() => {
    toast.success('Order rejected.');
    setShowRejectReason(false);
    setRejectReason('');
    refetch();
  });
  const updateStatus = useUpdateOrderStatus(() => {
    toast.success('Status updated.');
    refetch();
  });
  const cancel = useCancelOrder(() => {
    toast.success('Order cancelled.');
    refetch();
  });

  if (isLoading && !order) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="skeleton h-8 w-1/3 mb-2 rounded" />
        <div className="skeleton h-4 w-1/4 mb-6 rounded" />
        <div className="skeleton h-32 w-full mb-4 rounded-xl" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-sm text-rose-900">
          {error ?? "This order isn't available."}
        </div>
      </div>
    );
  }

  const fulfillment = getFulfillmentType(order);
  const customerName = getCustomerName(order);
  const customerPhone = getCustomerPhone(order);
  const timeline = getStatusTimeline(order);
  const actions = nextActions(order.status, fulfillment);
  const isTerminal =
    order.status === 'COMPLETED' ||
    order.status === 'CANCELLED' ||
    order.status === 'REJECTED';
  const isPending = order.status === 'PLACED';
  const canCancel =
    !isTerminal &&
    (order.status === 'ACCEPTED' || order.status === 'PREPARING');
  const busy =
    accept.isLoading ||
    reject.isLoading ||
    updateStatus.isLoading ||
    cancel.isLoading;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
      >
        <ArrowLeft size={14} /> Back to orders
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Order #{order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Clock size={14} />
            Placed {timeAgo(order.createdAt)}
          </p>
        </div>
        {fulfillment && (
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1">
            {fulfillment === 'DELIVERY' ? <Truck size={12} /> : <ShoppingBag size={12} />}
            {fulfillment === 'DELIVERY' ? 'Delivery' : 'Pickup'}
          </span>
        )}
      </div>

      {/* Progress stepper */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <OrderProgressStepper status={order.status} fulfillment={fulfillment} />
      </div>

      {/* Actions */}
      {!isTerminal && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          {isPending && !showRejectReason && (
            <div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Est. prep time (mins)
                </label>
                <input
                  type="number"
                  min={1}
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value) || 0)}
                  className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-red text-sm"
                  disabled={busy}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    accept.mutate({ orderId: order._id, estimatedPrepTime: prepTime })
                  }
                  className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Check size={16} />
                  {accept.isLoading ? 'Accepting…' : 'Accept order'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowRejectReason(true)}
                  className="flex-1 py-2.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <X size={16} />
                  Reject
                </button>
              </div>
            </div>
          )}

          {isPending && showRejectReason && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Reason for rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Tell the customer why you can’t fulfill this order…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-red text-sm mb-3"
                disabled={busy}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || !rejectReason.trim()}
                  onClick={() =>
                    reject.mutate({
                      orderId: order._id,
                      reason: rejectReason.trim(),
                    })
                  }
                  className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm disabled:opacity-60"
                >
                  {reject.isLoading ? 'Rejecting…' : 'Confirm rejection'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setShowRejectReason(false);
                    setRejectReason('');
                  }}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!isPending && actions.length > 0 && (
            <div className="flex gap-2">
              {actions.map((a) => (
                <button
                  key={a.next}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    updateStatus.mutate({ orderId: order._id, status: a.next })
                  }
                  className="flex-1 py-2.5 rounded-lg bg-ruby-red hover:opacity-95 text-white font-semibold text-sm disabled:opacity-60"
                >
                  {updateStatus.isLoading ? 'Working…' : a.label}
                </button>
              ))}
              {canCancel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const reason = window.prompt(
                      'Cancel this order? Enter a short reason:',
                    );
                    if (!reason?.trim()) return;
                    cancel.mutate({
                      orderId: order._id,
                      reason: reason.trim(),
                    });
                  }}
                  className="px-4 py-2.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-medium text-sm"
                >
                  Cancel order
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer + fulfilment */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Customer
          </p>
          <p className="text-sm font-medium text-gray-900 mb-1">{customerName}</p>
          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
            >
              <Phone size={12} />
              {customerPhone}
            </a>
          )}
          {fulfillment === 'DELIVERY' && order.deliveryAddress && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Delivery address
              </p>
              <p className="text-sm text-gray-900 flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                <span>
                  {getDeliveryStreet(order.deliveryAddress)}
                  {order.deliveryAddress.city && (
                    <>
                      <br />
                      {order.deliveryAddress.city}
                      {order.deliveryAddress.state && `, ${order.deliveryAddress.state}`}
                    </>
                  )}
                </span>
              </p>
            </div>
          )}
          {order.customerNote || order.notes ? (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Note from customer
              </p>
              <p className="text-sm text-gray-700">
                {order.customerNote ?? order.notes}
              </p>
            </div>
          ) : null}
        </div>

        {/* Fee breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Payment
          </p>
          <div className="space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(getOrderSubtotal(order), order.currency)} />
            {getOrderDeliveryFee(order) > 0 && (
              <Row
                label="Delivery"
                value={formatCurrency(getOrderDeliveryFee(order), order.currency)}
              />
            )}
            {getOrderDiscount(order) > 0 && (
              <Row
                label="Discount"
                value={`− ${formatCurrency(getOrderDiscount(order), order.currency)}`}
                tint="green"
              />
            )}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3">
            <Row
              label="Total"
              value={formatCurrency(getOrderTotal(order), order.currency)}
              bold
            />
          </div>
          {order.paymentStatus && (
            <p className="text-xs text-gray-500 mt-3">
              Payment {order.paymentStatus.toLowerCase()}
              {order.paymentMethod ? ` · ${order.paymentMethod}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Items ({order.items?.length ?? 0})
        </p>
        <div className="divide-y divide-gray-100">
          {order.items?.map((item, i) => (
            <div key={i} className="py-3 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  <span className="text-gray-400 mr-1">{item.quantity}×</span>
                  {getItemName(item)}
                </p>
                {getItemNote(item) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Note: {getItemNote(item)}
                  </p>
                )}
                {item.variations && item.variations.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.variations
                      .map((v) => `${v.name}: ${v.option}`)
                      .join(' · ')}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(getItemLineTotal(item), order.currency)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-xs text-gray-400">
                    {formatCurrency(getItemPrice(item), order.currency)} ea
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status timeline */}
      {timeline.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Status history
          </p>
          <ol className="space-y-2">
            {timeline.map((entry, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {entry.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDateTime(entry.timestamp)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {order.status === 'DISPATCHED' && order.deliveryJobId && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div><p className="font-semibold">Rider tracking is live.</p><p className="text-xs mt-0.5">See the rider, pickup and destination on the live map.</p></div>
          <button type="button" onClick={() => router.push(`/business/dashboard/orders/${order._id}/track-delivery`)} className="shrink-0 rounded-lg bg-blue-700 hover:bg-blue-800 px-3.5 py-2 text-xs font-semibold text-white">Open live map</button>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  label: string;
  value: string;
  bold?: boolean;
  tint?: 'green';
}
function Row({ label, value, bold, tint }: RowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${bold ? 'text-sm font-semibold text-gray-900' : 'text-xs text-gray-500'}`}>
        {label}
      </span>
      <span
        className={`${
          bold ? 'text-base font-bold' : 'text-sm'
        } ${tint === 'green' ? 'text-green-700' : 'text-gray-900'}`}
      >
        {value}
      </span>
    </div>
  );
}
