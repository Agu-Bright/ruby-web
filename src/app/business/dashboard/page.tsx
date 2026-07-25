'use client';

import Link from 'next/link';
import { ArrowRight, Megaphone, Package, ShoppingBag, Wallet } from 'lucide-react';
import { useBusinessAuth } from '@/lib/business-auth';
import { StoreStatusBar } from '@/components/business/dashboard/StoreStatusBar';
import { StatCardRow } from '@/components/business/dashboard/StatCardRow';
import { PayViaRubyBanner } from '@/components/business/dashboard/PayViaRubyBanner';

interface QuickActionProps { href: string; label: string; description: string; icon: React.ElementType; }

function QuickAction({ href, label, description, icon: Icon }: QuickActionProps) {
  return <Link href={href} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm group"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ruby-red/10 text-ruby-red"><Icon size={18} /></div><div className="min-w-0 flex-1"><p className="mb-0.5 text-sm font-semibold text-gray-900">{label}</p><p className="text-xs leading-relaxed text-gray-500">{description}</p></div><ArrowRight size={16} className="mt-1 text-gray-300 transition group-hover:text-gray-500" /></Link>;
}

export default function BusinessDashboardHome() {
  const { user, business } = useBusinessAuth();
  const greeting = user?.firstName ? `Welcome back, ${user.firstName}` : 'Welcome back';
  return <div className="mx-auto max-w-6xl p-6"><div className="mb-6"><h1 className="mb-1 text-2xl font-bold text-gray-900">{greeting}</h1><p className="text-sm text-gray-500">{business?.name ? `Here’s what’s happening at ${business.name} today.` : 'Here’s what’s happening today.'}</p></div><StoreStatusBar /><StatCardRow /><PayViaRubyBanner /><div className="mt-8"><p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Quick actions</p><div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"><QuickAction href="/business/dashboard/orders" label="Orders" description="Review + accept the pending queue" icon={ShoppingBag} /><QuickAction href="/business/dashboard/products" label="Products" description="Manage catalog + stock" icon={Package} /><QuickAction href="/business/dashboard/wallet" label="Wallet" description="Fund, withdraw, share QR" icon={Wallet} /><QuickAction href="/business/dashboard/ruby-ads" label="Ruby+ Ads" description="Boost visibility with sponsored slots" icon={Megaphone} /></div></div></div>;
}
