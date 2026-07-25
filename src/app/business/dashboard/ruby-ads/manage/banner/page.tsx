'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAdSubscriptionStatus, useSetAdSubscriptionBanner } from '@/lib/business-api/ad-subscriptions';

export default function SubscriptionBannerPage() {
  const status = useAdSubscriptionStatus();
  const current = (status.data?.subscription?.banner ?? {}) as { imageUrl?: string; ctaText?: string; status?: string };
  const [imageUrl, setImageUrl] = useState(current.imageUrl ?? '');
  const [ctaText, setCtaText] = useState(current.ctaText ?? '');
  const update = useSetAdSubscriptionBanner(() => { toast.success('Banner submitted for review'); status.refetch(); });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!imageUrl.trim()) return toast.error('Enter the banner image URL'); update.mutate({ imageUrl: imageUrl.trim(), ctaText: ctaText.trim() || undefined }); };
  return <main className="mx-auto max-w-2xl p-6"><Link href="/business/dashboard/ruby-ads/manage" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft size={16} /> Back to subscription</Link><h1 className="mt-5 text-2xl font-bold">Subscription banner</h1><p className="mt-1 text-sm text-gray-500">Update the banner used by your eligible Ruby+ Ads plan. All changes are reviewed before publishing.</p><form onSubmit={submit} className="mt-5 space-y-4 rounded-2xl border bg-white p-5"><label className="block text-sm font-semibold">Image URL<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>{imageUrl && <img src={imageUrl} alt="Banner preview" className="max-h-48 w-full rounded-xl object-cover" />}<label className="block text-sm font-semibold">Call-to-action <span className="font-normal text-gray-400">(optional)</span><input value={ctaText} onChange={(event) => setCtaText(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" placeholder="Discover our offer" /></label>{current.status && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Current review status: {current.status}</p>}<button disabled={update.isLoading} className="rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white">{update.isLoading ? 'Submitting…' : 'Submit banner'}</button></form></main>;
}
