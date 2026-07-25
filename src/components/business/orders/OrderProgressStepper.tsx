'use client';

/**
 * OrderProgressStepper — visual timeline of order status.
 * Mirrors mobile `OrderProgressStepper.tsx`.
 *
 * Steps depend on fulfilment type:
 *   PICKUP  : Placed → Accepted → Preparing → Ready → Completed
 *   DELIVERY: Placed → Accepted → Preparing → Ready → Dispatched → Delivered → Completed
 */

import { Check } from 'lucide-react';
import type { OrderStatus } from '@/lib/business-api/orders';

const PICKUP_STEPS: OrderStatus[] = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'COMPLETED',
];
const DELIVERY_STEPS: OrderStatus[] = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'DISPATCHED',
  'DELIVERED',
  'COMPLETED',
];

const LABELS: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  DISPATCHED: 'Dispatched',
  PICKED_UP: 'Picked up',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

interface Props {
  status: OrderStatus;
  fulfillment: 'PICKUP' | 'DELIVERY' | null;
}

export function OrderProgressStepper({ status, fulfillment }: Props) {
  const steps = fulfillment === 'DELIVERY' ? DELIVERY_STEPS : PICKUP_STEPS;
  const terminal = status === 'REJECTED' || status === 'CANCELLED';

  if (terminal) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-900">
        Order {status === 'REJECTED' ? 'rejected' : 'cancelled'}.
      </div>
    );
  }

  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex items-start gap-1 overflow-x-auto pb-2 -mx-1 px-1">
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={step} className="flex-1 min-w-[68px]">
            <div className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-ruby-red text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? <Check size={12} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    isDone ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
            <p
              className={`text-[10px] mt-1.5 ${
                isActive
                  ? 'text-gray-900 font-semibold'
                  : isDone
                  ? 'text-gray-600'
                  : 'text-gray-400'
              }`}
            >
              {LABELS[step]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
