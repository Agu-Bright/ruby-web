'use client';

/**
 * StatCardRow — three top-line KPIs on the dashboard home.
 *
 * Orders today / Bookings today / Wallet balance. Web parity with mobile
 * `<StatCard />` grid. Real wallet balance flows in with M6; for M1 the
 * card reads whatever `dashboardStats.walletBalance` returns (backend
 * already ships it on `orders/stats/dashboard`).
 */

import { ShoppingBag, CalendarCheck, Wallet } from 'lucide-react';
import { useDashboardStats } from '@/lib/business-api';

function formatCurrency(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return '₦—';
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  tint: 'green' | 'blue' | 'purple';
}

function StatCard({ label, value, hint, icon: Icon, tint }: StatCardProps) {
  const tintClasses = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  }[tint];
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tintClasses}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export function StatCardRow() {
  const { data, isLoading } = useDashboardStats();

  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="skeleton h-3 w-1/2 mb-3 rounded" />
            <div className="skeleton h-7 w-1/3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const ordersToday = data?.ordersToday ?? 0;
  const pendingOrders = data?.pendingOrders ?? 0;
  const activeBookings = data?.activeBookings ?? 0;
  const pendingBookings = data?.pendingBookings ?? 0;
  const walletBalance = data?.walletBalance ?? null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <StatCard
        label="Orders today"
        value={ordersToday.toLocaleString('en-NG')}
        hint={
          pendingOrders > 0
            ? `${pendingOrders} pending your response`
            : 'No pending orders'
        }
        icon={ShoppingBag}
        tint="green"
      />
      <StatCard
        label="Active bookings"
        value={activeBookings.toLocaleString('en-NG')}
        hint={
          pendingBookings > 0
            ? `${pendingBookings} awaiting confirmation`
            : 'No pending bookings'
        }
        icon={CalendarCheck}
        tint="blue"
      />
      <StatCard
        label="Wallet balance"
        value={walletBalance != null ? formatCurrency(walletBalance) : '—'}
        hint={walletBalance != null ? 'Available to withdraw' : 'Ships with M6'}
        icon={Wallet}
        tint="purple"
      />
    </div>
  );
}
