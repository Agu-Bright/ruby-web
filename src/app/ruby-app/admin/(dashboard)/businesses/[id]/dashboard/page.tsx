'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  CircleDollarSign,
  ClipboardList,
  Image as ImageIcon,
  Package,
  ShieldCheck,
  Store,
  UserRoundCog,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import type { Business } from '@/lib/types';

export default function AssistedBusinessDashboardPage() {
  const params = useParams<{ id: string }>();
  const businessId = params?.id ?? '';
  const { admin } = useAuth();
  const roles = admin?.roles?.map((role) => role.toLowerCase()) ?? [];
  const isSuperAdmin = roles.includes('super_admin') || admin?.scope === 'GLOBAL';
  const isLocationAdmin = roles.includes('location_admin');
  const canUseFinance = isSuperAdmin;

  const fetcher = useCallback(
    () => api.businesses.get(businessId),
    [businessId],
  );
  const { data, isLoading, error } = useApi<Business>(fetcher, [businessId]);
  const business = data;
  const workspaceUrl = `/ruby-app/admin/businesses?openId=${encodeURIComponent(businessId)}`;

  if (isLoading) {
    return <div className="p-6"><div className="h-64 animate-pulse rounded-2xl bg-gray-100" /></div>;
  }

  if (error || !business) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
          We could not open this business dashboard. Return to Businesses and try again.
        </div>
      </div>
    );
  }

  const supportOnly = !isSuperAdmin && !isLocationAdmin;
  const accessLabel = isSuperAdmin
    ? 'Super Admin assisted access'
    : isLocationAdmin
      ? 'Location Admin assisted access'
      : 'Support assisted access';

  const sections = [
    { title: 'Business profile', text: 'Name, address, contact and operating hours', icon: Store, enabled: true },
    { title: 'Media gallery', text: 'Logo, cover images and business photos', icon: ImageIcon, enabled: true },
    { title: 'Catalogue', text: 'Products and services on behalf of the business', icon: Package, enabled: true },
    { title: 'Orders & bookings', text: 'Operational support and customer updates', icon: ClipboardList, enabled: true },
    { title: 'Wallet & withdrawals', text: canUseFinance ? 'Finance access is available to Super Admin' : 'Restricted in assisted access', icon: WalletCards, enabled: canUseFinance },
  ];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <Link href="/ruby-app/admin/businesses" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-950">
        <ArrowLeft size={16} /> Back to businesses
      </Link>

      <section className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#67102f] via-[#b71f3d] to-[#fd362f] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/20">
              {business.logoUrl ? <img src={business.logoUrl} alt="" className="h-full w-full object-cover" /> : <Building2 size={28} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">Assisted business dashboard</p>
              <h1 className="mt-1 truncate text-2xl font-bold">{business.name}</h1>
              <p className="mt-1 text-sm text-white/80">{accessLabel} · All actions are recorded under {admin?.firstName ?? 'this admin'}.</p>
            </div>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ring-white/25">{business.status}</span>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-amber-700" size={18} />
          <p><strong>Restricted staff mode.</strong> {supportOnly || isLocationAdmin ? 'Withdrawals, payouts, bank accounts, ownership and account-security changes are unavailable.' : 'Super Admin finance access is enabled; use it only when authorised.'}</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const content = (
            <>
              <span className={`mb-5 inline-flex rounded-xl p-3 ${section.enabled ? 'bg-ruby-red/10 text-ruby-red' : 'bg-gray-100 text-gray-400'}`}><Icon size={22} /></span>
              <h2 className="font-bold text-gray-950">{section.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">{section.text}</p>
              <span className={`mt-5 inline-flex text-sm font-semibold ${section.enabled ? 'text-ruby-red' : 'text-gray-400'}`}>{section.enabled ? 'Open workspace →' : 'Not available'}</span>
            </>
          );
          return section.enabled ? (
            <Link key={section.title} href={workspaceUrl} className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-ruby-red/30 hover:shadow-md">
              {content}
            </Link>
          ) : (
            <div key={section.title} className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5">{content}</div>
          );
        })}
      </section>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-950">Business operations</h2>
            <p className="mt-1 text-sm text-gray-500">Continue to the scoped business workspace for profile, catalogue and operational support.</p>
          </div>
          <Link href={workspaceUrl} className="inline-flex items-center gap-2 rounded-xl bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white">
            <UserRoundCog size={16} /> Open assisted workspace
          </Link>
        </div>
      </section>
    </main>
  );
}
