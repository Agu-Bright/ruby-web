'use client';

/**
 * Dashboard home — M1.
 *
 * Renders (top → bottom):
 *   1. Greeting header (name + business tagline)
 *   2. StoreStatusBar — open/offline toggle, tied to /business/daily-operations/today
 *   3. StatCardRow  — orders today / bookings today / wallet balance (60s poll)
 *   4. PayViaRubyBanner — nudge to share the Ruby Pay QR
 *   5. Quick actions grid — deep-links to Orders / Products / Wallet
 *   6. "What's live" footnote — which milestones ship the rest
 *
 * Engagement chart (7/14/30d chips) + review preview + Chat FAB are
 * scoped to a follow-up M1 slice — the endpoints are already wired
 * (`useBusinessEngagement`, `useBusinessReviewStats`) so those cards
 * plug in without more backend work.
 */

import Link from 'next/link';
import {
  ShoppingBag,
  Package,
  Wallet,
  Megaphone,
  ArrowRight,
} from 'lucide-react';
import { useBusinessAuth } from '@/lib/business-auth';
import { StoreStatusBar } from '@/components/business/dashboard/StoreStatusBar';
import { StatCardRow } from '@/components/business/dashboard/StatCardRow';
import { PayViaRubyBanner } from '@/components/business/dashboard/PayViaRubyBanner';

interface QuickActionProps {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
}
function QuickAction({ href, label, description, icon: Icon }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 hover:border-gray-300 hover:shadow-sm transition group"
    >
      <div className="w-9 h-9 rounded-lg bg-ruby-red/10 text-ruby-red flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 mb-0.5">{label}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
      <ArrowRight
        size={16}
        className="text-gray-300 group-hover:text-gray-500 transition mt-1"
      />
    </Link>
  );
}

export default function BusinessDashboardHome() {
  const { user, business } = useBusinessAuth();

  const greeting = user?.firstName
    ? `Welcome back, ${user.firstName}`
    : 'Welcome back';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{greeting}</h1>
        <p className="text-sm text-gray-500">
          {business?.name
            ? `Here’s what’s happening at ${business.name} today.`
            : 'Here’s what’s happening today.'}
        </p>
      </div>

      <StoreStatusBar />
      <StatCardRow />
      <PayViaRubyBanner />

      <div className="mt-8">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Quick actions
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            href="/business/dashboard/orders"
            label="Orders"
            description="Review + accept the pending queue"
            icon={ShoppingBag}
          />
          <QuickAction
            href="/business/dashboard/products"
            label="Products"
            description="Manage catalog + stock"
            icon={Package}
          />
          <QuickAction
            href="/business/dashboard/wallet"
            label="Wallet"
            description="Fund, withdraw, share QR"
            icon={Wallet}
          />
          <QuickAction
            href="/business/dashboard/ruby-ads"
            label="Ruby+ Ads"
            description="Boost visibility with sponsored slots"
            icon={Megaphone}
          />
        </div>
      </div>

      <div className="mt-10 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        <p className="font-semibold mb-1">M1 dashboard is live.</p>
        <p className="text-xs leading-relaxed">
          Store status toggle + StatCards (orders / bookings / wallet, 60 s
          poll) + Ruby Pay QR nudge + quick actions. Real orders list (M2),
          bookings list (M3), catalog CRUD (M4), wallet + payments (M6) and
          the rest follow — each quick action leads to a page that’ll fill
          in on its milestone.
        </p>
      </div>
    </div>
  );
}
