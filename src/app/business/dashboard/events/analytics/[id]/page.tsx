'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEventAnalytics } from '@/lib/business-api/events';

export default function EventAnalyticsPage() {
  const params = useParams<{ id: string }>(); const analytics = useEventAnalytics(params.id);
  if (analytics.isLoading) return <p className="p-6 text-sm text-gray-500">Loading analytics…</p>;
  const data = analytics.data as any;
  if (!data) return <main className="p-6">Analytics are unavailable for this event.</main>;
  const cards = [['Tickets sold', data.totalTicketsSold ?? 0], ['Gross sales', `₦${Math.round(data.grossRevenueNgn ?? 0).toLocaleString('en-NG')}`], ['Net earnings', `₦${Math.round(data.netRevenueNgn ?? 0).toLocaleString('en-NG')}`], ['Checked in', data.scannedCount ?? 0], ['Refunded', data.refundedCount ?? 0]];
  return <main className="mx-auto max-w-5xl p-6"><Link href={`/business/dashboard/events/${params.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft size={16} /> Back to event</Link><h1 className="mt-5 text-2xl font-bold">Event sales analytics</h1><section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{cards.map(([label, value]) => <div key={String(label)} className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</section><section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-bold">Sales by ticket tier</h2><div className="mt-4 divide-y">{(data.tierBreakdown ?? []).map((tier: any) => <div key={tier.name} className="flex justify-between py-3 text-sm"><span>{tier.name}</span><span className="font-semibold">{tier.sold ?? tier.quantitySold ?? 0} sold · ₦{Math.round(tier.revenueNgn ?? 0).toLocaleString('en-NG')}</span></div>)}</div></section></main>;
}
