'use client';

import Link from 'next/link';
import { Gem, LoaderCircle, Pause, Play, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useInitializeRubyQuestPaystack, usePauseRubyQuest, useResumeRubyQuest, useRubyQuestAnalytics, useRubyQuestCampaigns, useSetRubyQuestAutoRenew, type RubyRarity } from '@/lib/business-api/ruby-quest';

const tiers: Array<{ tier: RubyRarity; price: number; copy: string }> = [
  { tier: 'COMMON', price: 5000, copy: 'Steady local discovery for nearby customers.' },
  { tier: 'RARE', price: 12000, copy: 'Higher-frequency discovery to grow footfall.' },
  { tier: 'LEGENDARY', price: 30000, copy: 'Premium discovery, subject to campaign review.' },
];

export default function RubyQuestPage() {
  const campaigns = useRubyQuestCampaigns();
  const analytics = useRubyQuestAnalytics();
  const refresh = () => { void campaigns.refetch(); void analytics.refetch(); };
  const paystack = useInitializeRubyQuestPaystack();
  const pause = usePauseRubyQuest(() => { toast.success('Ruby Quest paused'); refresh(); });
  const resume = useResumeRubyQuest(() => { toast.success('Ruby Quest resumed'); refresh(); });
  const autoRenew = useSetRubyQuestAutoRenew(() => { toast.success('Auto-renewal updated'); refresh(); });
  const items = campaigns.data?.items ?? [];
  const activeByTier = new Map(items.filter((item) => ['ACTIVE', 'PAUSED', 'PENDING_REVIEW'].includes(item.status)).map((item) => [item.tier, item]));
  const stats = analytics.data as { issued?: number; collected?: number; collectionRate?: number; uniqueVisitors?: number } | null;
  const startCheckout = async (tier: RubyRarity) => {
    try {
      const result = await paystack.mutate({ tier, callbackUrl: `${window.location.origin}/business/dashboard/ruby-ads/ruby-quest/complete` });
      if (!result?.authorizationUrl) throw new Error('Paystack did not return a checkout link.');
      window.location.assign(result.authorizationUrl);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not start Paystack checkout.'); }
  };
  return <main className="mx-auto max-w-6xl p-6"><Link href="/business/dashboard/ruby-ads" className="text-sm font-semibold text-gray-600">← Back to ads</Link><section className="mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#321242] via-[#6b1e55] to-ruby-red p-7 text-white shadow-lg"><div className="flex items-start gap-4"><div className="rounded-2xl bg-white/15 p-3"><Gem size={30} /></div><div><p className="text-xs font-semibold uppercase tracking-wider text-white/70">Real-world discovery</p><h1 className="mt-1 text-3xl font-bold">Ruby Quest</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/85">Run Common, Rare and Legendary quests independently. Each tier bills weekly through Paystack until you turn off its auto-renewal.</p></div></div></section><section className="mt-6 grid gap-3 sm:grid-cols-4">{[['Issued', stats?.issued ?? 0], ['Collected', stats?.collected ?? 0], ['Collection rate', `${Math.round((stats?.collectionRate ?? 0) * 100)}%`], ['Unique visitors', stats?.uniqueVisitors ?? 0]].map(([label, value]) => <div key={String(label)} className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</section><section className="mt-8"><h2 className="text-lg font-bold">Choose Ruby Quest tiers</h2><p className="mt-1 text-sm text-gray-500">Secure card checkout is handled by Paystack. You may hold all three tiers at once.</p><div className="mt-3 grid gap-4 md:grid-cols-3">{tiers.map((tier) => { const active = activeByTier.get(tier.tier); return <article key={tier.tier} className="rounded-2xl border bg-white p-5 shadow-sm"><Sparkles size={18} className="text-ruby-red" /><h3 className="mt-3 font-bold">{tier.tier}</h3><p className="mt-4 text-2xl font-bold">₦{tier.price.toLocaleString('en-NG')}<span className="text-sm font-normal text-gray-500"> / week</span></p><p className="mt-3 text-sm text-gray-600">{tier.copy}</p>{active ? <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-semibold">{active.status.replaceAll('_', ' ')}</p><label className="mt-3 flex items-center justify-between font-medium">Auto-renew<input type="checkbox" checked={active.billing?.autoRenew ?? false} disabled={autoRenew.isLoading} onChange={(event) => autoRenew.mutate({ campaignId: active._id, autoRenew: event.target.checked })} className="h-4 w-4 accent-ruby-red" /></label></div> : <button type="button" disabled={paystack.isLoading} onClick={() => void startCheckout(tier.tier)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ruby-red px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{paystack.isLoading ? <LoaderCircle className="animate-spin" size={16} /> : null}Pay with Paystack</button>}</article>; })}</div></section><section className="mt-8 rounded-2xl border bg-white p-5"><h2 className="font-bold">Your Ruby Quest campaigns</h2>{items.length ? <div className="mt-3 divide-y">{items.map((campaign) => <div key={campaign._id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{campaign.tier} quest <span className="ml-2 text-xs font-medium text-gray-500">{campaign.status}</span></p><p className="mt-1 text-xs text-gray-500">Current period ends {new Date(campaign.billing?.currentPeriodEnd ?? campaign.endDate).toLocaleDateString('en-NG')}</p></div>{campaign.status === 'ACTIVE' ? <button onClick={() => pause.mutate(campaign._id)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Pause size={15} /> Pause</button> : campaign.status === 'PAUSED' ? <button onClick={() => resume.mutate(campaign._id)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Play size={15} /> Resume</button> : null}</div>)}</div> : <p className="mt-3 text-sm text-gray-500">No Ruby Quest campaigns yet.</p>}</section></main>;
}
