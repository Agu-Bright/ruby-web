'use client';

import { Activity, AlertCircle, CheckCircle2, Database, Info, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks';

type Diagnostic = {
  name: string;
  formula: string;
  events: string;
  explains: string;
};

const diagnostics: Diagnostic[] = [
  { name: 'Discovery to Booking Conversion', formula: 'Sessions with Booking Completed / sessions with Merchant Viewed', events: 'Merchant Viewed, Booking Completed', explains: 'GMV, Activation Rate' },
  { name: 'Deolu Query to Action Rate', formula: 'Conversations with a result tap, contact, or booking / Deolu queries', events: 'Deolu Queried, Deolu Result Tapped, Merchant Contacted, Booking Completed', explains: 'GMV, Activation Rate, MAU' },
  { name: 'Zero-Result Search Rate', formula: 'Searches and Deolu queries with zero results / all searches and queries', events: 'Search Performed, Deolu Queried', explains: 'Activation Rate, Active Merchants' },
  { name: 'Payment Failure Rate', formula: 'Payment Failed / (Payment Failed + Payment Completed)', events: 'Payment Failed, Payment Completed', explains: 'GMV, Activation Rate' },
  { name: 'Cancellation Rate', formula: 'Booking Cancelled / Booking Completed, split by cancelled_by', events: 'Booking Cancelled, Booking Completed', explains: 'GMV, Repeat Booking Rate' },
  { name: 'Merchant Activation Rate', formula: 'Merchants with profile completed plus fulfilled order within 14 days / signup cohort', events: 'Merchant Signed Up, Merchant Profile Completed, Order Fulfilled', explains: 'Active Merchants' },
  { name: 'GMV per Active Merchant', formula: 'Fulfilled order value / active merchants, with mean and median', events: 'Order Fulfilled', explains: 'GMV, Ad Renewal Rate' },
  { name: 'Merchant 90-Day Retention', formula: 'Onboarded merchants active between day 61 and 90 / cohort', events: 'Merchant Signed Up, Order Fulfilled', explains: 'Active Merchants' },
  { name: 'Ad Campaign Return', formula: 'Impressions → clicks → views → ad-attributed bookings and GMV, per campaign', events: 'Ad Impression Served, Ad Clicked, Merchant Viewed, Booking Completed', explains: 'Ad Renewal Rate' },
  { name: 'Revenue per Active User', formula: 'Commission amount over 30 days / MAU', events: 'Payment Completed, App Opened', explains: 'GMV, Net Revenue' },
];

export default function AnalyticsDiagnosticsPage() {
  const { data, isLoading, error, refetch } = useApi(() => api.analytics.diagnostics());
  const readyCount = data?.diagnostics.filter((item) => item.status === 'READY').length ?? 0;
  const live = (name: string) => data?.diagnostics.find((item) => item.name === name);
  const formatValue = (item?: { value: number | null }) => item?.value == null ? 'Collecting' : `${item.value}%`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics diagnostics"
        description="The on-demand measurements used to explain movement in Ruby+ headline metrics."
      />

      <div className={`rounded-2xl border p-5 ${data ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold text-gray-950">Instrumentation status: {data ? 'raw event stream connected' : 'connecting to raw event stream'}</p>
            <p className="mt-1 text-sm leading-6 text-gray-700">
              {data ? `${data.rawEventCount.toLocaleString()} raw events received. Diagnostics only become live after their denominator event is available; no values are estimated.` : error || 'Loading the event stream health…'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <Database className="h-5 w-5 text-ruby-500" />
          <p className="mt-4 text-2xl font-semibold text-gray-950">{readyCount} / 10</p>
          <p className="mt-1 text-sm text-gray-500">Diagnostics ready from raw events</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <Activity className="h-5 w-5 text-blue-600" />
          <p className="mt-4 text-2xl font-semibold text-gray-950">{data?.rawEventCount.toLocaleString() ?? '—'}</p>
          <p className="mt-1 text-sm text-gray-500">Raw events in the current 30-day window</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <Info className="h-5 w-5 text-violet-600" />
          <p className="mt-4 text-2xl font-semibold text-gray-950">{data?.lastEventAt ? new Date(data.lastEventAt).toLocaleString() : 'No events yet'}</p>
          <p className="mt-1 text-sm text-gray-500">Last received event</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold text-gray-950">Diagnostic catalogue</h2>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500"><span>Definitions are taken directly from the approved Ruby Analytics specification.</span><button onClick={() => refetch()} disabled={isLoading} className="inline-flex items-center gap-1.5 font-medium text-ruby-600 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Refresh</button></div>
        </div>
        <div className="divide-y">
          {diagnostics.map((diagnostic) => {
            const current = live(diagnostic.name);
            const isReady = current?.status === 'READY';
            return (
            <article key={diagnostic.name} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-950">{diagnostic.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{diagnostic.formula}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isReady ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {isReady ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />} {isReady ? `${formatValue(current)} live` : 'Collecting'}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Source events</dt><dd className="mt-1 text-gray-800">{diagnostic.events}</dd></div>
                <div className="rounded-xl bg-gray-50 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Explains movement in</dt><dd className="mt-1 text-gray-800">{diagnostic.explains}</dd></div>
              </dl>
              {current?.note && <p className="mt-3 text-xs text-gray-500">{current.note}</p>}
            </article>
          )})}
        </div>
      </section>

      <p className="flex items-center gap-2 text-sm text-gray-500"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> This page uses append-only raw events; it never fills metrics with fabricated estimates.</p>
    </div>
  );
}
