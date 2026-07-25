'use client';

import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAdSubscriptionStatus, useAdSubscriptionTiers, useSavedAdCard, useSubscribeWithSavedCard } from '@/lib/business-api/ad-subscriptions';

export default function SubscribePage() {
  const tiers = useAdSubscriptionTiers();
  const status = useAdSubscriptionStatus();
  const card = useSavedAdCard();
  const subscribe = useSubscribeWithSavedCard(() => { toast.success('Subscription activated'); status.refetch(); });
  const savedCard = card.data as { cardBrand?: string; cardLast4?: string } | null;
  return <main className="mx-auto max-w-6xl p-6"><Link href="/business/dashboard/ruby-ads" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft size={16} /> Back to ads</Link><div className="mt-5"><h1 className="text-2xl font-bold">Grow with Ruby+ Ads</h1><p className="mt-1 text-sm text-gray-500">Choose a weekly plan. Campaign billing uses Paystack; a saved card can be charged securely without leaving this dashboard.</p></div>{savedCard ? <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved payment method: {savedCard.cardBrand ?? 'Card'} •••• {savedCard.cardLast4 ?? '—'}</p> : <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">No saved card yet. Fund your wallet or complete your first secure Paystack subscription checkout when it is configured for this web environment.</p>}<section className="mt-6 grid gap-4 md:grid-cols-3">{(tiers.data ?? []).map((tier) => <article key={tier.tier} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-ruby-red">{tier.tier}</p><h2 className="mt-2 text-xl font-bold">{tier.displayName}</h2><p className="mt-3 text-2xl font-bold">₦{tier.weeklyAmountNgn.toLocaleString('en-NG')}<span className="text-sm font-normal text-gray-500"> / week</span></p><ul className="mt-5 space-y-2 text-sm text-gray-600">{tier.perkBullets.map((perk) => <li key={perk} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{perk}</li>)}</ul><button disabled={!savedCard || subscribe.isLoading || status.data?.subscription?.tier === tier.tier} onClick={() => subscribe.mutate({ tier: tier.tier })} className="mt-6 w-full rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{status.data?.subscription?.tier === tier.tier ? 'Current plan' : savedCard ? 'Subscribe with saved card' : 'Saved card required'}</button></article>)}</section></main>;
}
