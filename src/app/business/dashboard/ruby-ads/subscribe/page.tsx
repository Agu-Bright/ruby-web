'use client';

import Link from 'next/link';
import { ArrowLeft, Check, CreditCard, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessAuth } from '@/lib/business-auth';
import {
  type AdTier,
  useAdSubscriptionStatus,
  useAdSubscriptionTiers,
  useInitializePaystackAdSubscription,
  useSavedAdCard,
  useSubscribeWithSavedCard,
} from '@/lib/business-api/ad-subscriptions';

type SavedCard = { cardBrand?: string; cardLast4?: string; cardExpMonth?: string; cardExpYear?: string };
const activeStatuses = new Set(['ACTIVE', 'IN_GRACE_PERIOD', 'PAUSED']);

function money(value: number) {
  return `₦${value.toLocaleString('en-NG')}`;
}

function formatPerk(perk: string) {
  return perk
    .replace(/push-notification blasts?\/month/gi, 'push-notification blasts/week')
    .replace(/reels?\/month/gi, 'reels/week');
}

export default function SubscribePage() {
  const { user } = useBusinessAuth();
  const tiers = useAdSubscriptionTiers();
  const status = useAdSubscriptionStatus();
  const card = useSavedAdCard();
  const initializePaystack = useInitializePaystackAdSubscription();
  const subscribeWithCard = useSubscribeWithSavedCard(() => {
    toast.success('Your Ruby+ Ads tier is active.');
    void status.refetch();
  });
  const savedCard = card.data as SavedCard | null;
  const subscription = status.data?.subscription;
  const hasActiveTier = !!subscription && activeStatuses.has(subscription.status);

  const payWithNewCard = async (tier: AdTier) => {
    try {
      const callbackUrl = `${window.location.origin}/business/dashboard/ruby-ads/subscribe/complete`;
      const result = await initializePaystack.mutate({ tier, email: user?.email, callbackUrl });
      if (!result?.authorizationUrl) throw new Error('Paystack did not return a secure checkout URL.');
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start secure card checkout.');
    }
  };

  const currentTier = subscription?.tier;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <Link href="/business/dashboard/ruby-ads" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-ruby-red">
        <ArrowLeft size={16} /> Back to Ruby+ Ads
      </Link>

      <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2d103b] via-[#6d1d55] to-[#fd362f] p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Ruby+ Ads membership</p>
            <h1 className="mt-2 text-3xl font-bold">Choose the visibility that fits your business.</h1>
            <p className="mt-3 text-sm leading-6 text-white/85">Your tier renews weekly. Paystack processes card details securely and Ruby+ only receives your card’s safe display details.</p>
          </div>
          {hasActiveTier && (
            <div className="rounded-2xl bg-white/15 px-4 py-3">
              <p className="text-xs text-white/70">Your current tier</p>
              <p className="mt-1 text-lg font-bold">{status.data?.tier.displayName}</p>
              <p className="mt-1 text-xs text-white/70">Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-NG')}</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-ruby-red/10 p-2.5 text-ruby-red"><CreditCard size={20} /></div>
            <div>
              <p className="font-semibold text-gray-900">Payment card</p>
              {card.isLoading ? <p className="mt-1 text-sm text-gray-500">Checking your saved card…</p> : savedCard?.cardLast4 ? <><p className="mt-1 text-sm text-gray-600">{savedCard.cardBrand ?? 'Card'} ending in {savedCard.cardLast4}</p><p className="mt-1 text-xs text-gray-500">Saved securely by Paystack{savedCard.cardExpMonth && savedCard.cardExpYear ? ` · expires ${savedCard.cardExpMonth}/${String(savedCard.cardExpYear).slice(-2)}` : ''}</p></> : <><p className="mt-1 text-sm text-gray-600">No card saved yet.</p><p className="mt-1 text-xs leading-5 text-gray-500">Choose a tier below and pay securely with Paystack. Your card is saved after the first successful subscription payment.</p></>}
            </div>
          </div>
          {!savedCard?.cardLast4 && <a href="#tiers" className="mt-4 inline-flex text-sm font-semibold text-ruby-red underline-offset-4 hover:underline">Add a card securely</a>}
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-950">
          <div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-700" size={20} /><div><p className="font-semibold">Secure recurring billing</p><p className="mt-1 text-sm leading-6 text-emerald-900">Paystack handles card entry and weekly billing. You can pause auto-renewal or change your tier from subscription management at any time.</p></div></div>
        </div>
      </section>

      <section id="tiers" className="mt-8 grid gap-5 md:grid-cols-3">
        {(tiers.data ?? []).map((tier) => {
          const isCurrent = currentTier === tier.tier;
          const isBusy = initializePaystack.isLoading || subscribeWithCard.isLoading;
          return (
            <article key={tier.tier} className={`relative rounded-3xl border bg-white p-6 shadow-sm ${isCurrent ? 'border-ruby-red ring-1 ring-ruby-red/20' : 'border-gray-200'}`}>
              {tier.tier === 'GROWTH' && <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-ruby-red/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ruby-red"><Sparkles size={12} /> Popular</span>}
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ruby-red">{tier.tier}</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">{tier.displayName}</h2>
              <p className="mt-4 text-3xl font-bold text-gray-900">{money(tier.weeklyAmountNgn)}<span className="text-sm font-medium text-gray-500"> / week</span></p>
              <ul className="mt-6 space-y-3 text-sm leading-5 text-gray-600">
                {tier.perkBullets.map((perk) => <li key={perk} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{formatPerk(perk)}</li>)}
              </ul>
              {isCurrent ? (
                <Link href="/business/dashboard/ruby-ads/manage" className="mt-7 inline-flex w-full items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-ruby-red hover:text-ruby-red">Manage current tier</Link>
              ) : savedCard?.cardLast4 ? (
                <button type="button" disabled={isBusy} onClick={() => subscribeWithCard.mutate({ tier: tier.tier })} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ruby-red px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e62d27] disabled:cursor-not-allowed disabled:opacity-60">{isBusy ? <LoaderCircle className="animate-spin" size={16} /> : <CreditCard size={16} />} Charge card ending {savedCard.cardLast4}</button>
              ) : (
                <button type="button" disabled={isBusy} onClick={() => void payWithNewCard(tier.tier)} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ruby-red px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e62d27] disabled:cursor-not-allowed disabled:opacity-60">{isBusy ? <LoaderCircle className="animate-spin" size={16} /> : <CreditCard size={16} />} Pay securely & save card</button>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
