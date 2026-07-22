'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Store, ShoppingCart, CalendarCheck, AlertTriangle,
  Wallet, MapPin, Clock, TrendingUp, TrendingDown, Activity,
  Users, Gem, ArrowUpRight, Zap, Signal,
  ChevronRight, Radio, Sparkles, Crown, Bell,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { formatCurrency, formatRelativeTime, toLocationId } from '@/lib/utils';
import type {
  DashboardAnalytics, AuditLog, LivePulseData,
  CategoryRanking, LocationPerformance,
} from '@/lib/types';

/**
 * Admin dashboard — futuristic ops control tower.
 *
 * Layers, top → bottom:
 *   1. Hero + live-pulse strip (glowing online counts, breathing dots)
 *   2. Headline KPI ring with delta indicators (24h vs prev 24h)
 *   3. Revenue chart (7d area) + tier distribution donut
 *   4. Secondary KPIs (orders, bookings, users, disputes, payouts, businesses)
 *   5. Top categories bar chart + top locations list
 *   6. Recent activity feed
 *
 * Everything renders skeletons on first paint so the shell never flashes
 * empty. Charts are hand-rolled SVGs (no external chart library) so the
 * bundle stays small and the theme is 100% consistent with the platform.
 */
export default function DashboardPage() {
  const { admin, isSuperAdmin } = useAuth();

  const locationId = !isSuperAdmin && admin?.locationIds?.[0]
    ? toLocationId(admin.locationIds[0])
    : undefined;

  const { data: summary, isLoading: summaryLoading, error } = useApi<DashboardAnalytics>(
    () => api.analytics.dashboard({ locationId }),
    [locationId],
  );

  const { data: pulse, isLoading: pulseLoading } = useApi<LivePulseData>(
    () => api.analytics.live({ locationId }),
    [locationId],
  );

  const { data: topCategories, isLoading: catsLoading } = useApi<CategoryRanking[]>(
    () => api.analytics.topCategories({ locationId, limit: 6 }),
    [locationId],
  );

  const { data: locationPerf, isLoading: locsLoading } = useApi<LocationPerformance[]>(
    () => (isSuperAdmin ? api.analytics.locations({}) : Promise.resolve({ success: true, data: [] })),
    [isSuperAdmin],
  );

  const { data: recentLogs, isLoading: logsLoading } = useApi<AuditLog[]>(
    () => api.auditLogs.list({ limit: 8, page: 1 }),
    [],
  );

  const totalRevenue = (summary?.orderRevenue ?? 0) + (summary?.bookingRevenue ?? 0);

  return (
    <div className="space-y-6">
      {/* ═══ Hero + Live Pulse Strip ═══ */}
      <HeroLivePulse
        firstName={admin?.firstName || 'Admin'}
        isSuperAdmin={isSuperAdmin}
        locationCount={admin?.locationIds?.length || 0}
        pulse={pulse ?? undefined}
        loading={pulseLoading}
      />

      {/* Error banner */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <strong>Dashboard error:</strong> {error}
        </div>
      )}

      {/* ═══ Headline KPI Ring (with deltas) ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HeadlineKpi
          title="Revenue (this week)"
          value={formatCurrency(pulse?.revenue.thisWeek ?? 0)}
          deltaPct={pulse?.revenue.deltaPct}
          icon={Wallet}
          tint="emerald"
          loading={pulseLoading}
          href="/ruby-app/admin/finance"
        />
        <HeadlineKpi
          title="Orders (24h)"
          value={pulse?.counts24h.orders ?? 0}
          deltaPct={pulse?.counts24h.ordersDeltaPct}
          icon={ShoppingCart}
          tint="blue"
          loading={pulseLoading}
          href="/ruby-app/admin/orders"
        />
        <HeadlineKpi
          title="Bookings (24h)"
          value={pulse?.counts24h.bookings ?? 0}
          deltaPct={pulse?.counts24h.bookingsDeltaPct}
          icon={CalendarCheck}
          tint="teal"
          loading={pulseLoading}
          href="/ruby-app/admin/bookings"
        />
        <HeadlineKpi
          title="Signups (24h)"
          value={pulse?.counts24h.signups ?? 0}
          deltaPct={pulse?.counts24h.signupsDeltaPct}
          icon={Users}
          tint="indigo"
          loading={pulseLoading}
          href="/ruby-app/admin/customers"
        />
      </div>

      {/* ═══ Revenue chart + Tier distribution ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <RevenueChartCard
            series={pulse?.revenue7dSeries}
            thisWeek={pulse?.revenue.thisWeek ?? 0}
            deltaPct={pulse?.revenue.deltaPct}
            loading={pulseLoading}
          />
        </div>
        <TierDistributionCard
          distribution={pulse?.businessTierDistribution}
          loading={pulseLoading}
        />
      </div>

      {/* ═══ Secondary KPIs (compact grid) ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStat
          label="Businesses"
          value={summary?.totalBusinesses ?? 0}
          sub={`${summary?.liveBusinesses ?? 0} live`}
          icon={Store}
          tint="ruby"
          loading={summaryLoading}
        />
        <MiniStat
          label="Pending"
          value={summary?.pendingBusinesses ?? 0}
          sub="approval"
          icon={Clock}
          tint="amber"
          loading={summaryLoading}
        />
        <MiniStat
          label="Users"
          value={summary?.totalUsers ?? 0}
          sub={`+${summary?.newUsers ?? 0} (30d)`}
          icon={Users}
          tint="indigo"
          loading={summaryLoading}
        />
        <MiniStat
          label="Total revenue"
          value={formatCurrency(totalRevenue)}
          sub={summary?.currency || 'NGN'}
          icon={TrendingUp}
          tint="emerald"
          loading={summaryLoading}
        />
        <MiniStat
          label="Open disputes"
          value={summary?.openDisputes ?? 0}
          sub={`${summary?.totalDisputes ?? 0} total`}
          icon={AlertTriangle}
          tint="orange"
          loading={summaryLoading}
        />
        <MiniStat
          label="Payouts"
          value={summary?.totalPayouts ?? 0}
          sub={formatCurrency(summary?.payoutAmount ?? 0)}
          icon={Wallet}
          tint="violet"
          loading={summaryLoading}
        />
      </div>

      {/* ═══ Top categories + top locations ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopCategoriesCard categories={topCategories ?? []} loading={catsLoading} />
        {isSuperAdmin ? (
          <TopLocationsCard locations={locationPerf ?? []} loading={locsLoading} />
        ) : (
          <RecentActivityCard logs={recentLogs ?? []} loading={logsLoading} />
        )}
      </div>

      {/* Recent activity — full width when super_admin (already showed
          locations above); location admins get it in the pair above. */}
      {isSuperAdmin && (
        <RecentActivityCard logs={recentLogs ?? []} loading={logsLoading} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Hero + Live Pulse Strip
// ═══════════════════════════════════════════════════════════════

function HeroLivePulse({
  firstName,
  isSuperAdmin,
  locationCount,
  pulse,
  loading,
}: {
  firstName: string;
  isSuperAdmin: boolean;
  locationCount: number;
  pulse?: LivePulseData;
  loading: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, #1a0e10 0%, #4a1112 40%, #B71C1C 75%, #FD362F 100%)',
      }}
    >
      {/* Pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      {/* Corner glow */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-ruby-300/10 rounded-full blur-2xl pointer-events-none" />
      {/* Diamond decoration */}
      <div
        className="absolute right-6 top-1/2 -translate-y-1/2 w-32 h-32 bg-contain bg-no-repeat bg-center opacity-[0.06] pointer-events-none"
        style={{ backgroundImage: 'url(/images/diamond2.png)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 p-6 sm:p-8">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gem className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-[11px] font-bold uppercase tracking-[0.15em]">
                {isSuperAdmin ? 'Global Ops' : 'Location Admin'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Welcome back, {firstName}
            </h1>
            <p className="text-white/50 text-sm mt-1 max-w-lg">
              {isSuperAdmin
                ? 'Real-time overview of the Ruby+ platform.'
                : `Managing ${locationCount} location${locationCount !== 1 ? 's' : ''}.`}
            </p>
          </div>
          <LiveClock />
        </div>

        {/* Live pulse strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PulseCell
            label="Customers online"
            value={pulse?.onlineUsers ?? 0}
            icon={Signal}
            live
            loading={loading}
          />
          <PulseCell
            label="Businesses online"
            value={pulse?.onlineBusinessOwners ?? 0}
            icon={Store}
            live
            loading={loading}
          />
          <PulseCell
            label="Active 24h"
            value={pulse?.activeUsers24h ?? 0}
            icon={Activity}
            loading={loading}
          />
          <PulseCell
            label="Window"
            value={`${pulse?.windowMinutes ?? 15}m`}
            icon={Zap}
            loading={loading}
            small
          />
        </div>
      </div>
    </div>
  );
}

function PulseCell({
  label, value, icon: Icon, live, loading, small,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  live?: boolean;
  loading?: boolean;
  small?: boolean;
}) {
  return (
    <div className="relative rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/10 px-4 py-3 hover:bg-white/[0.09] transition-colors group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 text-white/40" />
      </div>
      <div className="flex items-baseline gap-2">
        {loading ? (
          <span className="inline-block h-6 w-14 bg-white/10 animate-pulse rounded" />
        ) : (
          <span className={`font-bold text-white ${small ? 'text-lg' : 'text-2xl'}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        )}
        {live && !loading && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-semibold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            LIVE
          </span>
        )}
      </div>
    </div>
  );
}

function LiveClock() {
  // Simple hand-rolled clock strip — no external tick loop needed for the
  // dashboard; the ISO date is enough to signal "this is a live view".
  const now = useMemo(() => new Date(), []);
  const date = now.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/10">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      <span className="text-white/80 text-xs font-semibold">System Online</span>
      <span className="text-white/40 text-xs">&middot;</span>
      <span className="text-white/60 text-xs">{date}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Headline KPI Card
// ═══════════════════════════════════════════════════════════════

const TINT: Record<string, { bg: string; ring: string; text: string; accent: string }> = {
  emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-100', text: 'text-emerald-700', accent: 'from-emerald-400/40' },
  blue:    { bg: 'bg-blue-50',    ring: 'ring-blue-100',    text: 'text-blue-700',    accent: 'from-blue-400/40' },
  teal:    { bg: 'bg-teal-50',    ring: 'ring-teal-100',    text: 'text-teal-700',    accent: 'from-teal-400/40' },
  indigo:  { bg: 'bg-indigo-50',  ring: 'ring-indigo-100',  text: 'text-indigo-700',  accent: 'from-indigo-400/40' },
  ruby:    { bg: 'bg-ruby-50',    ring: 'ring-ruby-100',    text: 'text-ruby-700',    accent: 'from-ruby-400/40' },
  amber:   { bg: 'bg-amber-50',   ring: 'ring-amber-100',   text: 'text-amber-700',   accent: 'from-amber-400/40' },
  orange:  { bg: 'bg-orange-50',  ring: 'ring-orange-100',  text: 'text-orange-700',  accent: 'from-orange-400/40' },
  violet:  { bg: 'bg-violet-50',  ring: 'ring-violet-100',  text: 'text-violet-700',  accent: 'from-violet-400/40' },
};

function HeadlineKpi({
  title, value, deltaPct, icon: Icon, tint, loading, href,
}: {
  title: string;
  value: number | string;
  deltaPct?: number;
  icon: React.ElementType;
  tint: keyof typeof TINT;
  loading: boolean;
  href?: string;
}) {
  const t = TINT[tint];
  const positive = (deltaPct ?? 0) >= 0;
  const Body = (
    <div className="relative card p-5 h-full group hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Accent stripe */}
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${t.accent} to-transparent`} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {title}
        </p>
        <div className={`p-2 rounded-xl ${t.bg} ring-1 ${t.ring} group-hover:scale-110 transition-transform`}>
          <Icon className={`w-4 h-4 ${t.text}`} />
        </div>
      </div>
      {loading ? (
        <div className="skeleton h-8 w-24 rounded" />
      ) : (
        <p className="text-2xl sm:text-[26px] font-bold text-gray-900 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
      {!loading && deltaPct !== undefined && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${
            positive ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{positive ? '+' : ''}{deltaPct.toFixed(1)}%</span>
          </div>
          <span className="text-[11px] text-gray-400">vs prev period</span>
        </div>
      )}
      {href && (
        <ArrowUpRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 transition-colors" />
      )}
    </div>
  );
  return href ? <Link href={href}>{Body}</Link> : Body;
}

// ═══════════════════════════════════════════════════════════════
// Revenue Chart (SVG area)
// ═══════════════════════════════════════════════════════════════

function RevenueChartCard({
  series, thisWeek, deltaPct, loading,
}: {
  series?: Array<{ date: string; value: number }>;
  thisWeek: number;
  deltaPct?: number;
  loading: boolean;
}) {
  const positive = (deltaPct ?? 0) >= 0;
  return (
    <div className="card p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">Revenue (last 7 days)</h3>
          </div>
          {loading ? (
            <div className="skeleton h-8 w-40 rounded mt-3" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-3 tabular-nums">
              {formatCurrency(thisWeek)}
            </p>
          )}
          {!loading && deltaPct !== undefined && (
            <div className="mt-1 flex items-center gap-1.5">
              <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${
                positive ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{positive ? '+' : ''}{deltaPct.toFixed(1)}%</span>
              </div>
              <span className="text-[11px] text-gray-400">vs previous week</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2">
        {loading || !series ? (
          <div className="skeleton h-40 w-full rounded" />
        ) : (
          <RevenueAreaChart series={series} />
        )}
      </div>
    </div>
  );
}

function RevenueAreaChart({ series }: { series: Array<{ date: string; value: number }> }) {
  const width = 700;
  const height = 180;
  const padding = { top: 10, right: 8, bottom: 22, left: 8 };
  const values = series.map((p) => p.value);
  const max = Math.max(...values, 1);
  const step = (width - padding.left - padding.right) / Math.max(series.length - 1, 1);

  const points = series.map((p, i) => {
    const x = padding.left + i * step;
    const y = padding.top + (height - padding.top - padding.bottom) * (1 - p.value / max);
    return { x, y, ...p };
  });

  const path = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    // Simple smooth curve using quadratic control point midway between points
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} Q ${cx} ${prev.y}, ${(cx + p.x) / 2} ${(prev.y + p.y) / 2} T ${p.x} ${p.y}`;
  }, '');
  const areaPath = `${path} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  const labels = series.map((p) =>
    new Date(p.date).toLocaleDateString('en-GB', { weekday: 'short' }),
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="revLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#FD362F" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={r}
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + (height - padding.top - padding.bottom) * r}
          y2={padding.top + (height - padding.top - padding.bottom) * r}
          stroke="#F3F4F6"
          strokeDasharray="2 3"
        />
      ))}
      <path d={areaPath} fill="url(#revArea)" />
      <path d={path} fill="none" stroke="url(#revLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" />
      ))}
      {/* Labels */}
      {points.map((p, i) => (
        <text
          key={`l-${i}`}
          x={p.x}
          y={height - 4}
          textAnchor="middle"
          fontSize="10"
          fill="#9CA3AF"
          fontFamily="ui-sans-serif, system-ui"
        >
          {labels[i]}
        </text>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tier Distribution (donut)
// ═══════════════════════════════════════════════════════════════

function TierDistributionCard({
  distribution, loading,
}: {
  distribution?: LivePulseData['businessTierDistribution'];
  loading: boolean;
}) {
  const d = distribution || { prime: 0, growth: 0, starter: 0, none: 0 };
  const total = d.prime + d.growth + d.starter + d.none;

  const segments = [
    { label: 'Prime',   value: d.prime,   color: '#7C3AED', icon: Crown },
    { label: 'Growth',  value: d.growth,  color: '#0EA5E9', icon: TrendingUp },
    { label: 'Starter', value: d.starter, color: '#10B981', icon: Sparkles },
    { label: 'Free',    value: d.none,    color: '#E5E7EB', icon: Store },
  ];

  return (
    <div className="card p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
          <Crown className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">Business tier mix</h3>
      </div>
      {loading ? (
        <div className="skeleton h-40 w-full rounded" />
      ) : (
        <div className="flex items-center gap-5">
          <Donut segments={segments} total={total} />
          <div className="flex-1 space-y-2 min-w-0">
            {segments.map((s) => {
              const pct = total ? Math.round((s.value / total) * 100) : 0;
              return (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="flex-1 text-gray-700 font-medium">{s.label}</span>
                  <span className="tabular-nums text-gray-500">{s.value}</span>
                  <span className="tabular-nums text-gray-400 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Donut({
  segments, total,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  total: number;
}) {
  const size = 130;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
      {total > 0 && segments.map((s, i) => {
        const frac = s.value / total;
        const dash = frac * c;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return el;
      })}
      <text
        x={size / 2} y={size / 2 - 4}
        textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827"
        fontFamily="ui-sans-serif, system-ui"
      >
        {total}
      </text>
      <text
        x={size / 2} y={size / 2 + 14}
        textAnchor="middle" fontSize="9" fill="#9CA3AF"
        fontFamily="ui-sans-serif, system-ui"
        style={{ letterSpacing: '0.1em' }}
      >
        BUSINESSES
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// Mini stat card (secondary KPI row)
// ═══════════════════════════════════════════════════════════════

function MiniStat({
  label, value, sub, icon: Icon, tint, loading,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  tint: keyof typeof TINT;
  loading: boolean;
}) {
  const t = TINT[tint];
  return (
    <div className="card p-3.5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-md ${t.bg} flex items-center justify-center`}>
          <Icon className={`w-3 h-3 ${t.text}`} />
        </div>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      {loading ? (
        <div className="skeleton h-5 w-16 rounded" />
      ) : (
        <p className="text-lg font-bold text-gray-900 tabular-nums truncate">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
      {sub && !loading && (
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{sub}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Top Categories bar chart
// ═══════════════════════════════════════════════════════════════

function TopCategoriesCard({
  categories, loading,
}: {
  categories: CategoryRanking[];
  loading: boolean;
}) {
  const max = Math.max(...categories.map((c) => c.score || c.orders + c.bookings || 1), 1);
  return (
    <div className="card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ruby-50 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-ruby-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Top categories by engagement</h3>
        </div>
        <Link href="/ruby-app/admin/taxonomy" className="text-[11px] text-gray-400 hover:text-ruby-600 flex items-center gap-0.5">
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-full rounded" />
          ))}
        </div>
      ) : categories.length ? (
        <div className="space-y-2.5">
          {categories.map((c, i) => {
            const val = c.score || c.orders + c.bookings || 0;
            const pct = (val / max) * 100;
            return (
              <div key={c.categoryId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 w-4">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    {c.categoryName}
                  </span>
                  <span className="text-xs text-gray-500 tabular-nums">
                    {formatCurrency(c.revenue || 0)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-ruby-500 to-ruby-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyBlock icon={Radio} label="No category data yet" />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Top Locations
// ═══════════════════════════════════════════════════════════════

function TopLocationsCard({
  locations, loading,
}: {
  locations: LocationPerformance[];
  loading: boolean;
}) {
  const sorted = [...(locations || [])]
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 6);
  const max = Math.max(...sorted.map((l) => l.revenue || 0), 1);
  return (
    <div className="card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Top cities by revenue</h3>
        </div>
        <Link href="/ruby-app/admin/locations" className="text-[11px] text-gray-400 hover:text-ruby-600 flex items-center gap-0.5">
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-full rounded" />
          ))}
        </div>
      ) : sorted.length ? (
        <div className="space-y-2.5">
          {sorted.map((l, i) => {
            const pct = ((l.revenue || 0) / max) * 100;
            return (
              <div key={l.locationId || i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 w-4">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    {l.locationName}
                  </span>
                  <span className="text-xs text-gray-500 tabular-nums">
                    {formatCurrency(l.revenue || 0)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                  <span>{l.orders || 0} orders</span>
                  <span>&middot;</span>
                  <span>{l.bookings || 0} bookings</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyBlock icon={MapPin} label="No location performance data yet" />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Recent Activity
// ═══════════════════════════════════════════════════════════════

function RecentActivityCard({
  logs, loading,
}: {
  logs: AuditLog[];
  loading: boolean;
}) {
  return (
    <div className="card overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-ruby-50 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-ruby-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Recent activity</h3>
        </div>
        <Link href="/ruby-app/admin/audit-logs" className="text-[11px] text-gray-400 hover:text-ruby-600 flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-3">
              <div className="skeleton w-9 h-9 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-48 rounded" />
                <div className="skeleton h-2.5 w-24 rounded" />
              </div>
            </div>
          ))
        ) : logs?.length ? (
          logs.slice(0, 8).map((log, i) => (
            <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
              <div className="w-8 h-8 bg-gradient-to-br from-ruby-50 to-ruby-100 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-ruby-200/50">
                <span className="text-[11px] font-bold text-ruby-700">
                  {log.adminEmail?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  <span className="font-semibold">{log.adminName || log.adminEmail}</span>{' '}
                  <span className="text-gray-500">{log.action}</span>{' '}
                  <span className="font-medium text-ruby-700">{log.resourceType}</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(log.createdAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Bell className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">No recent activity</p>
            <p className="text-xs text-gray-400">Activity will appear here as admins work.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyBlock({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="py-8 text-center">
      <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
        <Icon className="w-5 h-5 text-gray-300" />
      </div>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

