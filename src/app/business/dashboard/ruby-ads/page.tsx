'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, ChevronRight, CircleCheck, Gem, Megaphone, Sparkles } from 'lucide-react';
import { useAdCampaigns, useAdStats } from '@/lib/business-api/ads';
import { useAdSubscriptionStatus } from '@/lib/business-api/ad-subscriptions';
import type { AdCampaign } from '@/lib/types';

const activeSubscriptionStatuses = new Set(['ACTIVE', 'IN_GRACE_PERIOD', 'PAUSED']);

function formatCurrency(value: number) {
  return `₦${Math.round(value).toLocaleString('en-NG')}`;
}

function formatStatus(status: string) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdsPage() {
  const subscription = useAdSubscriptionStatus();
  const campaigns = useAdCampaigns();
  const stats = useAdStats();
  const [showHistory, setShowHistory] = useState(false);

  const status = subscription.data;
  const subscriptionStatus = status?.subscription?.status ?? '';
  const hasActiveSubscription = activeSubscriptionStatuses.has(subscriptionStatus);
  const isPaused = subscriptionStatus === 'PAUSED';
  const isPendingReview = subscriptionStatus === 'PENDING_ONBOARDING_REVIEW';
  const pastCampaigns = useMemo(
    () => ((campaigns.data ?? []) as AdCampaign[]).filter((campaign) => {
      const paymentSource = (campaign as { paymentSource?: string }).paymentSource;
      return paymentSource !== 'SUBSCRIPTION';
    }),
    [campaigns.data],
  );
  const statsData = stats.data;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ruby-red">Marketing</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Ruby+ Ads</h1>
          <p className="mt-1 text-sm text-gray-500">Your weekly tier helps customers discover your business automatically.</p>
        </div>
        <Link
          href={hasActiveSubscription ? '/business/dashboard/ruby-ads/manage' : '/business/dashboard/ruby-ads/subscribe'}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-ruby-red hover:text-ruby-red"
        >
          {hasActiveSubscription ? 'Manage subscription' : 'Explore tiers'}
        </Link>
      </header>

      {subscription.isLoading ? (
        <section className="animate-pulse rounded-3xl border bg-white p-7 shadow-sm">
          <div className="h-4 w-28 rounded bg-gray-100" />
          <div className="mt-4 h-9 w-56 rounded bg-gray-100" />
          <div className="mt-3 h-4 w-80 max-w-full rounded bg-gray-100" />
        </section>
      ) : hasActiveSubscription && status ? (
        <section className="relative overflow-hidden rounded-[28px] bg-[#2b1038] p-1 shadow-[0_18px_45px_rgba(65,18,63,0.18)]">
          <div className="pointer-events-none absolute -right-24 -top-36 h-80 w-80 rounded-full bg-ruby-red/70 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
          <div className="relative grid overflow-hidden rounded-[24px] bg-gradient-to-br from-[#3c1248] via-[#62164d] to-[#9d2047] lg:grid-cols-[minmax(0,1fr)_270px]">
            <div className="p-6 text-white sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20"><Sparkles size={25} /></div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">Your Ruby+ Ads tier</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2.5"><h2 className="text-3xl font-bold tracking-tight">{status.tier.displayName}</h2><span className="inline-flex items-center gap-1 rounded-full bg-emerald-300/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 ring-1 ring-emerald-100/20"><CircleCheck size={13} /> {formatStatus(subscriptionStatus)}</span></div>
                  </div>
                </div>
              </div>
              <p className="mt-6 max-w-xl text-sm leading-6 text-white/80">Your visibility benefits are active across Ruby+. We automatically apply your tier’s eligible ranking and discovery placements.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {status.tier.perkBullets.slice(0, 2).map((perk) => <span key={perk} className="rounded-full bg-black/15 px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/10">{perk}</span>)}
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-5 text-sm">
                <div><p className="text-xs text-white/55">Next renewal</p><p className="mt-1 font-semibold text-white">{new Date(status.subscription.currentPeriodEnd).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                <Link href="/business/dashboard/ruby-ads/manage" className="inline-flex items-center gap-1.5 font-semibold text-white transition hover:text-white/75">Manage tier <ArrowUpRight size={16} /></Link>
              </div>
            </div>
            <aside className="flex flex-col justify-between border-t border-white/15 bg-[#1f0c2b]/30 p-6 text-white backdrop-blur-sm lg:border-l lg:border-t-0 sm:p-7">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Weekly investment</p><p className="mt-3 text-3xl font-bold tracking-tight">{formatCurrency(status.subscription.weeklyAmountNgn)}</p><p className="mt-1 text-sm text-white/65">billed every 7 days</p></div>
              <Link href="/business/dashboard/ruby-ads/manage" className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#50163f] transition hover:bg-white/90">View subscription <ArrowUpRight size={16} /></Link>
            </aside>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#2d103b] via-[#6d1d55] to-[#fd362f] p-6 text-white shadow-lg sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex max-w-xl gap-4">
              <div className="rounded-2xl bg-white/15 p-3"><Sparkles size={26} /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Grow your discovery</p>
                <h2 className="mt-1 text-3xl font-bold">Pick a tier to get started</h2>
                <p className="mt-2 text-sm leading-6 text-white/85">Choose Starter, Growth or Prime to unlock ongoing visibility without creating one-off campaigns.</p>
              </div>
            </div>
            <Link href="/business/dashboard/ruby-ads/subscribe" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#5a194a] transition hover:bg-white/90">Explore tiers</Link>
          </div>
        </section>
      )}

      {isPendingReview && (
        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Your Ruby+ Ads setup is being reviewed.</p>
          <p className="mt-1 text-amber-800">We’ll activate your tier as soon as the onboarding review is complete.</p>
        </section>
      )}

      {isPaused && (
        <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div><p className="font-semibold">Your tier is paused.</p><p className="mt-1 text-amber-800">Your automatic visibility benefits resume when you reactivate the subscription.</p></div>
          <Link href="/business/dashboard/ruby-ads/manage" className="font-semibold text-amber-900 underline underline-offset-4">Manage tier</Link>
        </section>
      )}

      {hasActiveSubscription && statsData && (statsData.totalImpressions > 0 || statsData.totalClicks > 0) && (
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Impressions', statsData.totalImpressions],
            ['Engagements', statsData.totalClicks],
            ['Active placements', statsData.active],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{Number(value).toLocaleString('en-NG')}</p>
            </div>
          ))}
        </section>
      )}

      <section className="mt-6 overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50 to-rose-50 p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex max-w-2xl items-start gap-4">
            <div className="rounded-2xl bg-[#3d174a] p-3 text-white"><Gem size={25} /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Real-world discovery</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">Bring your business into Ruby Quest</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">Create a local gem experience that rewards nearby customers for discovering and visiting your business.</p>
            </div>
          </div>
          <Link href="/business/dashboard/ruby-ads/ruby-quest" className="rounded-xl bg-[#3d174a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#2d103b]">Open Ruby Quest</Link>
        </div>
      </section>

      {pastCampaigns.length > 0 && (
        <section className="mt-8 rounded-2xl border bg-white shadow-sm">
          <button type="button" onClick={() => setShowHistory((visible) => !visible)} aria-expanded={showHistory} className="flex w-full items-center justify-between gap-4 p-5 text-left">
            <div>
              <p className="font-semibold text-gray-900">Past campaigns · {pastCampaigns.length}</p>
              <p className="mt-1 text-sm text-gray-500">One-off ads from before the weekly tier model. Existing records remain available here.</p>
            </div>
            <ChevronDown className={`shrink-0 text-gray-500 transition ${showHistory ? 'rotate-180' : ''}`} size={20} />
          </button>
          {showHistory && (
            <div className="border-t px-5">
              {pastCampaigns.map((campaign) => (
                <Link key={campaign._id} href={`/business/dashboard/ruby-ads/${campaign._id}`} className="flex items-center justify-between gap-4 border-b py-4 last:border-0 hover:text-ruby-red">
                  <div className="flex min-w-0 items-center gap-3"><Megaphone size={18} className="shrink-0 text-ruby-red" /><div className="min-w-0"><p className="truncate font-semibold text-gray-900">{campaign.name || formatStatus(campaign.type)}</p><p className="mt-1 text-xs text-gray-500">{formatStatus(campaign.status)} · {formatCurrency(campaign.totalCost)}</p></div></div>
                  <ChevronRight size={18} className="shrink-0 text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
