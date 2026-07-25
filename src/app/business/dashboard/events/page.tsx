'use client';

import Link from 'next/link';
import { CalendarDays, Plus } from 'lucide-react';
import { useState } from 'react';
import { useMyEvents, type BusinessEvent } from '@/lib/business-api/events';

export default function EventsPage() {
  const [status, setStatus] = useState('');
  const events = useMyEvents({ status: status || undefined });
  const list = (events.data ?? []) as BusinessEvent[];
  return <main className="mx-auto max-w-7xl p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-ruby-red">Events</p><h1 className="mt-1 text-2xl font-bold">Your events</h1><p className="mt-1 text-sm text-gray-500">Create ticketed experiences and submit them for Ruby+ review.</p></div><Link href="/business/dashboard/events/create" className="inline-flex items-center gap-2 rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> Create event</Link></div><div className="mt-6"><select aria-label="Event status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="PENDING_REVIEW">Pending review</option><option value="PUBLISHED">Published</option><option value="REJECTED">Rejected</option><option value="COMPLETED">Completed</option></select></div>{events.isLoading ? <p className="mt-5 rounded-xl border bg-white p-8 text-center text-sm text-gray-500">Loading events…</p> : list.length ? <section className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{list.map((item) => <Link key={item._id} href={`/business/dashboard/events/${item._id}`} className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-ruby-red"><CalendarDays className="text-ruby-red" size={20} /><p className="mt-4 text-xs font-semibold uppercase tracking-wider text-gray-500">{item.status.replaceAll('_', ' ')}</p><h2 className="mt-1 font-bold text-gray-900">{item.title}</h2><p className="mt-2 text-sm text-gray-500">{new Date(item.startsAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</p><p className="mt-1 text-sm text-gray-500">{item.venueName}</p></Link>)}</section> : <div className="mt-5 rounded-2xl border border-dashed bg-white p-12 text-center"><CalendarDays className="mx-auto text-gray-300" size={30} /><p className="mt-3 text-gray-500">No events yet.</p></div>}</main>;
}
