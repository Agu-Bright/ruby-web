'use client';

import { ArrowLeft, PackageSearch } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useDeliveryJobByOrder } from '@/lib/business-api/delivery';
import { useOrderDetail } from '@/lib/business-api/orders';
import { DeliveryTrackingMap } from '@/components/business/delivery/DeliveryTrackingMap';

export default function TrackDeliveryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params?.id ?? '';
  const order = useOrderDetail(orderId);
  const delivery = useDeliveryJobByOrder(orderId);

  if ((order.isLoading && !order.data) || (delivery.isLoading && !delivery.data)) {
    return <div className="p-6 max-w-5xl mx-auto"><div className="skeleton h-7 w-48 mb-6 rounded" /><div className="skeleton h-[420px] w-full rounded-xl" /></div>;
  }
  if (order.error || delivery.error || !delivery.data) {
    return <div className="p-6 max-w-3xl mx-auto"><button type="button" onClick={() => router.back()} className="mb-4 text-sm text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"><ArrowLeft size={15} /> Back to order</button><div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950"><PackageSearch size={28} className="mb-3" /><h1 className="font-semibold">Delivery tracking is not available yet</h1><p className="mt-1 text-sm">A rider has not been assigned to this order, or the delivery job is still being created.</p></div></div>;
  }
  return <div className="p-6 max-w-5xl mx-auto"><button type="button" onClick={() => router.back()} className="mb-4 text-sm text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"><ArrowLeft size={15} /> Back to order</button><div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wider text-ruby-red">Order #{order.data?.orderNumber ?? '—'}</p><h1 className="mt-1 text-2xl font-bold text-gray-900">Track delivery</h1><p className="mt-1 text-sm text-gray-500">Live rider updates appear here as the delivery partner reports them.</p></div><DeliveryTrackingMap job={delivery.data} orderId={orderId} onRefresh={delivery.refetch} /></div>;
}
