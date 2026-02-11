'use client';

import {
  Store, ShoppingCart, CalendarCheck, AlertTriangle,
  Wallet, MapPin, Clock, TrendingUp, Activity,
  ArrowUpRight, ArrowDownRight, Gem,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { formatCurrency, formatRelativeTime, toLocationId } from '@/lib/utils';
import type { DashboardAnalytics } from '@/lib/types';

export default function DashboardPage() {
  const { admin, isSuperAdmin } = useAuth();

  const locationId = !isSuperAdmin && admin?.locationIds?.[0] ? toLocationId(admin.locationIds[0]) : undefined;

  const { data, isLoading } = useApi<DashboardAnalytics>(
    () => api.analytics.dashboard({ locationId }),
    [locationId]
  );

  const stats = [
    {
      title: 'Total Businesses',
      value: data?.totalBusinesses ?? 0,
      icon: Store,
      color: 'from-ruby-500 to-ruby-700',
      iconBg: 'bg-ruby-50',
      iconColor: 'text-ruby-600',
    },
    {
      title: 'Pending Approvals',
      value: data?.pendingApprovals ?? 0,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Total Orders',
      value: data?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Total Bookings',
      value: data?.totalBookings ?? 0,
      icon: CalendarCheck,
      color: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Revenue',
      value: formatCurrency(data?.totalRevenue ?? 0),
      icon: TrendingUp,
      color: 'from-ruby-500 to-ruby-700',
      iconBg: 'bg-ruby-50',
      iconColor: 'text-ruby-600',
      isRevenue: true,
    },
    {
      title: 'Open Disputes',
      value: data?.totalDisputes ?? 0,
      icon: AlertTriangle,
      color: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      title: 'Pending Payouts',
      value: data?.pendingPayouts ?? 0,
      icon: Wallet,
      color: 'from-violet-500 to-violet-600',
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      title: 'Active Locations',
      value: data?.activeLocations ?? 0,
      icon: MapPin,
      color: 'from-ruby-500 to-ruby-700',
      iconBg: 'bg-ruby-50',
      iconColor: 'text-ruby-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-8 sm:px-8 sm:py-10"
        style={{
          background: "linear-gradient(135deg, #B71C1C 0%, #FD362F 60%, #E53935 100%)",
        }}
      >
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Diamond decoration */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[15%] w-48 h-48 bg-contain bg-no-repeat bg-center opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: "url(/images/diamond2.png)" }}
          aria-hidden="true"
        />
        <div
          className="absolute -left-4 bottom-0 w-28 h-28 bg-contain bg-no-repeat bg-center opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: "url(/images/diamond1.png)" }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gem className="w-5 h-5 text-white/70" />
              <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                {isSuperAdmin ? 'Global Admin' : 'Location Admin'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Welcome back, {admin?.firstName || 'Admin'}
            </h1>
            <p className="text-white/60 text-sm mt-2 max-w-lg">
              {isSuperAdmin
                ? 'Here\'s your global overview of the Ruby+ platform. Monitor businesses, transactions, and operations all in one place.'
                : `Managing ${admin?.locationIds?.length || 0} location(s). View your operational metrics below.`
              }
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-white/80 text-xs font-medium">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="card p-5 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {stat.title}
                </p>
                <p className="mt-2.5 text-2xl font-bold text-gray-900">
                  {isLoading ? (
                    <span className="inline-block skeleton h-7 w-16 rounded" />
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.iconBg} ring-1 ring-black/5 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-ruby-50 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-ruby-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {data?.recentActivity?.length || 0} events
          </span>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <div className="skeleton w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-48 rounded" />
                  <div className="skeleton h-2.5 w-24 rounded" />
                </div>
              </div>
            ))
          ) : data?.recentActivity?.length ? (
            data.recentActivity.slice(0, 10).map((log, i) => (
              <div key={i} className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                <div className="w-9 h-9 bg-gradient-to-br from-ruby-50 to-ruby-100 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-ruby-200/50">
                  <span className="text-xs font-bold text-ruby-700">
                    {log.adminEmail?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{log.adminName || log.adminEmail}</span>{' '}
                    <span className="text-gray-500">{log.action}</span>{' '}
                    <span className="font-medium text-ruby-700">{log.resourceType}</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(log.createdAt)}
                    {log.locationId && (
                      <>
                        <span className="text-gray-300">·</span>
                        <MapPin className="w-3 h-3" />
                        Location scoped
                      </>
                    )}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-16 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Activity className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">No recent activity</p>
              <p className="text-xs text-gray-400">Activity will appear here once the backend is connected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
