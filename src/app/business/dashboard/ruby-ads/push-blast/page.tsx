'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { DynamicMap } from '@/lib/leaflet/DynamicMap';
import { usePushBlastRequests, useRequestPushBlast } from '@/lib/business-api/ads';

// The backend always applies this radius to the saved business location.
// Until the auth profile includes coordinates, this is an illustrative map only.
const previewCenter: [number, number] = [4.8156, 7.0498];

export default function PushBlastPage() {
  const [message, setMessage] = useState('');
  const [radiusKm, setRadiusKm] = useState(5);
  const requests = usePushBlastRequests();
  const submit = useRequestPushBlast(() => {
    toast.success('Push-blast request sent for Ruby+ review');
    setMessage('');
    requests.refetch();
  });
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return toast.error('Write a message for your request');
    submit.mutate({ message: message.trim(), radiusKm });
  };

  return <main className="mx-auto max-w-4xl p-6">
    <Link href="/business/dashboard/ruby-ads" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft size={16} /> Back to ads</Link>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-ruby-red">Admin-reviewed send</p>
        <h1 className="mt-2 text-2xl font-bold">Request a push blast</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">Ruby+ reviews each request and sends approved messages within 48 hours. Your weekly quota is used only when the message is sent.</p>
        <label className="mt-5 block text-sm font-semibold">Message<textarea maxLength={180} required value={message} onChange={(event) => setMessage(event.target.value)} rows={5} className="mt-2 w-full rounded-xl border p-3 font-normal" placeholder="Tell nearby customers what is new at your business…" /></label>
        <p className="mt-1 text-right text-xs text-gray-400">{message.length}/180</p>
        <label className="mt-4 block text-sm font-semibold">Audience radius <span className="text-ruby-red">{radiusKm} km</span><input aria-label="Audience radius in kilometres" type="range" min="1" max="20" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} className="mt-3 w-full accent-ruby-red" /><span className="flex justify-between text-xs font-normal text-gray-400"><span>1 km</span><span>20 km</span></span></label>
        <button disabled={submit.isLoading} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white"><Send size={16} />{submit.isLoading ? 'Submitting…' : 'Request review'}</button>
      </form>
      <aside className="overflow-hidden rounded-2xl border bg-white shadow-sm"><DynamicMap center={previewCenter} zoom={12} markers={[{ id: 'business', position: previewCenter, title: 'Your registered business area' }]} circle={{ center: previewCenter, radius: radiusKm * 1000 }} className="h-72 w-full" /><div className="p-4"><h2 className="font-semibold">Audience preview</h2><p className="mt-1 text-sm leading-5 text-gray-500">The final audience is centred on your registered business location. This preview illustrates the selected radius only.</p></div></aside>
    </div>
    <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Your requests</h2>{requests.isLoading ? <p className="mt-3 text-sm text-gray-500">Loading requests…</p> : requests.data?.length ? <div className="mt-3 divide-y">{requests.data.map((request: any) => <div key={request._id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p className="font-medium">{request.message}</p><p className="mt-1 text-xs text-gray-500">{request.radiusKm} km · {new Date(request.createdAt).toLocaleDateString('en-NG')}</p>{request.rejectionReason && <p className="mt-1 text-xs text-rose-600">{request.rejectionReason}</p>}</div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">{request.status}</span></div>)}</div> : <p className="mt-3 text-sm text-gray-500">No push-blast requests yet.</p>}</section>
  </main>;
}
