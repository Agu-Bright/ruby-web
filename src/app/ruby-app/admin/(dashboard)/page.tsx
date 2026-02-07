'use client';

import {
  Store, ShoppingCart, CalendarCheck, AlertTriangle,
  Wallet, MapPin, Clock, TrendingUp
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { StatCard, PageHeader } from '@/components/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import type { DashboardAnalytics } from '@/lib/types';

export default function DashboardPage() {
  const { admin, isSuperAdmin } = useAuth();

  const locationId = !isSuperAdmin && admin?.locationIds?.[0] ? admin.locationIds[0] : undefined;

  const { data, isLoading } = useApi<DashboardAnalytics>(
    () => api.analytics.dashboard({ locationId }),
    [locationId]
  );

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${admin?.firstName || 'Admin'}`}
        description={isSuperAdmin ? 'Global overview of Ruby+ platform' : `Managing ${admin?.locationIds?.length || 0} location(s)`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Businesses"
          value={isLoading ? '…' : (data?.totalBusinesses ?? 0)}
          icon={Store}
        />
        <StatCard
          title="Pending Approvals"
          value={isLoading ? '…' : (data?.pendingApprovals ?? 0)}
          icon={Clock}
        />
        <StatCard
          title="Total Orders"
          value={isLoading ? '…' : (data?.totalOrders ?? 0)}
          icon={ShoppingCart}
        />
        <StatCard
          title="Total Bookings"
          value={isLoading ? '…' : (data?.totalBookings ?? 0)}
          icon={CalendarCheck}
        />
        <StatCard
          title="Revenue"
          value={isLoading ? '…' : formatCurrency(data?.totalRevenue ?? 0)}
          icon={TrendingUp}
        />
        <StatCard
          title="Open Disputes"
          value={isLoading ? '…' : (data?.totalDisputes ?? 0)}
          icon={AlertTriangle}
        />
        <StatCard
          title="Pending Payouts"
          value={isLoading ? '…' : (data?.pendingPayouts ?? 0)}
          icon={Wallet}
        />
        <StatCard
          title="Active Locations"
          value={isLoading ? '…' : (data?.activeLocations ?? 0)}
          icon={MapPin}
        />
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className="skeleton w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-48" />
                  <div className="skeleton h-2.5 w-24" />
                </div>
              </div>
            ))
          ) : data?.recentActivity?.length ? (
            data.recentActivity.slice(0, 10).map((log, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-gray-600">
                    {log.adminEmail?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{log.adminEmail}</span>{' '}
                    <span className="text-gray-500">{log.action}</span>{' '}
                    <span className="font-medium">{log.resourceType}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatRelativeTime(log.createdAt)}
                    {log.locationId && ' · Location scoped'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              No recent activity to display. Activity will appear here once the backend is connected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
