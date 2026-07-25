'use client';

import Link from 'next/link';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useAdSubscriptionStatus, usePauseAdSubscription, useResumeAdSubscription, useSetAdSubAutoRenew } from '@/lib/business-api/ad-subscriptions';

export default function ManageSubscriptionPage() {
  const status = useAdSubscriptionStatus();
  const refresh = () => status.refetch();
  const pause = usePauseAdSubscription(() => { toast.success('Subscription paused'); refresh(); });
  const resume = useResumeAdSubscription(() => { toast.success('Subscription resumed'); refresh(); });
  const autoRenew = useSetAdSubAutoRenew(() => { toast.success('Auto-renewal updated'); refresh(); });
  if (status.isLoading) return <p className="p-6 text-sm text-gray-500">Loading subscription…</p>;
  const data = status.data;
  if (!data?.subscription) return <main className="p-6"><p>No active ad subscription.</p><Link href="/business/dashboard/ruby-ads/subscribe" className="mt-4 inline-block font-semibold text-ruby-red">View plans</Link></main>;
  const sub = data.subscription;
  return <main className="mx-auto max-w-3xl p-6"><Link href="/business/dashboard/ruby-ads" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft size={16} /> Back to ads</Link><div className="mt-5 rounded-2xl border bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-ruby-red">{sub.status}</p><h1 className="mt-2 text-2xl font-bold">{data.tier.displayName}</h1><p className="mt-1 text-sm text-gray-500">₦{sub.weeklyAmountNgn.toLocaleString('en-NG')} weekly · Renews through {new Date(sub.currentPeriodEnd).toLocaleDateString('en-NG')}</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Push blasts</p><p className="mt-1 font-bold">{data.quotas.push.used}/{data.quotas.push.cap} used</p></div><div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Organic reels</p><p className="mt-1 font-bold">{data.quotas.reels.used}/{data.quotas.reels.cap} used</p></div></div><label className="mt-6 flex items-center justify-between rounded-xl border p-4 text-sm font-semibold">Auto-renew<input type="checkbox" checked={sub.autoRenew} disabled={autoRenew.isLoading} onChange={(event) => autoRenew.mutate(event.target.checked)} className="h-5 w-5 accent-ruby-red" /></label>{sub.pendingDowngradeToTier && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Your plan is scheduled to change to {sub.pendingDowngradeToTier} at the end of this period.</p>}<div className="mt-6 flex gap-3">{sub.status === 'PAUSED' ? <button disabled={resume.isLoading} onClick={() => resume.mutate()} className="inline-flex items-center gap-2 rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white"><Play size={16} /> Resume</button> : <button disabled={pause.isLoading} onClick={() => pause.mutate({})} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold"><Pause size={16} /> Pause</button>}<Link href="/business/dashboard/ruby-ads/subscribe" className="rounded-lg border px-4 py-2.5 text-sm font-semibold">Change plan</Link></div></div></main>;
}
