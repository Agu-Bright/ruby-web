'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCreateAdCampaign } from '@/lib/business-api/ads';

const campaignTypes = [
  ['FEATURED_LISTING', 'Featured listing'],
  ['SLIDESHOW_AD', 'Slideshow'],
  ['EXPLORE_REELS_AD', 'Explore reel'],
  ['FEATURED_REVIEWS', 'Featured reviews'],
  ['PUSH_NOTIFICATION', 'Push notification'],
];

export default function CreateAdPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('FEATURED_LISTING');
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('7');
  const [caption, setCaption] = useState('');
  const create = useCreateAdCampaign(() => { toast.success('Campaign created with wallet funding'); router.push('/business/dashboard/ruby-ads'); });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!name.trim() || !budget || Number(budget) <= 0) return toast.error('Enter a campaign name and valid wallet budget'); create.mutate({ name: name.trim(), type, budget: Number(budget), duration: Number(duration), caption: caption.trim() || undefined, paymentSource: 'WALLET' }); };
  return <main className="mx-auto max-w-2xl p-6"><h1 className="text-2xl font-bold">Create campaign</h1><p className="mt-1 text-sm text-gray-500">Campaigns use your Ruby+ wallet. Fund your wallet with Paystack Inline if necessary.</p><form onSubmit={submit} className="mt-5 space-y-4 rounded-xl border bg-white p-5"><label className="block text-sm font-medium">Campaign name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded border p-2.5" /></label><label className="block text-sm font-medium">Ad type<select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 w-full rounded border p-2.5">{campaignTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Wallet budget (₦)<input required min="1" type="number" value={budget} onChange={(event) => setBudget(event.target.value)} className="mt-1 w-full rounded border p-2.5" /></label><label className="block text-sm font-medium">Duration (days)<input required min="1" max="365" type="number" value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-1 w-full rounded border p-2.5" /></label></div><label className="block text-sm font-medium">Caption <span className="font-normal text-gray-400">(optional)</span><textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={4} className="mt-1 w-full rounded border p-2.5 font-normal" placeholder="What should customers know?" /></label><button disabled={create.isLoading} className="rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white">{create.isLoading ? 'Creating…' : 'Create campaign'}</button></form></main>;
}
