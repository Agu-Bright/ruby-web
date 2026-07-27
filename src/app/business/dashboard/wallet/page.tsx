'use client';

import Link from 'next/link';
import { Landmark, Wallet } from 'lucide-react';
import { useBusinessWallets } from '@/lib/business-api/wallet';
import { useBankAccounts, usePayouts } from '@/lib/business-api/payouts';

const formatNaira = (amount: number) =>
  `₦${Math.round(amount).toLocaleString('en-NG')}`;

export default function WalletPage() {
  const wallets = useBusinessWallets();
  const accounts = useBankAccounts();
  const payouts = usePayouts();
  const wallet = wallets.data?.[0];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ruby-red">Finance</p>
          <h1 className="mt-1 text-2xl font-bold">Wallet</h1>
        </div>
        <Link href="/business/dashboard/payouts" className="rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white">Request payout</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-2xl bg-gradient-to-br from-ruby-red to-rose-600 p-6 text-white md:col-span-2">
          <Wallet size={22} />
          <p className="mt-8 text-sm text-white/80">Available balance</p>
          <p className="mt-1 text-4xl font-bold">{formatNaira(wallet?.balance ?? 0)}</p>
          <div className="mt-6 flex gap-3">
            <button className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold">Fund wallet</button>
            <Link href="/business/dashboard/payouts" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ruby-red">Withdraw</Link>
          </div>
        </section>
        <section className="rounded-xl border bg-white p-5">
          <Landmark size={20} className="text-ruby-red" />
          <p className="mt-3 text-sm font-semibold">Bank accounts</p>
          <p className="mt-1 text-2xl font-bold">{accounts.data?.length ?? 0}</p>
          <Link href="/business/dashboard/payouts" className="mt-3 inline-flex text-sm font-semibold text-ruby-red">Manage accounts</Link>
        </section>
      </div>

      <section className="mt-5 rounded-xl border bg-white p-5">
        <div className="flex justify-between">
          <h2 className="font-semibold">Recent payouts</h2>
          <Link href="/business/dashboard/payouts" className="text-sm text-ruby-red">View all</Link>
        </div>
        <div className="mt-4 space-y-3">
          {(payouts.data ?? []).slice(0, 5).map((p) => (
            <div key={p._id} className="flex justify-between border-t pt-3 text-sm">
              <span>{p.reference ?? 'Payout'}<small className="block text-gray-500">{p.status}</small></span>
              <strong>{formatNaira(p.amount)}</strong>
            </div>
          ))}
          {!payouts.data?.length && <p className="text-sm text-gray-500">No payouts yet.</p>}
        </div>
      </section>
    </div>
  );
}
