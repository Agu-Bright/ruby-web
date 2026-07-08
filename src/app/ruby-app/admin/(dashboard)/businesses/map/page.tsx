'use client';

/**
 * Admin businesses — cluster map view.
 *
 * Sibling to /ruby-app/admin/businesses (the list page). Shows every
 * LIVE (or filtered) business as a colour-coded pin on a Leaflet map,
 * clustered by proximity so a Lagos-density blob doesn't disappear
 * into an opaque circle of pins.
 *
 * Filters propagate from the list page via query string — an admin
 * who filtered to "PENDING_REVIEW businesses in Lagos" and taps "Map
 * view" sees exactly that cohort mapped, no re-filter needed.
 *
 * The map itself is dynamic-imported with `ssr: false` because
 * Leaflet touches `window` on module load.
 */

import { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, StatCard } from '@/components/ui';
import type { Business, BusinessFilterParams, BusinessStatus } from '@/lib/types';

// Dynamic import — Leaflet is client-only.
const BusinessesClusterMap = dynamic(
  () =>
    import('@/components/ui/businesses-cluster-map').then((m) => ({
      default: m.BusinessesClusterMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ruby-500 mx-auto mb-3" />
          <div className="text-sm text-gray-500">Loading map...</div>
        </div>
      </div>
    ),
  },
);

/**
 * The list page's filter/search query string is forwarded to us so an
 * admin can bookmark ?status=LIVE&locationId=... and land on the exact
 * same cohort. We hoist every relevant param into a
 * `BusinessFilterParams` for the list API — this keeps parity with the
 * list page's own useApi call.
 */
function useFiltersFromQuery(): BusinessFilterParams {
  const sp = useSearchParams();
  return useMemo(() => {
    const filters: BusinessFilterParams = { page: 1, limit: 10000 };
    // Copy every simple string / number / boolean param the list page
    // supports. Anything we don't recognise is silently dropped —
    // the API will 400 on a malformed query, but we've never seen it
    // in practice from the list page's own URL sync.
    const stringKeys = [
      'search',
      'status',
      'categoryId',
      'subcategoryId',
      'locationId',
      'ownerId',
      'parentBusinessId',
      'cacStatus',
      'pandagoStatus',
      'branchType',
      'sortBy',
      'sortDir',
    ] as const;
    for (const k of stringKeys) {
      const v = sp.get(k);
      if (v) (filters as any)[k] = v;
    }
    const boolKeys = ['isFeatured', 'isClaimed', 'isVerified'] as const;
    for (const k of boolKeys) {
      const v = sp.get(k);
      if (v === 'true') (filters as any)[k] = true;
      if (v === 'false') (filters as any)[k] = false;
    }
    return filters;
  }, [sp]);
}

/**
 * A single-row filter summary so the admin knows what cohort is on the
 * map without scrolling back to the list page. Renders a soft pill
 * chip for every non-default param.
 */
function ActiveFiltersRow({ filters }: { filters: BusinessFilterParams }) {
  const chips: { label: string; value: string }[] = [];
  const push = (label: string, value?: string | number | boolean | null) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    chips.push({ label, value: String(value) });
  };
  push('Status', filters.status);
  push('Search', filters.search);
  push('Category', filters.categoryId);
  push('Subcategory', filters.subcategoryId);
  push('Location', filters.locationId);
  push('Owner', filters.ownerId);
  push('Parent', filters.parentBusinessId);
  push('CAC', filters.cacStatus);
  push('Featured', filters.isFeatured);
  push('Claimed', filters.isClaimed);
  push('Verified', filters.isVerified);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        Filters
      </span>
      {chips.map((c) => (
        <span
          key={`${c.label}-${c.value}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200"
        >
          <strong>{c.label}:</strong> {c.value}
        </span>
      ))}
    </div>
  );
}

export default function BusinessesMapPage() {
  const router = useRouter();
  const filters = useFiltersFromQuery();

  // Same API as the list page but at a much larger limit so we plot
  // the whole cohort at once. Cursor pagination is unnecessary for
  // this view; even at 10k rows Leaflet + the marker-cluster plugin
  // renders comfortably under 200ms on a mid-tier laptop.
  const { data: businesses, meta, isLoading, error, refetch } = useApi<Business[]>(
    () => api.businesses.list(filters),
    [JSON.stringify(filters)],
  );

  const list = businesses || [];
  // Split for the health card so the admin sees at-a-glance how many
  // businesses are missing geoPoint (i.e. can't be plotted) vs how
  // many are actually on the map.
  const plottable = useMemo(
    () =>
      list.filter((b) => {
        const c = b.geoPoint?.coordinates;
        return (
          Array.isArray(c) &&
          c.length === 2 &&
          typeof c[0] === 'number' &&
          typeof c[1] === 'number'
        );
      }),
    [list],
  );
  const missingGeo = list.length - plottable.length;

  // Count by status so the admin can see the mix at a glance.
  const statusCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const b of plottable) {
      const s = b.status || 'DRAFT';
      acc[s] = (acc[s] || 0) + 1;
    }
    return acc;
  }, [plottable]);

  // Marker-tap → route back to the list page with ?openId= so the
  // existing detail modal opens. Preserves the current filters so the
  // admin's back button lands them in the same list-view context.
  const handleSelectBusiness = useCallback(
    (b: Business) => {
      const sp = new URLSearchParams();
      sp.set('openId', b._id);
      // Forward filters so the list view is exactly what the admin left.
      for (const [k, v] of Object.entries(filters)) {
        if (v === undefined || v === null || v === '' || k === 'page' || k === 'limit') {
          continue;
        }
        sp.set(k, String(v));
      }
      router.push(`/ruby-app/admin/businesses?${sp.toString()}`);
    },
    [router, filters],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Businesses — Map View"
        description={`Cluster map of every business matching the current filters. ${
          isLoading
            ? 'Loading...'
            : `${plottable.length.toLocaleString()} plotted${
                missingGeo > 0 ? `, ${missingGeo.toLocaleString()} missing coordinates` : ''
              }.`
        }`}
        action={
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
              onClick={() => {
                refetch();
                toast.success('Reloading businesses...');
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 transition-colors"
              onClick={() => router.push('/ruby-app/admin/businesses')}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to list
            </button>
          </div>
        }
      />

      {/* Filter chips — instantly readable "what cohort am I looking at". */}
      <ActiveFiltersRow filters={filters} />

      {/* Health / mix stats. StatCard renders in card style consistent
          with the rest of the admin dashboard. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="On map" value={plottable.length} icon={MapPin} />
        <StatCard
          title="Missing coords"
          value={missingGeo}
          icon={AlertTriangle}
          className={missingGeo > 0 ? 'border-l-4 border-l-amber-500' : ''}
        />
        <StatCard title="Live" value={statusCounts.LIVE ?? 0} icon={MapPin} />
        <StatCard title="Approved" value={statusCounts.APPROVED ?? 0} icon={MapPin} />
        <StatCard
          title="Pending review"
          value={statusCounts.PENDING_REVIEW ?? 0}
          icon={MapPin}
        />
        <StatCard title="Suspended" value={statusCounts.SUSPENDED ?? 0} icon={MapPin} />
      </div>

      {/* Status legend so admin knows what colours mean. Keep in sync
          with STATUS_COLOURS in businesses-cluster-map.tsx. */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-4 text-[12px] text-gray-600">
          <span className="font-semibold text-gray-500 uppercase tracking-wider text-[11px]">
            Legend
          </span>
          {(
            [
              ['LIVE', '#10B981'],
              ['APPROVED', '#3B82F6'],
              ['PENDING_REVIEW', '#F59E0B'],
              ['DRAFT', '#6B7280'],
              ['REJECTED', '#EF4444'],
              ['SUSPENDED', '#B91C1C'],
            ] as [BusinessStatus, string][]
          ).map(([label, colour]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full border-2 border-white shadow"
                style={{ background: colour }}
              />
              {label.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* The map. Full-viewport height minus the header + stats. */}
      <div
        className="card p-0 overflow-hidden"
        style={{ height: 'calc(100vh - 320px)', minHeight: 420 }}
      >
        {error ? (
          <div className="h-full w-full flex items-center justify-center bg-red-50">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <div className="text-sm text-red-700 font-medium">
                Failed to load businesses
              </div>
              <button
                className="mt-2 px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 rounded-md hover:bg-red-100"
                onClick={() => refetch()}
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <BusinessesClusterMap
            businesses={plottable}
            onSelectBusiness={handleSelectBusiness}
            height="100%"
          />
        )}
      </div>

      {/* Big "n items matched but couldn't be plotted" warning — nudges
          the admin toward a data-quality fix (P140-E1). */}
      {missingGeo > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>{missingGeo.toLocaleString()}</strong> businesses matched your
            filters but have no coordinates on file and could not be plotted. Fix
            their `geoPoint` from the list detail modal (Location section) or run
            the geocoding backfill script.
          </div>
        </div>
      )}
    </div>
  );
}
