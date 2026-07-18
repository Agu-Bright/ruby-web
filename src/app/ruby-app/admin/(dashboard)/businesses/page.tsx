'use client';

import { useState, useCallback, useRef, useEffect, Fragment } from 'react';
// Phase 44 — read query params for the cross-page deep-link from the
// admin customers page: `?openId=X` auto-opens the detail modal on the
// matching business; `?ownerId=X` pre-fills the owner filter so the
// list shows only that user's businesses.
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Store, Search, CheckCircle, XCircle, Ban, Eye, MapPin, Clock,
  Phone, Mail, Globe, Star, ShieldCheck, ShieldX, RotateCcw, RefreshCw,
  FileText, ExternalLink, AlertTriangle, MoreHorizontal, ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Trash2,
  Plus, Minus, Copy, Loader2, Package, Wrench, Edit2, Archive, Power, Image as ImageIcon, GitBranch,
  Wallet as WalletIcon, AlertCircle, X as XIcon, ArrowDownLeft, ArrowUpRight, DollarSign,
  // P119 — sort indicators on clickable column headers.
  ArrowUp, ArrowDown, ArrowUpDown,
  // P140 — Excel export button in the page header.
  Download,
  // P141 — Map view button + icon.
  Map as MapIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, StatusBadge, Modal, StatCard, ImageUpload } from '@/components/ui';

const MapLocationPicker = dynamic(
  () => import('@/components/ui/map-location-picker').then(mod => ({ default: mod.MapLocationPicker })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[280px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading map...</span>
      </div>
    ),
  }
);
import type {
  Business, BusinessFilterParams, BusinessStatus, BusinessStats, VerifyCacRequest,
  BusinessMediaItem, BusinessHoursEntry, BusinessAddress,
  AdminCreateBusinessRequest, Location, Category, Subcategory,
  Product, ProductStatus, UpdateProductRequest,
  ServiceListing, ServiceStatus, UpdateServiceRequest, PricingType, ServiceFulfillmentMode,
  // P119 — sort + branch-type unions for the new filter / sort surface.
  BusinessSortKey, BusinessBranchType, CacDocumentStatus,
} from '@/lib/types';
import { formatDate, formatDateTime, formatCurrency, toLocationId, getOwnerName, getOwnerEmail, getCategoryName, getSubcategoryName, getLocationName } from '@/lib/utils';
import { exportToExcel } from '@/lib/export-to-excel';
import type { Wallet, LedgerEntry } from '@/lib/types';
// P119 — SearchableSelect for the Category / Subcategory / Location row-2
// filters. Single-select capability is enough; lots of options need
// search-as-you-type rather than scrolling a long select.
import { SearchableSelect } from '@/components/ui/searchable-select';

const STATUS_OPTIONS: BusinessStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'LIVE', 'REJECTED', 'SUSPENDED'];

// P119 — admin businesses page sort vocabulary. Keep label order in sync
// with the column-header sort UI (Business / Created) and the "Sort by"
// dropdown (Rating / Reviews / Orders / Branch count). Status is NOT
// sortable — lexicographic sort on the enum (APPROVED / DRAFT / LIVE /
// PENDING_REVIEW / REJECTED / SUSPENDED) doesn't match the natural
// status flow and would mislead admins; status filtering covers it.
type ColumnSortKey = 'name' | 'createdAt';
// P146 — added `isClaimed` so admins can put claimed (or unclaimed)
// merchants at the top of the list. Ascending puts unclaimed
// (isClaimed=false) first, descending puts claimed (isClaimed=true)
// first. Backend BusinessQueryDto has to accept the same key for
// this to actually reorder rows — matched in the backend patch.
type MetricSortKey =
  | 'averageRating'
  | 'totalReviews'
  | 'orderCount'
  | 'branchCount'
  | 'isClaimed';

const COLUMN_SORT_KEYS: readonly ColumnSortKey[] = ['name', 'createdAt'] as const;
const METRIC_SORT_OPTIONS: ReadonlyArray<{
  key: MetricSortKey;
  label: string;
  hint?: string;
}> = [
  { key: 'averageRating', label: 'Rating' },
  { key: 'totalReviews', label: 'Reviews' },
  { key: 'orderCount', label: 'Orders' },
  { key: 'branchCount', label: 'Branch count' },
  {
    key: 'isClaimed',
    label: 'Claim status',
    hint: 'Claimed first (desc) or unclaimed first (asc)',
  },
] as const;

// P119 — vocabulary for the new row-2 dropdowns. Backend mirrors these.
const CAC_STATUS_OPTIONS: CacDocumentStatus[] = ['PENDING', 'VERIFIED', 'REJECTED'];
const PANDAGO_STATUS_OPTIONS = [
  'NOT_REGISTERED',
  'PENDING',
  'ACTIVE',
  'FAILED',
  'STALE',
] as const;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// P148 — added 'set-live' so admins can push an APPROVED business
// straight to LIVE without waiting for the merchant to complete the
// go-live flow. Without this the business is invisible on the customer
// app even though the admin has approved it — the customer discover
// filter is `status: LIVE`.
type ActionType = 'approve' | 'set-live' | 'reject' | 'suspend' | 'reinstate' | 'verify-cac' | 'reject-cac' | 'feature' | 'delete' | 'update-status' | 'edit' | 'verify-deolu' | 'unverify-deolu';

// ─── Action Dropdown Component ───
function ActionDropdown({ business, onAction, onView }: {
  business: Business;
  onAction: (business: Business, action: ActionType) => void;
  onView: (business: Business) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items: { label: string; icon: typeof Eye; action: () => void; variant?: 'default' | 'success' | 'danger' | 'warning' }[] = [
    { label: 'View Details', icon: Eye, action: () => { onView(business); setOpen(false); } },
    { label: 'Edit Business', icon: Edit2, action: () => { onAction(business, 'edit'); setOpen(false); } },
  ];

  if (business.status === 'PENDING_REVIEW') {
    items.push(
      { label: 'Approve', icon: CheckCircle, action: () => { onAction(business, 'approve'); setOpen(false); }, variant: 'success' },
      { label: 'Reject', icon: XCircle, action: () => { onAction(business, 'reject'); setOpen(false); }, variant: 'danger' },
    );
  }
  // P148 — Set Live shortcut for APPROVED businesses. Without this the
  // merchant has to log into the business mobile app and hit "Go Live"
  // themselves — most never learn about the second step, so approved
  // businesses stay invisible on the customer app.
  if (business.status === 'APPROVED') {
    items.push({
      label: 'Set Live',
      icon: CheckCircle,
      action: () => { onAction(business, 'set-live'); setOpen(false); },
      variant: 'success',
    });
  }
  if (business.status === 'APPROVED' || business.status === 'LIVE') {
    items.push({ label: 'Suspend', icon: Ban, action: () => { onAction(business, 'suspend'); setOpen(false); }, variant: 'danger' });
  }
  if (business.status === 'SUSPENDED') {
    items.push({ label: 'Reinstate', icon: RotateCcw, action: () => { onAction(business, 'reinstate'); setOpen(false); }, variant: 'success' });
  }

  // Phase 13.10 — Deolu verification (separate from CAC verification).
  // `isVerified=true` is the gate that lets the AI surface this business
  // in recommendations. Only available for LIVE businesses.
  if (business.status === 'LIVE') {
    if (business.isVerified) {
      items.push({
        label: 'Remove Deolu Verified',
        icon: XCircle,
        action: () => { onAction(business, 'unverify-deolu'); setOpen(false); },
        variant: 'warning',
      });
    } else {
      items.push({
        label: 'Mark Deolu Verified',
        icon: CheckCircle,
        action: () => { onAction(business, 'verify-deolu'); setOpen(false); },
        variant: 'success',
      });
    }
  }

  items.push({
    label: 'Update Status',
    icon: RefreshCw,
    action: () => { onAction(business, 'update-status'); setOpen(false); },
  });

  items.push({
    label: business.isFeatured ? 'Remove Featured' : 'Set Featured',
    icon: Star,
    action: () => { onAction(business, 'feature'); setOpen(false); },
    variant: 'warning',
  });

  items.push({
    label: 'Delete',
    icon: Trash2,
    action: () => { onAction(business, 'delete'); setOpen(false); },
    variant: 'danger',
  });

  const variantColors = {
    default: 'text-gray-700 hover:bg-gray-50',
    success: 'text-emerald-700 hover:bg-emerald-50',
    danger: 'text-red-600 hover:bg-red-50',
    warning: 'text-amber-700 hover:bg-amber-50',
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, left: rect.right - 192 });
          }
          setOpen(!open);
        }}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-gray-500" />
      </button>
      {open && (
        <div
          className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-fade-in"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); item.action(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${variantColors[item.variant || 'default']}`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BusinessesPage() {
  const { admin } = useAuth();
  // Phase 44 — cross-page deep-link support.
  // `?openId=X` → auto-open the detail modal on that business.
  // `?ownerId=X` → pre-fill filters so the list shows only that user's
  //                businesses. Both are set when the admin clicks the
  //                "Business owner" badge / "View business →" in the
  //                customers page.
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const deepLinkOpenId = searchParams?.get('openId') || null;
  const deepLinkOwnerId = searchParams?.get('ownerId') || null;
  // P119 — additional URL deep-links beyond the Phase 44 ?openId / ?ownerId
  // pair. parentBusinessId pins the page to a brand's branches; the rest
  // are filter / sort / pagination state encoded into shareable URLs.
  const deepLinkParentBusinessId = searchParams?.get('parentBusinessId') || null;
  const deepLinkInit = useMemo(() => {
    const qp = searchParams;
    if (!qp) return {} as Partial<BusinessFilterParams>;
    const init: any = {};
    const status = qp.get('status'); if (status) init.status = status;
    const categoryId = qp.get('categoryId'); if (categoryId) init.categoryId = categoryId;
    const subcategoryId = qp.get('subcategoryId'); if (subcategoryId) init.subcategoryId = subcategoryId;
    const locationId = qp.get('locationId'); if (locationId) init.locationId = locationId;
    const cacStatus = qp.get('cacStatus'); if (cacStatus) init.cacStatus = cacStatus;
    const pandagoStatus = qp.get('pandagoStatus'); if (pandagoStatus) init.pandagoStatus = pandagoStatus;
    const isClaimed = qp.get('isClaimed'); if (isClaimed !== null && isClaimed !== '') init.isClaimed = isClaimed === 'true';
    const isFeatured = qp.get('isFeatured'); if (isFeatured !== null && isFeatured !== '') init.isFeatured = isFeatured === 'true';
    const isVerified = qp.get('isVerified'); if (isVerified !== null && isVerified !== '') init.isVerified = isVerified === 'true';
    const branchType = qp.get('branchType'); if (branchType) init.branchType = branchType;
    const createdFrom = qp.get('createdFrom'); if (createdFrom) init.createdFrom = createdFrom;
    const createdTo = qp.get('createdTo'); if (createdTo) init.createdTo = createdTo;
    const sortBy = qp.get('sortBy'); if (sortBy) init.sortBy = sortBy;
    const sortOrder = qp.get('sortOrder'); if (sortOrder === 'asc' || sortOrder === 'desc') init.sortOrder = sortOrder;
    const pageStr = qp.get('page'); if (pageStr) init.page = Math.max(1, parseInt(pageStr, 10) || 1);
    const searchStr = qp.get('search'); if (searchStr) init.search = searchStr;
    return init as Partial<BusinessFilterParams>;
    // We intentionally only hydrate from URL ONCE on mount. After that
    // user interactions own the state and write back to URL via the
    // sync effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Guard so we only auto-open once per URL state — without this, the
  // detail modal would re-open every render when the user closes it.
  const consumedOpenIdRef = useRef<string | null>(null);

  const [filters, setFilters] = useState<BusinessFilterParams>({
    page: 1,
    limit: 20,
    ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1 ? { locationId: toLocationId(admin.locationIds[0]) } : {}),
    // Phase 44 — apply the URL filter at mount.
    ...(deepLinkOwnerId ? { ownerId: deepLinkOwnerId } : {}),
    // P119 — hydrate every filter / sort / page from URL on first paint
    // so shareable filtered links restore state exactly. The deep-link
    // parentBusinessId is applied below so its companion branchType
    // override doesn't fight with whatever's already in URL.
    ...deepLinkInit,
    ...(deepLinkParentBusinessId
      ? { parentBusinessId: deepLinkParentBusinessId, branchType: 'branches' as BusinessBranchType }
      : {}),
  });
  const [search, setSearch] = useState((deepLinkInit as any).search || '');
  // P119 — branchType moves from a separate client-side state to the
  // central filters object (server-side now). Local state alias kept
  // as a getter so existing JSX reads cleanly. Setter writes via the
  // filter setter below.
  const branchTypeFilter: BusinessBranchType = (filters.branchType ?? 'all') as BusinessBranchType;
  const setBranchTypeFilter = useCallback(
    (next: BusinessBranchType) =>
      setFilters((f) => ({
        ...f,
        branchType: next === 'all' ? undefined : next,
        // Switching the dropdown clears any deep-linked parentBusinessId
        // pill — the user is choosing a different slice intentionally.
        parentBusinessId:
          next === 'branches' ? f.parentBusinessId : undefined,
        page: 1,
      })),
    [],
  );
  const [detailBusiness, setDetailBusiness] = useState<Business | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'media' | 'cac' | 'hours' | 'catalog' | 'branches' | 'wallet'>('info');
  const [showFundBusinessModal, setShowFundBusinessModal] = useState(false);
  const [showDebitBusinessModal, setShowDebitBusinessModal] = useState(false);
  // Bumping this forces BusinessWalletTab to refetch wallet + transactions.
  // Used after a successful fund-wallet operation so the new balance shows up.
  const [walletRefreshTick, setWalletRefreshTick] = useState(0);
  const [actionModal, setActionModal] = useState<{ business: Business; action: ActionType } | null>(null);

  // Catalog tab state
  const [catalogSubTab, setCatalogSubTab] = useState<'products' | 'services'>('products');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState('');
  const [catalogItemModal, setCatalogItemModal] = useState<{ type: 'product' | 'service'; item: Product | ServiceListing } | null>(null);
  const [catalogEditModal, setCatalogEditModal] = useState<{ type: 'product' | 'service'; item: Product | ServiceListing } | null>(null);
  const [catalogConfirmModal, setCatalogConfirmModal] = useState<{ type: 'product' | 'service'; action: 'delete' | 'suspend' | 'activate' | 'archive'; item: Product | ServiceListing } | null>(null);
  const [reason, setReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<BusinessStatus>('PENDING_REVIEW');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Edit Business modal — opened from the row's action menu. Lives outside
  // the generic actionModal flow because it has its own form state + steps,
  // not a confirm-then-execute dialog.
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  // Pandago — manual register + bulk backfill
  // pandagoRegistering = current businessId being registered (loading state).
  // backfillResult = preview/result of the most recent backfill call.
  const [pandagoRegistering, setPandagoRegistering] = useState<string | null>(null);
  const [pandagoBackfillResult, setPandagoBackfillResult] = useState<{
    scanned: number;
    registered: number;
    failed: number;
    skipped: number;
    errors: { businessId: string; error: string }[];
  } | null>(null);
  const [pandagoBackfillLoading, setPandagoBackfillLoading] = useState(false);
  const [pandagoBackfillModalOpen, setPandagoBackfillModalOpen] = useState(false);

  // Hierarchical branch tree state
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [branchCache, setBranchCache] = useState<Record<string, { data: Business[]; loading: boolean }>>({});

  // Phase 44 — auto-open the detail modal when arriving here from the
  // customers page with a ?openId= query param. Fetches the business
  // directly (don't wait for the list query — the openId might point to
  // a business outside the current page / filter scope) and seeds the
  // modal state. Strips the param from the URL afterwards so refreshing
  // the page doesn't keep re-opening.
  useEffect(() => {
    if (!deepLinkOpenId) return;
    if (consumedOpenIdRef.current === deepLinkOpenId) return;
    consumedOpenIdRef.current = deepLinkOpenId;
    (async () => {
      try {
        const res = await api.businesses.get(deepLinkOpenId);
        if (res?.data) {
          setDetailBusiness(res.data as Business);
          setDetailTab('info');
        } else {
          toast.error('Business not found');
        }
      } catch {
        toast.error('Could not load business');
      } finally {
        // Remove the openId param so refresh doesn't re-trigger. Keep
        // ownerId (filter) if present.
        const remainingParams = new URLSearchParams(searchParams?.toString() || '');
        remainingParams.delete('openId');
        const next = remainingParams.toString();
        router.replace(next ? `${pathname}?${next}` : pathname || '/ruby-app/admin/businesses');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkOpenId]);

  // Fetch businesses list
  const { data: businesses, meta, isLoading, refetch } = useApi<Business[]>(
    () => api.businesses.list({ ...filters, search: search || undefined }),
    [filters, search]
  );

  // Fetch stats
  const { data: stats } = useApi<BusinessStats>(
    () => api.businesses.stats(
      admin?.scope === 'LOCATION' && admin.locationIds.length === 1
        ? { locationId: toLocationId(admin.locationIds[0]) }
        : undefined
    ),
    []
  );

  // Row-2 filter dropdown sources. Categories + locations load
  // once at mount (small lists, cached). Subcategories load per-selected-
  // category (also small) and clear when the category clears.
  //
  // P146 — dropped the `isActive: true` filter. Seeded categories don't
  // always have an explicit `isActive: true` on the DB doc, so the
  // filter was returning zero rows and the dropdown showed only
  // "All categories". Fetch the full list — admins get a complete
  // picker either way. Same for subcategories.
  const { data: allCategories } = useApi<Category[]>(
    () => api.categories.list(),
    [],
  );
  const { data: allSubcategories } = useApi<Subcategory[]>(
    () =>
      filters.categoryId
        ? api.subcategories.list({ categoryId: filters.categoryId, limit: 500 })
        : Promise.resolve({ success: true, data: [] as Subcategory[] }),
    [filters.categoryId],
    { enabled: !!filters.categoryId },
  );
  // P146 — was `limit: 500`, but the backend `PaginationDto` caps
  // `limit` at 100 and returned a 400 validation error, so the
  // dropdown stayed empty. Use 100 (the enforced max) — plenty for
  // Nigeria's city list. If we ever exceed that, we'd want a
  // dedicated `/admin/locations/all` endpoint anyway.
  const { data: allLocations } = useApi<Location[]>(
    () => api.locations.list({ limit: 100 } as any),
    [],
  );

  // P119 — when ?parentBusinessId=X is in URL, fetch that parent's name
  // so the "Filtered: branches of [Brand Name]" pill renders nicely.
  // One-off fetch; cached per id by useApi's effect deps.
  const { data: parentBrand } = useApi<Business>(
    () =>
      filters.parentBusinessId
        ? api.businesses.get(filters.parentBusinessId)
        : Promise.resolve({ success: true, data: null as unknown as Business }),
    [filters.parentBusinessId],
    { enabled: !!filters.parentBusinessId },
  );

  // P119 — URL sync. Encodes every filter / sort / page / search into the
  // URL so a filtered view is shareable via Slack / email and survives
  // reloads. router.replace (not push) — keeps the back-button useful.
  // Skips defaults so the URL stays readable.
  // First-run skip: state already hydrated from URL via deepLinkInit; the
  // initial render would otherwise immediately re-write the same URL.
  const urlSyncSkipRef = useRef(true);
  useEffect(() => {
    if (urlSyncSkipRef.current) {
      urlSyncSkipRef.current = false;
      return;
    }
    const qp = new URLSearchParams();
    // Preserve ?openId if some other effect is still consuming it.
    const openId = searchParams?.get('openId');
    if (openId) qp.set('openId', openId);
    if (filters.ownerId) qp.set('ownerId', filters.ownerId);
    if (filters.status) qp.set('status', filters.status);
    if (filters.categoryId) qp.set('categoryId', filters.categoryId);
    if (filters.subcategoryId) qp.set('subcategoryId', filters.subcategoryId);
    if (filters.locationId) qp.set('locationId', filters.locationId);
    if (filters.cacStatus) qp.set('cacStatus', filters.cacStatus);
    if (filters.pandagoStatus) qp.set('pandagoStatus', filters.pandagoStatus);
    if (filters.isClaimed !== undefined) qp.set('isClaimed', String(filters.isClaimed));
    if (filters.isFeatured !== undefined) qp.set('isFeatured', String(filters.isFeatured));
    if (filters.isVerified !== undefined) qp.set('isVerified', String(filters.isVerified));
    if (filters.branchType && filters.branchType !== 'all') qp.set('branchType', filters.branchType);
    if (filters.parentBusinessId) qp.set('parentBusinessId', filters.parentBusinessId);
    if (filters.createdFrom) qp.set('createdFrom', filters.createdFrom);
    if (filters.createdTo) qp.set('createdTo', filters.createdTo);
    if (filters.sortBy && filters.sortBy !== 'createdAt') qp.set('sortBy', filters.sortBy);
    if (filters.sortOrder && filters.sortOrder !== 'desc') qp.set('sortOrder', filters.sortOrder);
    if (filters.page && filters.page > 1) qp.set('page', String(filters.page));
    if (search) qp.set('search', search);
    const qs = qp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname || '/ruby-app/admin/businesses');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.ownerId,
    filters.status,
    filters.categoryId,
    filters.subcategoryId,
    filters.locationId,
    filters.cacStatus,
    filters.pandagoStatus,
    filters.isClaimed,
    filters.isFeatured,
    filters.isVerified,
    filters.branchType,
    filters.parentBusinessId,
    filters.createdFrom,
    filters.createdTo,
    filters.sortBy,
    filters.sortOrder,
    filters.page,
    search,
  ]);

  // Mutations
  const showError = useCallback((message: string) => toast.error(message), []);
  const mutationOpts = { onError: showError };
  const { mutate: approveBusiness, isLoading: approving } = useMutation(
    ({ id, data }: { id: string; data?: { notes?: string } }) => api.businesses.approve(id, data), mutationOpts
  );
  // P148 — admin-only shortcut to promote an APPROVED business to LIVE.
  const { mutate: setLiveBusiness, isLoading: settingLive } = useMutation(
    ({ id }: { id: string }) => api.businesses.setLive(id), mutationOpts
  );
  const { mutate: rejectBusiness, isLoading: rejecting } = useMutation(
    ({ id, data }: { id: string; data: { reason: string } }) => api.businesses.reject(id, data), mutationOpts
  );
  const { mutate: suspendBusiness, isLoading: suspending } = useMutation(
    ({ id, data }: { id: string; data: { reason: string } }) => api.businesses.suspend(id, data), mutationOpts
  );
  const { mutate: reinstateBusiness, isLoading: reinstating } = useMutation(
    ({ id }: { id: string }) => api.businesses.reinstate(id), mutationOpts
  );
  const { mutate: verifyCac, isLoading: verifyingCac } = useMutation(
    ({ id, data }: { id: string; data: VerifyCacRequest }) => api.businesses.verifyCac(id, data), mutationOpts
  );
  const { mutate: featureBusiness, isLoading: featuring } = useMutation(
    ({ id, data }: { id: string; data: { isFeatured: boolean; featuredUntil?: string } }) => api.businesses.feature(id, data), mutationOpts
  );
  const { mutate: deleteBusiness, isLoading: deleting } = useMutation(
    ({ id }: { id: string }) => api.businesses.delete(id), mutationOpts
  );
  // Phase 13.10: Deolu Ruby-Verified flip — separate from CAC verification.
  const { mutate: verifyDeolu, isLoading: verifyingDeolu } = useMutation(
    ({ id }: { id: string }) => api.businesses.verify(id), mutationOpts
  );
  const { mutate: unverifyDeolu, isLoading: unverifyingDeolu } = useMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      api.businesses.unverify(id, reason),
    mutationOpts
  );

  const { mutate: createBusiness, isLoading: creating } = useMutation(
    (data: AdminCreateBusinessRequest) => api.businesses.adminCreate(data), mutationOpts
  );
  const { mutate: regenerateClaimCode } = useMutation(
    ({ id }: { id: string }) => api.businesses.regenerateClaimCode(id), mutationOpts
  );

  const isProcessing =
    approving ||
    rejecting ||
    suspending ||
    reinstating ||
    verifyingCac ||
    featuring ||
    deleting ||
    verifyingDeolu ||
    unverifyingDeolu;

  // Hierarchical: toggle parent expand and fetch branches
  const toggleParent = useCallback(async (parentId: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      next.has(parentId) ? next.delete(parentId) : next.add(parentId);
      return next;
    });
    if (!branchCache[parentId]) {
      setBranchCache(prev => ({ ...prev, [parentId]: { data: [], loading: true } }));
      try {
        const res = await api.businesses.getBranches(parentId);
        setBranchCache(prev => ({ ...prev, [parentId]: { data: res.data, loading: false } }));
      } catch {
        setBranchCache(prev => ({ ...prev, [parentId]: { data: [], loading: false } }));
      }
    }
  }, [branchCache]);

  // Filter data for hierarchical display.
  // P119 — branch-type filtering is now server-side, so brands/branches/
  // standalone modes pass through verbatim. The 'all' mode (default) still
  // needs to hide top-level branches so they only appear when a parent
  // row is expanded; the server returns the full mixed list and we hide
  // children at the table level. The parentBusinessId deep-link bypasses
  // this — when set, the server has already narrowed to a brand's
  // children and every returned row IS meant to be top-level.
  const displayData = useMemo(() => {
    if (!businesses) return [];
    if (filters.parentBusinessId) return businesses;
    if (branchTypeFilter === 'all') {
      return businesses.filter((b) => !b.parentBusinessId);
    }
    return businesses;
  }, [businesses, branchTypeFilter, filters.parentBusinessId]);

  // Fetch full detail
  const { data: fullDetail, isLoading: loadingDetail, error: detailError } = useApi<Business>(
    () => detailBusiness ? api.businesses.get(detailBusiness._id) : Promise.resolve({ success: true, data: detailBusiness! }),
    [detailBusiness?._id],
  );

  const displayBusiness = fullDetail || detailBusiness;

  // Catalog data fetching
  const catalogType = displayBusiness?.type === 'SHOPPING' ? 'products' : displayBusiness?.type === 'SERVICE' ? 'services' : 'both';
  const showProducts = detailTab === 'catalog' && (catalogType === 'products' || (catalogType === 'both' && catalogSubTab === 'products'));
  const showServices = detailTab === 'catalog' && (catalogType === 'services' || (catalogType === 'both' && catalogSubTab === 'services'));

  const { data: catalogProducts, isLoading: loadingProducts, refetch: refetchProducts } = useApi<Product[]>(
    () => detailBusiness ? api.products.list({ businessId: detailBusiness._id, limit: 100 }) : Promise.resolve({ success: true, data: [] }),
    [detailBusiness?._id, detailTab],
    { enabled: detailTab === 'catalog' && !!detailBusiness && catalogType !== 'services' }
  );
  const { data: catalogServices, isLoading: loadingServices, refetch: refetchServices } = useApi<ServiceListing[]>(
    () => detailBusiness ? api.services.list({ businessId: detailBusiness._id, limit: 100 }) : Promise.resolve({ success: true, data: [] }),
    [detailBusiness?._id, detailTab],
    { enabled: detailTab === 'catalog' && !!detailBusiness && catalogType !== 'products' }
  );

  const filteredProducts = useMemo(() => {
    let items = catalogProducts ?? [];
    if (catalogSearch) {
      const q = catalogSearch.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
    }
    if (catalogStatusFilter) items = items.filter(p => p.status === catalogStatusFilter);
    return items;
  }, [catalogProducts, catalogSearch, catalogStatusFilter]);

  const filteredServices = useMemo(() => {
    let items = catalogServices ?? [];
    if (catalogSearch) {
      const q = catalogSearch.toLowerCase();
      items = items.filter(s => s.name.toLowerCase().includes(q));
    }
    if (catalogStatusFilter) items = items.filter(s => s.status === catalogStatusFilter);
    return items;
  }, [catalogServices, catalogSearch, catalogStatusFilter]);

  // Catalog mutations
  const refetchCatalog = useCallback(() => {
    refetchProducts(); refetchServices();
  }, [refetchProducts, refetchServices]);
  const catalogMutOpts = { onError: showError };
  const { mutate: deleteProduct, isLoading: deletingProduct } = useMutation(({ id }: { id: string }) => api.products.delete(id), catalogMutOpts);
  const { mutate: suspendProduct, isLoading: suspendingProduct } = useMutation(({ id }: { id: string }) => api.products.suspend(id), catalogMutOpts);
  const { mutate: activateProduct, isLoading: activatingProduct } = useMutation(({ id }: { id: string }) => api.products.activate(id), catalogMutOpts);
  const { mutate: updateProduct, isLoading: updatingProduct } = useMutation(({ id, data }: { id: string; data: UpdateProductRequest }) => api.products.update(id, data), catalogMutOpts);
  const { mutate: deleteService, isLoading: deletingService } = useMutation(({ id }: { id: string }) => api.services.delete(id), catalogMutOpts);
  const { mutate: suspendService, isLoading: suspendingService } = useMutation(({ id }: { id: string }) => api.services.suspend(id), catalogMutOpts);
  const { mutate: activateService, isLoading: activatingService } = useMutation(({ id }: { id: string }) => api.services.activate(id), catalogMutOpts);
  const { mutate: archiveService } = useMutation(({ id }: { id: string }) => api.services.archive(id), catalogMutOpts);
  const { mutate: updateService, isLoading: updatingService } = useMutation(({ id, data }: { id: string; data: UpdateServiceRequest }) => api.services.update(id, data), catalogMutOpts);
  const catalogProcessing = deletingProduct || suspendingProduct || activatingProduct || updatingProduct || deletingService || suspendingService || activatingService || updatingService;

  const handleCatalogConfirm = useCallback(async () => {
    if (!catalogConfirmModal) return;
    const { type, action, item } = catalogConfirmModal;
    const id = item._id;
    let result;
    if (type === 'product') {
      if (action === 'delete') result = await deleteProduct({ id });
      else if (action === 'suspend') result = await suspendProduct({ id });
      else if (action === 'activate') result = await activateProduct({ id });
    } else {
      if (action === 'delete') result = await deleteService({ id });
      else if (action === 'suspend') result = await suspendService({ id });
      else if (action === 'activate') result = await activateService({ id });
      else if (action === 'archive') result = await archiveService({ id });
    }
    if (result !== null) {
      setCatalogConfirmModal(null);
      toast.success(`${type === 'product' ? 'Product' : 'Service'} ${action}d successfully`);
      refetchCatalog();
    }
  }, [catalogConfirmModal, deleteProduct, suspendProduct, activateProduct, deleteService, suspendService, activateService, archiveService, refetchCatalog]);

  const handleAction = useCallback(async () => {
    if (!actionModal) return;
    const { business, action } = actionModal;
    let result;
    let successMsg = '';

    switch (action) {
      case 'approve':
        result = await approveBusiness({ id: business._id, data: reason ? { notes: reason } : undefined });
        successMsg = `"${business.name}" has been approved`;
        break;
      case 'set-live':
        // P148 — admin-only bypass. Sets APPROVED → LIVE without waiting
        // for the merchant to complete their own go-live checklist. The
        // backend service still asserts prev status is APPROVED.
        result = await setLiveBusiness({ id: business._id });
        successMsg = `"${business.name}" is now LIVE on the customer app`;
        break;
      case 'reject':
        if (!reason) { toast.error('Rejection reason is required'); return; }
        result = await rejectBusiness({ id: business._id, data: { reason } });
        successMsg = `"${business.name}" has been rejected`;
        break;
      case 'suspend':
        if (!reason) { toast.error('Suspension reason is required'); return; }
        result = await suspendBusiness({ id: business._id, data: { reason } });
        successMsg = `"${business.name}" has been suspended`;
        break;
      case 'reinstate':
        result = await reinstateBusiness({ id: business._id });
        successMsg = `"${business.name}" has been reinstated`;
        break;
      case 'verify-cac':
        result = await verifyCac({ id: business._id, data: { status: 'VERIFIED' } });
        successMsg = 'CAC document verified';
        break;
      case 'reject-cac':
        if (!reason) { toast.error('Rejection reason is required'); return; }
        result = await verifyCac({ id: business._id, data: { status: 'REJECTED', rejectionReason: reason } });
        successMsg = 'CAC document rejected';
        break;
      case 'feature':
        result = await featureBusiness({ id: business._id, data: { isFeatured: !business.isFeatured } });
        successMsg = business.isFeatured ? 'Business unfeatured' : 'Business featured';
        break;
      case 'delete':
        result = await deleteBusiness({ id: business._id });
        successMsg = `"${business.name}" has been deleted`;
        break;
      case 'verify-deolu':
        result = await verifyDeolu({ id: business._id });
        successMsg = `"${business.name}" is now Ruby Verified — eligible for Deolu recommendations`;
        break;
      case 'unverify-deolu':
        if (!reason) {
          toast.error('Reason is required when removing Ruby Verified status');
          return;
        }
        result = await unverifyDeolu({ id: business._id, reason });
        successMsg = `"${business.name}" is no longer Ruby Verified`;
        break;
      case 'update-status':
        switch (selectedStatus) {
          case 'APPROVED':
            result = await approveBusiness({ id: business._id, data: reason ? { notes: reason } : undefined });
            break;
          case 'REJECTED':
            if (!reason) { toast.error('Reason is required when rejecting'); return; }
            result = await rejectBusiness({ id: business._id, data: { reason } });
            break;
          case 'SUSPENDED':
            if (!reason) { toast.error('Reason is required when suspending'); return; }
            result = await suspendBusiness({ id: business._id, data: { reason } });
            break;
          case 'LIVE':
            result = await reinstateBusiness({ id: business._id });
            break;
          default:
            toast.error(`Cannot transition to ${selectedStatus} from the admin panel`);
            return;
        }
        successMsg = `"${business.name}" status updated to ${selectedStatus.replace(/_/g, ' ')}`;
        break;
    }
    if (result) {
      toast.success(successMsg);
      setActionModal(null);
      setReason('');
      setSelectedStatus('PENDING_REVIEW');
      refetch();
      setBranchCache({});
      if (detailBusiness?._id === business._id) {
        setDetailBusiness(null);
      }
    }
    // Error toasts are handled automatically by the onError callback in each mutation
  }, [actionModal, reason, selectedStatus, approveBusiness, rejectBusiness, suspendBusiness, reinstateBusiness, verifyCac, featureBusiness, deleteBusiness, refetch, detailBusiness]);

  const openAction = (business: Business, action: ActionType) => {
    // Edit doesn't go through the generic confirm-modal flow — it has its
    // own multi-step form so we open EditBusinessModal directly.
    if (action === 'edit') {
      setEditingBusiness(business);
      return;
    }
    setActionModal({ business, action });
    setReason('');
    if (action === 'update-status') {
      setSelectedStatus(business.status as BusinessStatus);
    }
  };

  /**
   * Manually register a single legacy/unclaimed business with pandago.
   * Eligibility is enforced both client-side (the badge only renders the
   * button for eligible businesses) and server-side (returns 400
   * NOT_ELIGIBLE_FOR_MANUAL_REGISTER for normal post-deploy claimed
   * merchants).
   */
  const handlePandagoRegister = useCallback(
    async (b: Business) => {
      setPandagoRegistering(b._id);
      try {
        const res = await api.delivery.pandagoRegisterBusiness(b._id);
        const result = res?.data || res;
        if (result?.status === 'ACTIVE') {
          toast.success(`"${b.name}" registered with pandago.`);
        } else {
          toast.error(`Registration failed: ${result?.error || 'unknown error'}`);
        }
        await refetch();
      } catch (err) {
        const msg =
          (err as any)?.response?.data?.error?.message ||
          (err as any)?.message ||
          'Registration failed';
        toast.error(msg);
      } finally {
        setPandagoRegistering(null);
      }
    },
    [refetch],
  );

  const handlePandagoBackfill = useCallback(
    async (commit: boolean) => {
      setPandagoBackfillLoading(true);
      try {
        const res = await api.delivery.pandagoBackfill({
          dryRun: !commit,
          limit: 200,
        });
        const result = (res?.data || res) as typeof pandagoBackfillResult;
        setPandagoBackfillResult(result);
        if (commit && result) {
          toast.success(
            `Pandago backfill complete: ${result.registered} registered, ${result.failed} failed.`,
          );
          await refetch();
        }
      } catch (err) {
        const msg =
          (err as any)?.response?.data?.error?.message ||
          (err as any)?.message ||
          'Backfill failed';
        toast.error(msg);
      } finally {
        setPandagoBackfillLoading(false);
      }
    },
    [refetch],
  );

  // P140 — Excel export. Fetches the same list endpoint with the CURRENT
  // filters + search but a large limit (10k) so the export reflects the
  // admin's filtered view rather than just the visible page. We over-fetch
  // to a hard cap because rendering-page pagination (typically 20 rows)
  // isn't useful to anyone downloading data for reporting. On >10k, the
  // toast warns the admin only the first 10k were exported and to
  // tighten filters if they need more.
  const [exportLoading, setExportLoading] = useState(false);
  const handleExportExcel = useCallback(async () => {
    setExportLoading(true);
    try {
      const res = await api.businesses.list({
        ...filters,
        search: search || undefined,
        page: 1,
        limit: 10000,
      });
      const rows: Business[] = (res.data as Business[]) || [];
      const total = res.meta?.total ?? rows.length;
      if (total > rows.length) {
        toast.warning(
          `Only the first ${rows.length.toLocaleString()} of ${total.toLocaleString()} businesses were exported. Tighten filters to narrow the list.`,
        );
      }
      if (rows.length === 0) {
        toast.info('No businesses match the current filters — nothing to export.');
        return;
      }
      exportToExcel<Business>({
        filename: 'ruby-businesses',
        sheetName: 'Businesses',
        rows,
        columns: [
          { header: 'Name', value: (b) => b.name },
          { header: 'Slug', value: (b) => b.slug },
          { header: 'Status', value: (b) => b.status },
          {
            header: 'Type',
            value: (b) =>
              b.isParent
                ? 'Parent (multi-branch)'
                : b.parentBusinessId
                ? `Branch of ${
                    typeof b.parentBusinessId === 'object'
                      ? b.parentBusinessId.name
                      : b.parentBusinessId
                  }`
                : 'Standalone',
          },
          { header: 'Branch Label', value: (b) => b.branchLabel || '' },
          { header: 'Category', value: (b) => getCategoryName(b.categoryId) },
          { header: 'Subcategory', value: (b) => getSubcategoryName(b.subcategoryId) },
          { header: 'Location', value: (b) => getLocationName(b.locationId) },
          { header: 'Owner Name', value: (b) => getOwnerName(b.ownerId) },
          { header: 'Owner Email', value: (b) => getOwnerEmail(b.ownerId) },
          { header: 'Business Phone', value: (b) => b.phone || b.contact?.phone || '' },
          { header: 'Business Email', value: (b) => b.email || b.contact?.email || '' },
          { header: 'Website', value: (b) => b.contact?.website || '' },
          {
            header: 'Address',
            value: (b) => {
              if (!b.address) return '';
              if (typeof b.address === 'string') return b.address;
              const parts = [
                b.address.street,
                b.address.city,
                b.address.state,
                b.address.country,
              ].filter(Boolean);
              return parts.join(', ');
            },
          },
          { header: 'Avg Rating', value: (b) => b.averageRating ?? 0 },
          { header: 'Total Reviews', value: (b) => b.totalReviews ?? 0 },
          { header: 'Orders', value: (b) => b.orderCount ?? 0 },
          { header: 'Bookings', value: (b) => b.bookingCount ?? 0 },
          { header: 'Branches', value: (b) => b.branchCount ?? 0 },
          { header: 'CAC Status', value: (b) => b.cacDocumentStatus || '' },
          { header: 'CAC Number', value: (b) => b.cacNumber || '' },
          { header: 'Verified', value: (b) => (b.isVerified ? 'Yes' : 'No') },
          { header: 'Featured', value: (b) => (b.isFeatured ? 'Yes' : 'No') },
          { header: 'Claimed', value: (b) => (b.isClaimed ? 'Yes' : 'No') },
          { header: 'Merchant Code', value: (b) => b.merchantCode || '' },
          {
            header: 'Created At',
            value: (b) => ((b as any).createdAt ? formatDateTime((b as any).createdAt) : ''),
          },
        ],
      });
      toast.success(`Exported ${rows.length.toLocaleString()} businesses to Excel.`);
    } catch (err) {
      const msg =
        (err as any)?.response?.data?.error?.message ||
        (err as any)?.message ||
        'Export failed';
      toast.error(msg);
    } finally {
      setExportLoading(false);
    }
  }, [filters, search]);

  const getActionConfig = (action: ActionType) => {
    const configs: Record<ActionType, { title: string; description: (name: string) => string; label: string; variant: 'primary' | 'danger'; icon: typeof CheckCircle }> = {
      approve: {
        title: 'Approve Business',
        description: (name) => `Approve "${name}"? The business owner will be able to go live.`,
        label: 'Approve',
        variant: 'primary',
        icon: CheckCircle,
      },
      'set-live': {
        title: 'Set Business Live',
        description: (name) =>
          `Push "${name}" LIVE right now? It will be visible on the customer app immediately. This skips the owner's own go-live checklist (bank account verification, phone verification) — only use it when you know the merchant is ready.`,
        label: 'Set Live',
        variant: 'primary',
        icon: CheckCircle,
      },
      reject: {
        title: 'Reject Business',
        description: (name) => `Reject "${name}"? The owner will be notified with your reason.`,
        label: 'Reject',
        variant: 'danger',
        icon: XCircle,
      },
      suspend: {
        title: 'Suspend Business',
        description: (name) => `Suspend "${name}"? This will hide them from discovery immediately.`,
        label: 'Suspend',
        variant: 'danger',
        icon: Ban,
      },
      reinstate: {
        title: 'Reinstate Business',
        description: (name) => `Reinstate "${name}"? This will restore them to their previous approved status.`,
        label: 'Reinstate',
        variant: 'primary',
        icon: RotateCcw,
      },
      'verify-cac': {
        title: 'Verify CAC Document',
        description: (name) => `Confirm CAC document for "${name}" is authentic and valid?`,
        label: 'Verify',
        variant: 'primary',
        icon: ShieldCheck,
      },
      'reject-cac': {
        title: 'Reject CAC Document',
        description: (name) => `Reject the CAC document for "${name}"? Provide a reason.`,
        label: 'Reject CAC',
        variant: 'danger',
        icon: ShieldX,
      },
      feature: {
        title: 'Toggle Featured',
        description: (name) => `Toggle featured status for "${name}"?`,
        label: 'Confirm',
        variant: 'primary',
        icon: Star,
      },
      delete: {
        title: 'Delete Business',
        description: (name) => `Permanently delete "${name}"? This action cannot be undone. All associated data will be removed.`,
        label: 'Delete',
        variant: 'danger',
        icon: Trash2,
      },
      'update-status': {
        title: 'Update Business Status',
        description: (name) => `Change the status of "${name}" to a new value.`,
        label: 'Update Status',
        variant: 'primary',
        icon: RefreshCw,
      },
      // 'edit' short-circuits in openAction and uses its own modal — this
      // entry exists only to satisfy the Record<ActionType, …> type.
      edit: {
        title: 'Edit Business',
        description: (name) => `Edit details for "${name}".`,
        label: 'Edit',
        variant: 'primary',
        icon: Edit2,
      },
      'verify-deolu': {
        title: 'Mark Ruby Verified',
        description: (name) =>
          `Mark "${name}" as Ruby Verified? They'll become eligible for ` +
          `Deolu AI recommendations. The change is reflected after the next ` +
          `merchant embedding refresh (auto via post-save hook).`,
        label: 'Verify',
        variant: 'primary',
        icon: CheckCircle,
      },
      'unverify-deolu': {
        title: 'Remove Ruby Verified',
        description: (name) =>
          `Remove "${name}" from Ruby Verified merchants? Deolu will stop ` +
          `recommending them immediately. Provide a reason for the audit ` +
          `trail.`,
        label: 'Remove Verified',
        variant: 'danger',
        icon: XCircle,
      },
    };
    return configs[action];
  };

  const needsReason = (action: ActionType) =>
    ['reject', 'suspend', 'reject-cac', 'unverify-deolu'].includes(action);

  // ─── Table column headers ───
  // P119 — Phone column added between Owner and Location. Business /
  // Status / Created are sortable via clickable headers (server-side
  // sortBy). Phone / Owner / Location / Pandago / actions are not
  // sortable (string sorts on populated/nested fields are ambiguous).
  const tableHeaders: ReadonlyArray<{
    label: string;
    sortKey?: ColumnSortKey;
    align?: 'left' | 'right';
    widthClass?: string;
  }> = [
    { label: 'Business', sortKey: 'name' },
    { label: 'Status' },
    { label: 'Owner' },
    { label: 'Phone' },
    { label: 'Location' },
    { label: 'Pandago' },
    { label: 'Created', sortKey: 'createdAt' },
    { label: '', widthClass: 'w-20' },
  ];

  // P119 — column-header click handler. Toggles direction if already
  // active; otherwise sets that column as the active sort. Picking a
  // column ALSO clears any active metric-dropdown sort so the two UIs
  // never disagree about what's sorted.
  const activeColumnSort: ColumnSortKey | null =
    filters.sortBy && (COLUMN_SORT_KEYS as readonly string[]).includes(filters.sortBy)
      ? (filters.sortBy as ColumnSortKey)
      : null;
  const activeMetricSort: MetricSortKey | null =
    filters.sortBy && !(COLUMN_SORT_KEYS as readonly string[]).includes(filters.sortBy)
      ? (filters.sortBy as MetricSortKey)
      : null;
  const sortDir: 'asc' | 'desc' = filters.sortOrder ?? 'desc';
  const handleColumnSort = useCallback(
    (key: ColumnSortKey) => {
      setFilters((f) => {
        const isSame = f.sortBy === key;
        const nextOrder: 'asc' | 'desc' =
          isSame ? (f.sortOrder === 'asc' ? 'desc' : 'asc') : 'desc';
        return { ...f, sortBy: key, sortOrder: nextOrder, page: 1 };
      });
    },
    [],
  );
  const handleMetricSort = useCallback(
    (key: MetricSortKey | '') => {
      setFilters((f) => ({
        ...f,
        sortBy: key || undefined,
        // Default desc for metrics — bigger is better.
        sortOrder: key ? 'desc' : f.sortOrder,
        page: 1,
      }));
    },
    [],
  );

  // P119 — true when ANY filter beyond the inherited LOCATION-admin
  // scope is in effect. Drives both the "Clear filters" button visibility
  // and what it clears.
  const hasActiveFilters =
    !!filters.status ||
    !!filters.categoryId ||
    !!filters.subcategoryId ||
    !!filters.locationId ||
    !!filters.cacStatus ||
    !!filters.pandagoStatus ||
    filters.isClaimed !== undefined ||
    filters.isFeatured !== undefined ||
    filters.isVerified !== undefined ||
    !!filters.parentBusinessId ||
    !!filters.createdFrom ||
    !!filters.createdTo ||
    !!filters.ownerId ||
    (!!filters.branchType && filters.branchType !== 'all');

  const clearAllFilters = useCallback(() => {
    setFilters((f) => ({
      page: 1,
      limit: f.limit ?? 20,
      // Preserve LOCATION-admin scope clamp.
      ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1
        ? { locationId: toLocationId(admin.locationIds[0]) }
        : {}),
    }));
    setSearch('');
  }, [admin]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Businesses"
        description="Review and manage business applications"
        action={
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => {
                // P141 — forward the CURRENT filters + search to the
                // map view so an admin who filtered to "PENDING_REVIEW
                // in Lagos" sees exactly that cohort mapped. The map
                // page uses `useSearchParams` to re-hydrate them.
                const sp = new URLSearchParams();
                for (const [k, v] of Object.entries(filters)) {
                  if (
                    v === undefined ||
                    v === null ||
                    v === '' ||
                    k === 'page' ||
                    k === 'limit'
                  ) {
                    continue;
                  }
                  sp.set(k, String(v));
                }
                if (search) sp.set('search', search);
                const qs = sp.toString();
                router.push(
                  `/ruby-app/admin/businesses/map${qs ? `?${qs}` : ''}`,
                );
              }}
              title="Open cluster map of the current filtered list"
            >
              <MapIcon className="w-4 h-4" />
              Map view
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleExportExcel}
              disabled={exportLoading}
              title="Download the current filtered list as an Excel spreadsheet"
            >
              {exportLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export Excel
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => {
                setPandagoBackfillResult(null);
                setPandagoBackfillModalOpen(true);
                handlePandagoBackfill(false); // dry-run preview on open
              }}
              title="Bulk-register legacy and unclaimed businesses with pandago"
            >
              <RefreshCw className="w-4 h-4" />
              Pandago backfill
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 transition-colors"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4" />
              Create Business
            </button>
          </div>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard title="Total" value={stats.total ?? 0} icon={Store} />
          <StatCard title="Pending" value={stats.pendingReview ?? 0} icon={Clock} className={stats.pendingReview > 0 ? 'ring-1 ring-amber-200' : ''} />
          <StatCard title="Approved" value={stats.approved ?? 0} icon={CheckCircle} />
          <StatCard title="Live" value={stats.live ?? 0} icon={Globe} />
          <StatCard title="Rejected" value={stats.rejected ?? 0} icon={XCircle} />
          <StatCard title="Suspended" value={stats.suspended ?? 0} icon={Ban} />
        </div>
      )}

      {/* P119 — "Filtered: branches of [Brand Name]" pill. Only renders
          when ?parentBusinessId=X is in URL (set by the detail modal's
          "View all branches" deep-link). Clicking × clears the filter. */}
      {filters.parentBusinessId && (
        <div className="card px-4 py-2 bg-blue-50/40 border-blue-100">
          <div className="flex items-center gap-2 text-sm">
            <GitBranch className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-blue-700">
              Filtered: branches of{' '}
              <span className="font-semibold">
                {parentBrand?.name ?? '…'}
              </span>
            </span>
            <button
              className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  parentBusinessId: undefined,
                  branchType: undefined,
                  page: 1,
                }))
              }
              title="Clear brand filter"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Filters — two stacked rows. Row 1: search + status + branch
          type + clear (matches today's shape). Row 2 (P119): category /
          subcategory / location / CAC / Pandago / claimed / featured /
          date range. */}
      <div className="card px-4 py-3 space-y-3">
        {/* ─── Row 1 ─── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors placeholder:text-gray-400"
              placeholder="Search businesses..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setFilters(f => ({ ...f, page: 1 })); }}
            />
          </div>
          <div className="relative">
            <select
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors cursor-pointer"
              value={filters.status || ''}
              onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value || undefined) as BusinessStatus | undefined, page: 1 }))}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors cursor-pointer"
              value={branchTypeFilter}
              onChange={(e) => setBranchTypeFilter(e.target.value as BusinessBranchType)}
            >
              <option value="all">All types</option>
              <option value="brands">Brands (Parents)</option>
              <option value="branches">Branches</option>
              <option value="standalone">Standalone</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          {/* P144 — Category + Subcategory promoted from Row 2 to Row 1.
              They're primary filters admins reach for constantly (more so
              than CAC / Pandago status), so keeping them behind a border
              on Row 2 hid them. Picking a category clears the current
              subcategory selection AND drives the Subcategory dropdown's
              option list (`allSubcategories` is fetched keyed on
              `filters.categoryId`). Subcategory stays disabled until
              a category is picked, so admins can't accidentally filter
              by an orphan subcategory. */}
          <div className="min-w-[180px]">
            <SearchableSelect
              options={[
                { value: '', label: 'All categories' },
                ...((allCategories ?? []).map((c) => ({ value: c._id, label: c.name }))),
              ]}
              value={filters.categoryId ?? ''}
              onChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  categoryId: v || undefined,
                  subcategoryId: undefined,
                  page: 1,
                }))
              }
              placeholder="All categories"
            />
          </div>
          <div className="min-w-[180px]">
            <SearchableSelect
              options={[
                {
                  value: '',
                  label: filters.categoryId
                    ? 'All subcategories'
                    : 'Pick a category first',
                },
                ...((allSubcategories ?? []).map((s) => ({
                  value: s._id,
                  label: s.name,
                }))),
              ]}
              value={filters.subcategoryId ?? ''}
              onChange={(v) =>
                setFilters((f) => ({ ...f, subcategoryId: v || undefined, page: 1 }))
              }
              placeholder="All subcategories"
              disabled={!filters.categoryId}
            />
          </div>
          {/* P119 — Sort by metric dropdown. Off-column sorts (rating,
              reviews, orders, branch count) that don't have a visible
              column to click. Picking a metric overrides any active
              column-header sort. */}
          <div className="relative">
            <select
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors cursor-pointer"
              value={activeMetricSort ?? ''}
              onChange={(e) => handleMetricSort((e.target.value as MetricSortKey) || '')}
              title="Sort by a non-column metric"
            >
              <option value="">Sort by (column)</option>
              {METRIC_SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label} ↓
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          {stats && stats.pendingReview > 0 && filters.status !== 'PENDING_REVIEW' && (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              onClick={() => setFilters(f => ({ ...f, status: 'PENDING_REVIEW', page: 1 }))}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {stats.pendingReview} pending review
            </button>
          )}
          {(hasActiveFilters || search) && (
            <button
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
              onClick={clearAllFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ─── Row 2 — advanced filters (P119) ─── */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
          {/* P144 — Category + Subcategory were here; promoted to Row 1
              since they're primary filters. Row 2 now holds only the
              lower-frequency advanced filters (location, CAC status,
              Pandago status, feature/claim flags). */}
          {/* Location */}
          <div className="min-w-[180px]">
            <SearchableSelect
              options={[
                { value: '', label: 'All locations' },
                ...((allLocations ?? []).map((l) => ({ value: l._id, label: l.name }))),
              ]}
              value={filters.locationId ?? ''}
              onChange={(v) =>
                setFilters((f) => ({ ...f, locationId: v || undefined, page: 1 }))
              }
              placeholder="All locations"
              // LOCATION-scoped admins are pinned to their location.
              disabled={admin?.scope === 'LOCATION' && admin.locationIds.length === 1}
            />
          </div>
          {/* CAC Status */}
          <div className="relative">
            <select
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors cursor-pointer"
              value={filters.cacStatus ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  cacStatus: (e.target.value || undefined) as CacDocumentStatus | undefined,
                  page: 1,
                }))
              }
            >
              <option value="">CAC: Any</option>
              {CAC_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  CAC: {s}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          {/* Pandago Status */}
          <div className="relative">
            <select
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors cursor-pointer"
              value={filters.pandagoStatus ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  pandagoStatus: (e.target.value || undefined) as typeof filters.pandagoStatus,
                  page: 1,
                }))
              }
            >
              <option value="">Pandago: Any</option>
              {PANDAGO_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  Pandago: {s.replace('_', ' ')}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          {/* Claimed / Unclaimed */}
          <div className="relative">
            <select
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors cursor-pointer"
              value={filters.isClaimed === undefined ? '' : filters.isClaimed ? 'true' : 'false'}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  isClaimed: e.target.value === '' ? undefined : e.target.value === 'true',
                  page: 1,
                }))
              }
            >
              <option value="">Claim: Any</option>
              <option value="true">Claimed</option>
              <option value="false">Unclaimed</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          {/* Featured */}
          <div className="relative">
            <select
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors cursor-pointer"
              value={filters.isFeatured === undefined ? '' : filters.isFeatured ? 'true' : 'false'}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  isFeatured: e.target.value === '' ? undefined : e.target.value === 'true',
                  page: 1,
                }))
              }
            >
              <option value="">Featured: Any</option>
              <option value="true">Featured</option>
              <option value="false">Not featured</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          {/* Created date range */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Created</span>
            <input
              type="date"
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors"
              value={filters.createdFrom ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, createdFrom: e.target.value || undefined, page: 1 }))
              }
              max={filters.createdTo ?? undefined}
              title="Created on or after"
            />
            <span className="text-xs text-gray-400">→</span>
            <input
              type="date"
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors"
              value={filters.createdTo ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, createdTo: e.target.value || undefined, page: 1 }))
              }
              min={filters.createdFrom ?? undefined}
              title="Created on or before"
            />
          </div>
        </div>
      </div>

      {/* ─── Hierarchical Business Table ─── */}
      <div className="card min-h-[400px]">
        <div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                {tableHeaders.map((h, i) => {
                  // P119 — clickable header when sortKey is set. Header
                  // shows up/down arrow when it's the active sort, faded
                  // double-arrow otherwise. Picking a header here also
                  // clears the "Sort by" metric dropdown indirectly via
                  // `activeColumnSort` derivation.
                  const isActive = !!h.sortKey && activeColumnSort === h.sortKey;
                  return (
                    <th
                      key={i}
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${h.widthClass ?? ''} ${h.sortKey ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                      onClick={() => h.sortKey && handleColumnSort(h.sortKey)}
                    >
                      <div className="inline-flex items-center gap-1">
                        <span>{h.label}</span>
                        {h.sortKey && (
                          isActive ? (
                            sortDir === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-ruby-600" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-ruby-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-gray-300" />
                          )
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {tableHeaders.map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : !displayData.length ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="px-4 py-12 text-center text-sm text-gray-400">
                    No businesses found
                  </td>
                </tr>
              ) : (
                displayData.map((b) => {
                  const isExpanded = expandedParents.has(b._id);
                  const branches = branchCache[b._id];
                  const isBranchRow = !!b.parentBusinessId;

                  return (
                    <Fragment key={b._id}>
                      {/* ── Main row ── */}
                      <tr className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${b.isParent && isExpanded ? 'bg-blue-50/30' : ''}`}>
                        {/* Business cell */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            {b.isParent && branchTypeFilter === 'all' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleParent(b._id); }}
                                className="p-0.5 rounded hover:bg-gray-200/60 transition-colors shrink-0"
                              >
                                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            ) : isBranchRow ? (
                              <GitBranch className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-0.5" />
                            ) : (
                              <div className="w-5" />
                            )}
                            {b.logoUrl ? (
                              <img src={b.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover ring-1 ring-gray-200" />
                            ) : (
                              <div className="w-9 h-9 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex items-center justify-center ring-1 ring-emerald-200/50">
                                <Store className="w-4 h-4 text-emerald-600" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 flex items-center gap-1.5 truncate">
                                {b.name}
                                {b.isFeatured && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                                {b.isParent && b.branchCount ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                                    {b.branchCount} {b.branchCount === 1 ? 'branch' : 'branches'}
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {isBranchRow && b.branchLabel ? (
                                  <span className="text-blue-500">{b.branchLabel}</span>
                                ) : (
                                  getCategoryName(b.categoryId) || 'Uncategorized'
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex flex-col gap-1.5">
                            <StatusBadge status={b.status} />
                            {b.cacDocumentUrl && <CacBadge status={b.cacDocumentStatus} />}
                          </div>
                        </td>
                        {/* Owner */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {b.isClaimed === false ? (
                            <div className="min-w-0">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200">Unclaimed</span>
                              {b.claimCode && <div className="text-xs text-gray-400 mt-0.5 font-mono">{b.claimCode}</div>}
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <div className="text-sm text-gray-700 font-medium truncate">{getOwnerName(b.ownerId) || 'Unknown'}</div>
                              {getOwnerEmail(b.ownerId) && <div className="text-xs text-gray-400 truncate">{getOwnerEmail(b.ownerId)}</div>}
                            </div>
                          )}
                        </td>
                        {/* P119 — Phone column. tel: link + copy-to-clipboard on
                            hover. Renders contact.phone as the primary and
                            contact.phone2 as a smaller second line if present.
                            Branch rows show their OWN phone (each branch is a
                            distinct Business doc with its own contact). */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <PhoneCell phone={b.contact?.phone} phone2={b.contact?.phone2} />
                        </td>
                        {/* Location */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{getLocationName(b.locationId) || '—'}</span>
                          </div>
                        </td>
                        {/* Pandago — outlet registration status */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <PandagoBadge business={b} onRegister={handlePandagoRegister} registering={pandagoRegistering === b._id} />
                        </td>
                        {/* Created */}
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(b.createdAt)}</td>
                        {/* Actions */}
                        <td className="px-4 py-3 text-sm text-gray-700 w-20">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setDetailBusiness(b); setDetailTab('info'); }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4 text-gray-400" />
                            </button>
                            <ActionDropdown business={b} onAction={openAction} onView={(biz) => { setDetailBusiness(biz); setDetailTab('info'); }} />
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded branch rows ── */}
                      {b.isParent && isExpanded && branchTypeFilter === 'all' && (
                        <>
                          {branches?.loading && (
                            Array.from({ length: 2 }).map((_, i) => (
                              <tr key={`skel-${b._id}-${i}`} className="border-b border-gray-100 bg-gray-50/60">
                                <td className="py-3 text-sm" style={{ paddingLeft: 52 }}>
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                                    <div className="space-y-1.5">
                                      <div className="h-3.5 bg-gray-200 rounded w-28 animate-pulse" />
                                      <div className="h-3 bg-gray-100 rounded w-16 animate-pulse" />
                                    </div>
                                  </div>
                                </td>
                                {Array.from({ length: 4 }).map((_, j) => (
                                  <td key={j} className="px-4 py-3"><div className="skeleton h-3.5 w-16" /></td>
                                ))}
                                <td className="px-4 py-3 w-20" />
                              </tr>
                            ))
                          )}
                          {branches?.data?.map((branch) => (
                            <tr key={branch._id} className="border-b border-gray-100 bg-gray-50/60 hover:bg-gray-100/60 transition-colors animate-fade-in" style={{ borderLeft: '2px solid rgb(147, 197, 253)' }}>
                              {/* Branch business cell */}
                              <td className="py-3 text-sm text-gray-700" style={{ paddingLeft: 52, paddingRight: 16 }}>
                                <div className="flex items-center gap-2">
                                  <GitBranch className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  {branch.logoUrl ? (
                                    <img src={branch.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-gray-200" />
                                  ) : (
                                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex items-center justify-center ring-1 ring-emerald-200/50">
                                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-800 text-sm truncate">{branch.name}</div>
                                    {branch.branchLabel && <div className="text-xs text-blue-500 truncate">{branch.branchLabel}</div>}
                                  </div>
                                </div>
                              </td>
                              {/* Status */}
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <StatusBadge status={branch.status} />
                              </td>
                              {/* Owner */}
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="text-sm text-gray-700 font-medium truncate">{getOwnerName(branch.ownerId) || 'Unknown'}</div>
                              </td>
                              {/* P119 — Phone (branch's own contact.phone) */}
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <PhoneCell phone={branch.contact?.phone} phone2={branch.contact?.phone2} />
                              </td>
                              {/* Location */}
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="truncate">{getLocationName(branch.locationId) || '—'}</span>
                                </div>
                              </td>
                              {/* P119 — Pandago slot kept empty for branch rows so
                                  the column count matches the parent row's 8-cell
                                  layout. Branches inherit auto-register from the
                                  parent; per-row Pandago status isn't useful here. */}
                              <td className="px-4 py-3 text-sm text-gray-400">—</td>
                              {/* Created */}
                              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(branch.createdAt)}</td>
                              {/* Actions */}
                              <td className="px-4 py-3 text-sm text-gray-700 w-20">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDetailBusiness(branch); setDetailTab('info'); }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                    title="View details"
                                  >
                                    <Eye className="w-4 h-4 text-gray-400" />
                                  </button>
                                  <ActionDropdown business={branch} onAction={openAction} onView={(biz) => { setDetailBusiness(biz); setDetailTab('info'); }} />
                                </div>
                              </td>
                            </tr>
                          ))}
                          {branches && !branches.loading && branches.data.length === 0 && (
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                              <td colSpan={tableHeaders.length} className="py-3 text-xs text-gray-400 text-center" style={{ paddingLeft: 52 }}>
                                No branches found
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && (meta.totalPages || 1) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/30">
            <div className="text-xs text-gray-500">
              Page {filters.page || 1} of {meta.totalPages || 1} · {meta.total} total
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setFilters(f => ({ ...f, page: 1 })); setExpandedParents(new Set()); }} disabled={(filters.page || 1) <= 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button onClick={() => { setFilters(f => ({ ...f, page: (f.page || 1) - 1 })); setExpandedParents(new Set()); }} disabled={(filters.page || 1) <= 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => { setFilters(f => ({ ...f, page: (f.page || 1) + 1 })); setExpandedParents(new Set()); }} disabled={(filters.page || 1) >= (meta.totalPages || 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => { setFilters(f => ({ ...f, page: meta.totalPages || 1 })); setExpandedParents(new Set()); }} disabled={(filters.page || 1) >= (meta.totalPages || 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Detail Modal ─── */}
      <Modal
        isOpen={!!detailBusiness}
        onClose={() => setDetailBusiness(null)}
        title={displayBusiness?.name || 'Business Details'}
        size="xl"
      >
        {displayBusiness && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              {displayBusiness.logoUrl ? (
                <img src={displayBusiness.logoUrl} alt="" className="w-14 h-14 rounded-xl object-cover ring-1 ring-gray-200" />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center ring-1 ring-emerald-200/50">
                  <Store className="w-7 h-7 text-emerald-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={displayBusiness.status} />
                  {displayBusiness.isFeatured && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <Star className="w-2.5 h-2.5 fill-amber-500" />
                      FEATURED
                    </span>
                  )}
                  {displayBusiness.isClaimed === false && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                      UNCLAIMED
                    </span>
                  )}
                </div>
                {displayBusiness.tagline && <p className="text-sm text-gray-500 mt-1">{displayBusiness.tagline}</p>}
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                  <span className="text-gray-600 font-medium">{getCategoryName(displayBusiness.categoryId) || 'Uncategorized'}</span>
                  <span className="text-gray-300">/</span>
                  <span>{getSubcategoryName(displayBusiness.subcategoryId) || '—'}</span>
                  {displayBusiness.slug && (
                    <>
                      <span className="text-gray-300">&#183;</span>
                      <span className="font-mono text-gray-400">{displayBusiness.slug}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Cover image */}
            {displayBusiness.coverImageUrl && (
              <img src={displayBusiness.coverImageUrl} alt="Cover" className="w-full h-36 object-cover rounded-lg ring-1 ring-gray-200" />
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-100">
              {(['info', 'media', 'cac', 'hours', 'catalog', 'wallet', ...(displayBusiness.isParent || displayBusiness.parentBusinessId ? ['branches'] as const : [])] as const).map(tab => (
                <button
                  key={tab}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    detailTab === tab
                      ? 'border-ruby-600 text-ruby-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                  onClick={() => { setDetailTab(tab as any); if (tab === 'catalog') { setCatalogSearch(''); setCatalogStatusFilter(''); } }}
                >
                  {tab === 'info' ? 'Info' : tab === 'media' ? 'Media' : tab === 'cac' ? 'CAC' : tab === 'hours' ? 'Hours' : tab === 'branches' ? 'Branches' : tab === 'wallet' ? 'Wallet' : 'Catalog'}
                  {tab === 'cac' && displayBusiness.cacDocumentUrl && displayBusiness.cacDocumentStatus === 'PENDING' && (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab: Info */}
            {detailTab === 'info' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <DetailField label="Owner" value={getOwnerName(displayBusiness.ownerId) || String(displayBusiness.ownerId)} />
                  <DetailField label="Location" value={getLocationName(displayBusiness.locationId) || String(displayBusiness.locationId || '—')} />
                  {displayBusiness.currency && <DetailField label="Currency" value={displayBusiness.currency} />}
                  {displayBusiness.type && <DetailField label="Business Type" value={displayBusiness.type} />}
                  {displayBusiness.operationModes && displayBusiness.operationModes.length > 0 && (
                    <DetailField label="Operation Modes" value={displayBusiness.operationModes.join(', ')} />
                  )}
                  {(displayBusiness.averageRating !== undefined && displayBusiness.averageRating > 0) && (
                    <DetailField label="Rating" value={`${displayBusiness.averageRating.toFixed(1)} (${displayBusiness.totalReviews || 0} reviews)`} />
                  )}
                  {displayBusiness.budgetMin !== undefined && displayBusiness.budgetMax !== undefined && (
                    <DetailField label="Budget Range" value={`${formatCurrency(displayBusiness.budgetMin, displayBusiness.currency || 'NGN')} - ${formatCurrency(displayBusiness.budgetMax, displayBusiness.currency || 'NGN')}`} />
                  )}
                  {displayBusiness.viewCount !== undefined && (
                    <DetailField label="Stats" value={`${displayBusiness.viewCount} views, ${displayBusiness.orderCount || 0} orders, ${displayBusiness.bookingCount || 0} bookings`} />
                  )}
                  {displayBusiness.isParent && (
                    <DetailField label="Multi-Branch" value={`Parent business${displayBusiness.branchCount ? ` (${displayBusiness.branchCount} branches)` : ''}`} />
                  )}
                  {displayBusiness.branchLabel && (
                    <DetailField label="Branch Label" value={displayBusiness.branchLabel} />
                  )}
                  {displayBusiness.parentBusinessId && (
                    <DetailField label="Parent Business" value={typeof displayBusiness.parentBusinessId === 'object' ? displayBusiness.parentBusinessId.name : displayBusiness.parentBusinessId} />
                  )}
                  {displayBusiness.catalogMode && displayBusiness.catalogMode !== 'INDEPENDENT' && (
                    <DetailField label="Catalog Mode" value={displayBusiness.catalogMode} />
                  )}
                </div>

                {/* Claim Info */}
                {displayBusiness.isClaimed === false && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                    <span className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider">Claim Info</span>
                    {displayBusiness.claimCode && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Claim Code:</span>
                        <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-orange-200">{displayBusiness.claimCode}</span>
                        <button
                          className="p-1 hover:bg-orange-100 rounded transition-colors"
                          onClick={() => { navigator.clipboard.writeText(displayBusiness.claimCode!); toast.success('Claim code copied'); }}
                          title="Copy claim code"
                        >
                          <Copy className="w-3.5 h-3.5 text-orange-600" />
                        </button>
                        <button
                          className="text-xs text-orange-600 hover:text-orange-800 underline underline-offset-2"
                          onClick={async () => {
                            const result = await regenerateClaimCode({ id: displayBusiness._id });
                            if (result !== null) {
                              toast.success(`New claim code: ${(result as any)?.claimCode}`);
                              refetch();
                            }
                          }}
                        >
                          Regenerate
                        </button>
                      </div>
                    )}
                    {displayBusiness.claimContactPhone && (
                      <div className="text-sm text-gray-600">Merchant phone: <strong>{displayBusiness.claimContactPhone}</strong></div>
                    )}
                    {displayBusiness.claimContactEmail && (
                      <div className="text-sm text-gray-600">Merchant email: <strong>{displayBusiness.claimContactEmail}</strong></div>
                    )}
                  </div>
                )}

                {displayBusiness.description && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</span>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">{displayBusiness.description}</p>
                  </div>
                )}

                {/* Contact */}
                {(displayBusiness.contact || displayBusiness.phone || displayBusiness.email) && (
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Contact</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(displayBusiness.contact?.phone || displayBusiness.phone) && (
                        <ContactItem icon={Phone} value={displayBusiness.contact?.phone || displayBusiness.phone || ''} />
                      )}
                      {displayBusiness.contact?.phone2 && (
                        <ContactItem icon={Phone} value={displayBusiness.contact.phone2} />
                      )}
                      {(displayBusiness.contact?.email || displayBusiness.email) && (
                        <ContactItem icon={Mail} value={displayBusiness.contact?.email || displayBusiness.email || ''} />
                      )}
                      {displayBusiness.contact?.website && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                          <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <a href={displayBusiness.contact.website} target="_blank" rel="noopener noreferrer" className="text-ruby-600 hover:underline truncate">
                            {displayBusiness.contact.website}
                          </a>
                        </div>
                      )}
                      {displayBusiness.contact?.whatsapp && (
                        <ContactItem icon={Phone} value={`WhatsApp: ${displayBusiness.contact.whatsapp}`} iconColor="text-green-500" />
                      )}
                      {displayBusiness.contact?.instagram && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-pink-500 text-xs font-bold shrink-0">IG</span>
                          <span className="truncate">{displayBusiness.contact.instagram}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Address */}
                {displayBusiness.address && (
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Address</span>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-sm text-gray-700">
                        {(typeof displayBusiness.address === 'object' && displayBusiness.address !== null)
                          ? [
                              (displayBusiness.address as BusinessAddress).street,
                              (displayBusiness.address as BusinessAddress).street2,
                              (displayBusiness.address as BusinessAddress).city,
                              (displayBusiness.address as BusinessAddress).state,
                              (displayBusiness.address as BusinessAddress).country,
                            ].filter(Boolean).join(', ')
                          : String(displayBusiness.address)
                        }
                      </p>
                      {(typeof displayBusiness.address === 'object' && displayBusiness.address !== null) && (displayBusiness.address as BusinessAddress)?.landmark && (
                        <p className="text-xs text-gray-500 mt-0.5">Landmark: {(displayBusiness.address as BusinessAddress).landmark}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Coordinates */}
                {(() => {
                  const geo = displayBusiness.geoPoint || displayBusiness.coordinates;
                  return geo?.coordinates?.length === 2 ? (
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Location Pin</span>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-ruby-500 shrink-0" />
                        {geo.coordinates[1].toFixed(6)}, {geo.coordinates[0].toFixed(6)}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Template data */}
                {displayBusiness.templateData && Object.keys(displayBusiness.templateData).length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Business Attributes</span>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(displayBusiness.templateData).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-[11px] text-gray-500">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                          <p className="text-sm font-medium text-gray-800">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin history */}
                {(displayBusiness.rejectionReason || displayBusiness.suspensionReason || displayBusiness.approvedAt) && (
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Admin History</span>
                    <div className="space-y-2">
                      {displayBusiness.approvedAt && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          Approved on {formatDate(displayBusiness.approvedAt)}
                        </div>
                      )}
                      {displayBusiness.rejectionReason && (
                        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                          <div className="flex items-center gap-1.5 text-red-700 font-medium text-xs">
                            <XCircle className="w-3.5 h-3.5" /> Rejection Reason
                          </div>
                          <p className="text-sm text-red-600 mt-1">{displayBusiness.rejectionReason}</p>
                        </div>
                      )}
                      {displayBusiness.suspensionReason && (
                        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                          <div className="flex items-center gap-1.5 text-red-700 font-medium text-xs">
                            <Ban className="w-3.5 h-3.5" /> Suspension Reason
                          </div>
                          <p className="text-sm text-red-600 mt-1">{displayBusiness.suspensionReason}</p>
                          {displayBusiness.suspendedAt && <p className="text-xs text-red-400 mt-1">Suspended on {formatDate(displayBusiness.suspendedAt)}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Media */}
            {detailTab === 'media' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Logo</span>
                    {displayBusiness.logoUrl ? (
                      <a href={displayBusiness.logoUrl} target="_blank" rel="noopener noreferrer">
                        <img src={displayBusiness.logoUrl} alt="Logo" className="w-24 h-24 rounded-xl object-cover ring-1 ring-gray-200 hover:opacity-80 transition-opacity" />
                      </a>
                    ) : (
                      <div className="w-24 h-24 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 ring-1 ring-gray-200">
                        <Store className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Cover Image</span>
                    {displayBusiness.coverImageUrl ? (
                      <a href={displayBusiness.coverImageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={displayBusiness.coverImageUrl} alt="Cover" className="w-full h-24 rounded-xl object-cover ring-1 ring-gray-200 hover:opacity-80 transition-opacity" />
                      </a>
                    ) : (
                      <div className="w-full h-24 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 ring-1 ring-gray-200 text-xs">
                        No cover image
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Gallery ({displayBusiness.media?.length || 0} items)</span>
                  {displayBusiness.media && displayBusiness.media.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {displayBusiness.media.map((item, idx) => {
                        const url = typeof item === 'string' ? item : (item as BusinessMediaItem).url;
                        const mediaType = typeof item === 'object' ? (item as BusinessMediaItem).type : 'IMAGE';
                        const caption = typeof item === 'object' ? (item as BusinessMediaItem).caption : undefined;
                        return (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="group relative">
                            {mediaType === 'VIDEO' ? (
                              <div className="w-full h-24 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                                <span className="text-2xl">&#9658;</span>
                              </div>
                            ) : (
                              <img src={url} alt={caption || `Media ${idx + 1}`} className="w-full h-24 object-cover rounded-lg ring-1 ring-gray-200 group-hover:opacity-80 transition-opacity" />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                              <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <Store className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">No media uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: CAC */}
            {detailTab === 'cac' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="p-2 bg-white rounded-lg ring-1 ring-gray-200">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">CAC Document Status</span>
                    <div className="mt-0.5">
                      <CacBadge status={displayBusiness.cacDocumentStatus} />
                    </div>
                  </div>
                </div>

                {displayBusiness.cacNumber && (
                  <DetailField label="CAC Number" value={displayBusiness.cacNumber} />
                )}

                {displayBusiness.cacDocumentUrl ? (
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Document</span>
                    <a
                      href={displayBusiness.cacDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                    >
                      <FileText className="w-4 h-4 text-ruby-600" />
                      View CAC Document
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </a>
                    {displayBusiness.cacDocumentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                      <img src={displayBusiness.cacDocumentUrl} alt="CAC Document" className="mt-3 max-w-full max-h-60 rounded-lg ring-1 ring-gray-200" />
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">No CAC document uploaded</p>
                  </div>
                )}

                {displayBusiness.cacRejectionReason && (
                  <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-red-700 font-medium text-xs">
                      <XCircle className="w-3.5 h-3.5" /> CAC Rejection Reason
                    </div>
                    <p className="text-sm text-red-600 mt-1">{displayBusiness.cacRejectionReason}</p>
                  </div>
                )}

                {displayBusiness.cacVerifiedAt && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified on {formatDate(displayBusiness.cacVerifiedAt)}
                  </div>
                )}

                {displayBusiness.cacDocumentUrl && displayBusiness.cacDocumentStatus === 'PENDING' && (
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      onClick={() => openAction(displayBusiness, 'verify-cac')}
                    >
                      <ShieldCheck className="w-4 h-4" /> Verify CAC
                    </button>
                    <button
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                      onClick={() => openAction(displayBusiness, 'reject-cac')}
                    >
                      <ShieldX className="w-4 h-4" /> Reject CAC
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Hours */}
            {detailTab === 'hours' && (
              <div className="space-y-4">
                {displayBusiness.timezone && (
                  <p className="text-xs text-gray-500">Timezone: <span className="font-medium text-gray-700">{displayBusiness.timezone}</span></p>
                )}
                {Array.isArray(displayBusiness.hours) && displayBusiness.hours.length > 0 ? (
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
                    {(displayBusiness.hours as BusinessHoursEntry[])
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                      .map((h) => (
                        <div key={h.dayOfWeek} className="flex items-center justify-between py-2.5 px-4 hover:bg-gray-50 transition-colors">
                          <span className="text-sm font-medium text-gray-700 w-28">{DAY_NAMES[h.dayOfWeek]}</span>
                          {h.isClosed ? (
                            <span className="text-sm text-red-400 font-medium">Closed</span>
                          ) : (
                            <span className="text-sm text-gray-600 font-mono">{h.openTime} – {h.closeTime}</span>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">No business hours set</p>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Settings</span>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${displayBusiness.acceptsOrders !== false ? 'bg-green-500' : 'bg-gray-300'}`} />
                      Accepts Orders
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${displayBusiness.acceptsBookings !== false ? 'bg-green-500' : 'bg-gray-300'}`} />
                      Accepts Bookings
                    </div>
                    {displayBusiness.minimumOrderValue !== undefined && displayBusiness.minimumOrderValue > 0 && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2 col-span-2">
                        <span className="text-[11px] text-gray-500">Min. Order</span>
                        <p className="text-sm font-medium">{formatCurrency(displayBusiness.minimumOrderValue)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Catalog */}
            {detailTab === 'catalog' && displayBusiness && (
              <div className="space-y-4">
                {/* Sub-tab switcher for businesses with both products & services */}
                {catalogType === 'both' && (
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => { setCatalogSubTab('products'); setCatalogSearch(''); setCatalogStatusFilter(''); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        catalogSubTab === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      Products ({catalogProducts?.length ?? 0})
                    </button>
                    <button
                      onClick={() => { setCatalogSubTab('services'); setCatalogSearch(''); setCatalogStatusFilter(''); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        catalogSubTab === 'services' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Services ({catalogServices?.length ?? 0})
                    </button>
                  </div>
                )}

                {/* Filter bar */}
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                      placeholder={`Search ${showProducts ? 'products' : 'services'}...`}
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={catalogStatusFilter}
                      onChange={(e) => setCatalogStatusFilter(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                    >
                      <option value="">All statuses</option>
                      {showProducts
                        ? ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)
                        : ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].map(s => <option key={s} value={s}>{s}</option>)
                      }
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Product list */}
                {showProducts && (
                  <div>
                    {loadingProducts ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-5 h-5 border-2 border-ruby-600 border-t-transparent rounded-full" />
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-8 text-center">
                        <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm text-gray-400">{catalogSearch || catalogStatusFilter ? 'No matching products' : 'No products listed'}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                        {filteredProducts.map(product => {
                          const img = product.images?.find(i => i.isPrimary) || product.images?.[0];
                          return (
                            <div key={product._id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50/50 transition-colors">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {img ? (
                                  <img src={img.url} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-gray-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {product.category && (
                                    <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{product.category}</span>
                                  )}
                                  {product.sku && <span className="text-[10px] text-gray-400 font-mono">{product.sku}</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-gray-900">{formatCurrency(product.basePrice)}</p>
                                {product.trackInventory && (
                                  <p className={`text-[10px] font-medium ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                                  </p>
                                )}
                              </div>
                              <StatusBadge status={product.status} />
                              <CatalogActionMenu
                                item={product}
                                type="product"
                                onView={() => setCatalogItemModal({ type: 'product', item: product })}
                                onEdit={() => setCatalogEditModal({ type: 'product', item: product })}
                                onAction={(action) => setCatalogConfirmModal({ type: 'product', action, item: product })}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Service list */}
                {showServices && (
                  <div>
                    {loadingServices ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-5 h-5 border-2 border-ruby-600 border-t-transparent rounded-full" />
                      </div>
                    ) : filteredServices.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-8 text-center">
                        <Wrench className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm text-gray-400">{catalogSearch || catalogStatusFilter ? 'No matching services' : 'No services listed'}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                        {filteredServices.map(svc => {
                          const img = svc.media?.[0] || (svc.coverImageUrl ? { url: svc.coverImageUrl } : null);
                          const priceText = svc.pricing?.type === 'QUOTE_REQUIRED' ? 'Quote' : svc.pricing?.type === 'STARTS_FROM' ? `From ${formatCurrency(svc.pricing.basePrice || 0)}` : formatCurrency(svc.pricing?.basePrice || 0);
                          const dur = svc.duration?.minutes;
                          const durText = dur ? `${dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 ? ` ${dur % 60}m` : ''}` : `${dur}m`}${svc.duration?.isFlexible ? ' ~' : ''}` : '';
                          return (
                            <div key={svc._id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50/50 transition-colors">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {img ? (
                                  <img src={img.url} alt={svc.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Wrench className="w-4 h-4 text-gray-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{svc.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{svc.fulfillmentMode?.replace(/_/g, ' ') || 'ON SITE'}</span>
                                  {durText && <span className="text-[10px] text-gray-500">{durText}</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-gray-900">{priceText}</p>
                                {svc.pricing?.type !== 'QUOTE_REQUIRED' && svc.pricing?.depositPercent > 0 && (
                                  <p className="text-[10px] text-gray-400">{svc.pricing.depositPercent}% deposit</p>
                                )}
                              </div>
                              <StatusBadge status={svc.status} />
                              <CatalogActionMenu
                                item={svc}
                                type="service"
                                onView={() => setCatalogItemModal({ type: 'service', item: svc })}
                                onEdit={() => setCatalogEditModal({ type: 'service', item: svc })}
                                onAction={(action) => setCatalogConfirmModal({ type: 'service', action, item: svc })}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Branches */}
            {detailTab === 'branches' && (
              <BranchesTab
                businessId={displayBusiness._id}
                isParent={!!displayBusiness.isParent}
                // P119-C1 — "View all in main table" deep-link. Closes
                // this modal and routes back to the businesses page with
                // ?parentBusinessId=X, which the page picks up via
                // deepLinkParentBusinessId + the pill header. Pass the
                // brand name so the pill renders immediately without a
                // second fetch round-trip.
                onViewAllInTable={() => {
                  setDetailBusiness(null);
                  const id = displayBusiness._id;
                  router.push(`/ruby-app/admin/businesses?parentBusinessId=${id}`);
                }}
              />
            )}

            {/* Tab: Wallet — admin can top up the business's NGN wallet
                same way they can top up a customer's wallet. Bills the
                platform; shows full transaction ledger. */}
            {detailTab === 'wallet' && (
              <BusinessWalletTab
                businessId={displayBusiness._id}
                businessName={displayBusiness.name}
                refreshTick={walletRefreshTick}
                onOpenFundModal={() => setShowFundBusinessModal(true)}
                onOpenDebitModal={() => setShowDebitBusinessModal(true)}
              />
            )}

            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
              <button
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  displayBusiness.isFeatured
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => openAction(displayBusiness, 'feature')}
              >
                <Star className={`w-3.5 h-3.5 ${displayBusiness.isFeatured ? 'fill-amber-500' : ''}`} />
                {displayBusiness.isFeatured ? 'Remove Featured' : 'Set Featured'}
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                onClick={() => { setDetailBusiness(null); openAction(displayBusiness, 'delete'); }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>

              <div className="flex-1" />

              {displayBusiness.status === 'PENDING_REVIEW' && (
                <>
                  <button
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                    onClick={() => { setDetailBusiness(null); openAction(displayBusiness, 'reject'); }}
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    onClick={() => { setDetailBusiness(null); openAction(displayBusiness, 'approve'); }}
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                </>
              )}
              {(displayBusiness.status === 'APPROVED' || displayBusiness.status === 'LIVE') && (
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                  onClick={() => { setDetailBusiness(null); openAction(displayBusiness, 'suspend'); }}
                >
                  <Ban className="w-4 h-4" /> Suspend
                </button>
              )}
              {displayBusiness.status === 'SUSPENDED' && (
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  onClick={() => { setDetailBusiness(null); openAction(displayBusiness, 'reinstate'); }}
                >
                  <RotateCcw className="w-4 h-4" /> Reinstate
                </button>
              )}
            </div>
          </div>
        )}
        {loadingDetail && !fullDetail && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-ruby-600 border-t-transparent rounded-full" />
          </div>
        )}
        {detailError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            <p className="font-medium">Failed to load full details</p>
            <p className="text-red-500 mt-1">{detailError}</p>
          </div>
        )}
      </Modal>

      {/* ─── Action Confirmation Modal ─── */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); setReason(''); }}
        title={actionModal ? getActionConfig(actionModal.action).title : ''}
      >
        {actionModal && (() => {
          const config = getActionConfig(actionModal.action);
          const isDanger = config.variant === 'danger';
          return (
            <div className="space-y-4">
              <div className={`flex items-start gap-3 p-3 rounded-lg ${isDanger ? 'bg-red-50 border border-red-100' : 'bg-blue-50 border border-blue-100'}`}>
                <config.icon className={`w-5 h-5 mt-0.5 shrink-0 ${isDanger ? 'text-red-500' : 'text-blue-500'}`} />
                <p className={`text-sm ${isDanger ? 'text-red-700' : 'text-blue-700'}`}>
                  {config.description(actionModal.business.name)}
                </p>
              </div>

              {needsReason(actionModal.action) && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors resize-none"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide a reason..."
                    autoFocus
                  />
                </div>
              )}

              {actionModal.action === 'update-status' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    New Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors bg-white"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as BusinessStatus)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Reason (optional)</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors resize-none"
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Provide a reason for the status change..."
                    />
                  </div>
                </div>
              )}

              {actionModal.action === 'approve' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes (optional)</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors resize-none"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Any notes for the approval..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  onClick={() => { setActionModal(null); setReason(''); }}
                >
                  Cancel
                </button>
                <button
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDanger
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-ruby-600 text-white hover:bg-ruby-700'
                  }`}
                  onClick={handleAction}
                  disabled={isProcessing || (needsReason(actionModal.action) && !reason.trim())}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <config.icon className="w-4 h-4" />
                      {config.label}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ─── Fund Business Wallet Modal ─── */}
      {showFundBusinessModal && detailBusiness && (
        <FundBusinessWalletModal
          businessId={detailBusiness._id}
          businessName={detailBusiness.name}
          onClose={() => setShowFundBusinessModal(false)}
          onSuccess={() => {
            setShowFundBusinessModal(false);
            // Force the wallet tab to re-fetch the new balance + transactions
            setWalletRefreshTick(t => t + 1);
          }}
        />
      )}

      {/* ─── Debit Business Wallet Modal ─── */}
      {showDebitBusinessModal && detailBusiness && (
        <DebitBusinessWalletModal
          businessId={detailBusiness._id}
          businessName={detailBusiness.name}
          onClose={() => setShowDebitBusinessModal(false)}
          onSuccess={() => {
            setShowDebitBusinessModal(false);
            setWalletRefreshTick(t => t + 1);
          }}
        />
      )}

      {/* ─── Edit Business Modal ─── */}
      {editingBusiness && (
        <EditBusinessModal
          business={editingBusiness}
          onClose={() => setEditingBusiness(null)}
          onSubmit={async (data) => {
            const result = await api.businesses.adminUpdate(editingBusiness._id, data);
            const updated = result?.data || result;
            if (updated) {
              toast.success(`"${editingBusiness.name}" updated`);
              setEditingBusiness(null);
              refetch();
            }
          }}
        />
      )}

      {/* ─── Pandago Backfill Modal ─── */}
      <Modal
        isOpen={pandagoBackfillModalOpen}
        onClose={() => setPandagoBackfillModalOpen(false)}
        title="Pandago outlet backfill"
        subtitle="Bulk-register legacy and unclaimed businesses with pandago"
        size="md"
      >
        <div className="space-y-4 p-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            This will register every <strong>legacy</strong> (pre-feature) and
            <strong> unclaimed</strong> business with pandago. Normal post-feature
            claimed merchants auto-register on admin approval and are excluded.
          </div>

          {pandagoBackfillLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading…</span>
            </div>
          ) : pandagoBackfillResult ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <StatCard title="Scanned" value={pandagoBackfillResult.scanned} icon={Search} />
                <StatCard title="Registered" value={pandagoBackfillResult.registered} icon={CheckCircle} />
                <StatCard title="Failed" value={pandagoBackfillResult.failed} icon={XCircle} />
                <StatCard title="Skipped" value={pandagoBackfillResult.skipped} icon={Ban} />
              </div>
              {pandagoBackfillResult.errors.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Errors / would-fail ({pandagoBackfillResult.errors.length})
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {pandagoBackfillResult.errors.map((e) => (
                      <div key={e.businessId} className="px-3 py-2 text-xs border-t border-gray-100 flex justify-between gap-2">
                        <span className="font-mono text-gray-400 truncate">{e.businessId.slice(-8)}</span>
                        <span className="text-gray-700 flex-1 truncate">{e.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No data yet.</div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setPandagoBackfillModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => handlePandagoBackfill(false)}
              disabled={pandagoBackfillLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Refresh preview
            </button>
            <button
              onClick={() => handlePandagoBackfill(true)}
              disabled={
                pandagoBackfillLoading ||
                !pandagoBackfillResult ||
                pandagoBackfillResult.scanned === 0
              }
              className="px-4 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700 disabled:opacity-50"
            >
              {pandagoBackfillLoading ? 'Running…' : 'Commit backfill'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Create Business Modal ─── */}
      <CreateBusinessModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (data) => {
          const result = await createBusiness(data);
          if (result !== null) {
            toast.success('Business created successfully');
            setShowCreateModal(false);
            refetch();
            const biz = result as Business | undefined;
            if (biz?.claimCode) {
              toast.info(`Claim code: ${biz.claimCode}`, { duration: 10000 });
            }
          }
        }}
        isSubmitting={creating}
      />

      {/* ─── Catalog Detail Modal ─── */}
      <Modal
        isOpen={!!catalogItemModal}
        onClose={() => setCatalogItemModal(null)}
        title={catalogItemModal ? (catalogItemModal.type === 'product' ? (catalogItemModal.item as Product).name : (catalogItemModal.item as ServiceListing).name) : ''}
        subtitle={catalogItemModal ? `${catalogItemModal.type === 'product' ? 'Product' : 'Service'} Details` : ''}
        size="lg"
      >
        {catalogItemModal && <CatalogDetailContent type={catalogItemModal.type} item={catalogItemModal.item} />}
      </Modal>

      {/* ─── Catalog Edit Modal ─── */}
      <Modal
        isOpen={!!catalogEditModal}
        onClose={() => setCatalogEditModal(null)}
        title={catalogEditModal ? `Edit ${catalogEditModal.type === 'product' ? 'Product' : 'Service'}` : ''}
        size="lg"
      >
        {catalogEditModal && catalogEditModal.type === 'product' && (() => {
          const p = catalogEditModal.item as Product;
          return (
            <CatalogEditProductForm
              product={p}
              isSubmitting={updatingProduct}
              onCancel={() => setCatalogEditModal(null)}
              onSubmit={async (data) => {
                const result = await updateProduct({ id: p._id, data });
                if (result !== null) {
                  setCatalogEditModal(null);
                  toast.success('Product updated');
                  refetchCatalog();
                }
              }}
            />
          );
        })()}
        {catalogEditModal && catalogEditModal.type === 'service' && (() => {
          const s = catalogEditModal.item as ServiceListing;
          return (
            <CatalogEditServiceForm
              service={s}
              isSubmitting={updatingService}
              onCancel={() => setCatalogEditModal(null)}
              onSubmit={async (data) => {
                const result = await updateService({ id: s._id, data });
                if (result !== null) {
                  setCatalogEditModal(null);
                  toast.success('Service updated');
                  refetchCatalog();
                }
              }}
            />
          );
        })()}
      </Modal>

      {/* ─── Catalog Confirm Action Modal ─── */}
      <Modal
        isOpen={!!catalogConfirmModal}
        onClose={() => setCatalogConfirmModal(null)}
        title={catalogConfirmModal ? `${catalogConfirmModal.action.charAt(0).toUpperCase() + catalogConfirmModal.action.slice(1)} ${catalogConfirmModal.type === 'product' ? 'Product' : 'Service'}` : ''}
      >
        {catalogConfirmModal && (() => {
          const { type, action, item } = catalogConfirmModal;
          const isDanger = action === 'delete' || action === 'suspend';
          const name = type === 'product' ? (item as Product).name : (item as ServiceListing).name;
          const actionLabels: Record<string, string> = { delete: 'Delete', suspend: 'Suspend', activate: 'Activate', archive: 'Archive' };
          const descriptions: Record<string, string> = {
            delete: `This will permanently delete "${name}". This action cannot be undone.`,
            suspend: `This will set "${name}" to inactive. It will no longer be visible to customers.`,
            activate: `This will set "${name}" to active. It will be visible to customers again.`,
            archive: `This will archive "${name}". It will be removed from active listings.`,
          };
          return (
            <div className="space-y-4">
              <div className={`flex items-start gap-3 p-3 rounded-lg ${isDanger ? 'bg-red-50 border border-red-100' : 'bg-blue-50 border border-blue-100'}`}>
                <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${isDanger ? 'text-red-500' : 'text-blue-500'}`} />
                <p className={`text-sm ${isDanger ? 'text-red-700' : 'text-blue-700'}`}>{descriptions[action]}</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors" onClick={() => setCatalogConfirmModal(null)}>Cancel</button>
                <button
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${isDanger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-ruby-600 text-white hover:bg-ruby-700'}`}
                  onClick={handleCatalogConfirm}
                  disabled={catalogProcessing}
                >
                  {catalogProcessing ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {catalogProcessing ? 'Processing...' : actionLabels[action]}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// ─── Helper Components ───

/**
 * P119 — Phone cell for the main businesses table.
 *
 * Renders `contact.phone` as a tappable `tel:` link, with a small copy
 * icon that appears on hover for quick clipboard capture. If a secondary
 * phone (`contact.phone2`) is set, it's shown as a smaller second line.
 *
 * Empty state: em-dash. Click on either the link OR the copy icon stops
 * propagation so it doesn't accidentally open the row's detail modal.
 */
function PhoneCell({ phone, phone2 }: { phone?: string; phone2?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(
    async (e: React.MouseEvent, value: string) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success('Copied');
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // Private-browsing fallback — at least let the user know.
        toast.error('Copy failed — long-press to select');
      }
    },
    [],
  );
  if (!phone && !phone2) {
    return <span className="text-gray-300">—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {phone && (
        <div className="group inline-flex items-center gap-1.5">
          <a
            href={`tel:${phone}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline truncate"
            title={phone}
          >
            {phone}
          </a>
          <button
            type="button"
            onClick={(e) => copy(e, phone)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
            title={copied ? 'Copied' : 'Copy'}
          >
            <Copy className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      )}
      {phone2 && (
        <a
          href={`tel:${phone2}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] text-gray-500 hover:text-gray-700 hover:underline truncate"
          title={phone2}
        >
          {phone2}
        </a>
      )}
    </div>
  );
}

// ─── Branches Tab ───
function BranchesTab({
  businessId,
  isParent,
  onViewAllInTable,
}: {
  businessId: string;
  isParent: boolean;
  // P119-C1 — when set, the tab shows a "View all in main table" button
  // that closes the modal and deep-links to the businesses page filtered
  // to this brand's branches. Optional so non-deep-linkable contexts
  // (sibling-branches view) can omit it.
  onViewAllInTable?: () => void;
}) {
  const { data: branches, isLoading: loading, error } = useApi<Business[]>(
    () => api.businesses.getBranches(businessId),
    [businessId],
    { enabled: !!businessId }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-5 h-5 border-2 border-ruby-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-500 py-4">Failed to load branches: {error}</div>;
  }

  if (!branches?.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Store className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No branches found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {isParent ? 'Branch Locations' : 'Sibling Branches'}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{branches.length} branch(es)</span>
          {isParent && onViewAllInTable && (
            <button
              onClick={onViewAllInTable}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              title="Filter the main businesses table to these branches"
            >
              View all in main table
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {branches.map((branch: Business) => (
          <div key={branch._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {branch.branchLabel || branch.name}
                </span>
                <StatusBadge status={branch.status} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                {branch.address && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3" />
                    {typeof branch.address === 'object' ? [branch.address.street, branch.address.city].filter(Boolean).join(', ') || '—' : branch.address || '—'}
                  </span>
                )}
                {branch.catalogMode && (
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">
                    {branch.catalogMode}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-400">{formatDate(branch.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

// ─── Business Wallet Tab ──────────────────────────────────────
//
// Mirrors the customer-wallet UI on the customers admin page. The backend
// fund endpoint (`POST /admin/wallets/:id/fund`) is wallet-type-agnostic so
// this is a pure UI add — no new backend work. The wallet returned by
// `/admin/wallets/by-business/:businessId` may be lazily-created by the
// backend if the business has never had one before.

function BusinessWalletTab({
  businessId,
  businessName,
  refreshTick: externalRefreshTick,
  onOpenFundModal,
  onOpenDebitModal,
}: {
  businessId: string;
  businessName: string;
  /** Parent bumps this to force a refetch (e.g. after a successful fund). */
  refreshTick: number;
  onOpenFundModal: () => void;
  onOpenDebitModal: () => void;
}) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  // Local manual refresh tick — combines with externalRefreshTick so either
  // a parent-driven (post-fund) refresh or a user-driven (refresh button)
  // refresh re-runs the effects.
  const [localRefreshTick, setLocalRefreshTick] = useState(0);
  const refreshTick = externalRefreshTick + localRefreshTick;

  // Fetch the business's wallet. The backend lazily creates a new wallet on
  // first access if none exists, so we always get back at least an empty
  // wallet for a real business.
  //
  // The response shape is `{ success, data: Wallet[] }` from the API client's
  // request() helper — we MUST unwrap `res.data`, not iterate `res` directly.
  // Also defensive against the rare double-nested `{ data: { data: [] } }`
  // shape (mirrors the customers page's wallet fetch).
  useEffect(() => {
    let cancelled = false;
    setWalletLoading(true);
    setWalletError(null);
    api.businesses
      .getWallet(businessId)
      .then(res => {
        if (cancelled) return;
        const rawData = res.data;
        const wallets: Wallet[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray((rawData as any)?.data)
            ? (rawData as any).data
            : [];
        const primary = wallets.find(w => w.currency === 'NGN') || wallets[0] || null;
        setWallet(primary);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setWalletError(err instanceof Error ? err.message : 'Failed to load wallet');
      })
      .finally(() => {
        if (!cancelled) setWalletLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, refreshTick]);

  // Fetch the most recent 20 ledger entries for the wallet so the admin can
  // see what's been spent / credited at a glance. Manual refresh follows
  // any successful fund operation via `refreshTick`.
  useEffect(() => {
    if (!wallet?._id) return;
    let cancelled = false;
    setTxLoading(true);
    api.businesses
      .getWalletTransactions(wallet._id, { limit: 20 })
      .then(res => {
        if (cancelled) return;
        const rawData = res.data;
        const list: LedgerEntry[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray((rawData as any)?.data)
            ? (rawData as any).data
            : [];
        setTransactions(list);
      })
      .catch(() => {
        if (!cancelled) setTransactions([]);
      })
      .finally(() => {
        if (!cancelled) setTxLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wallet?._id, refreshTick]);

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-5 h-5 border-2 border-ruby-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (walletError || !wallet) {
    return (
      <div className="text-center py-8 text-gray-400">
        <WalletIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{walletError || 'No wallet found for this business.'}</p>
      </div>
    );
  }

  const isFrozen = wallet.status === 'FROZEN';

  return (
    <div className="space-y-5">
      {isFrozen && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            This wallet is frozen. Funding is disabled until the wallet is unfrozen.
          </p>
        </div>
      )}

      {/* Balance card */}
      <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">Business Wallet Balance</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{formatCurrency(wallet.balance, wallet.currency)}</p>
            <p className="text-[11px] text-emerald-500 mt-1">{wallet.status || 'ACTIVE'} · {wallet.currency}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDebitModal}
              disabled={isFrozen || (wallet.balance ?? 0) <= 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                isFrozen
                  ? 'Wallet is frozen'
                  : (wallet.balance ?? 0) <= 0
                    ? 'Wallet is empty — nothing to debit'
                    : 'Manually debit this wallet'
              }
            >
              <Minus className="w-4 h-4" /> Debit
            </button>
            <button
              onClick={onOpenFundModal}
              disabled={isFrozen}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Add Funds
            </button>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Recent Transactions</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Last {transactions.length} entries</p>
            </div>
          </div>
          <button
            onClick={() => setLocalRefreshTick(t => t + 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        <div className="mt-4">
          {txLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-2 bg-gray-50 rounded w-1/3" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No transactions yet for {businessName}.
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => {
                const isCredit = tx.direction === 'CREDIT';
                return (
                  <div
                    key={tx._id}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 text-left"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCredit ? 'bg-emerald-100' : 'bg-red-100'}`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">
                        {tx.description || tx.referenceType || tx.type}
                      </p>
                      <p className="text-[11px] text-gray-400">{formatDateTime(tx.createdAt)}</p>
                    </div>
                    <div className={`text-sm font-semibold ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCredit ? '+' : '-'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Fund Business Wallet Modal ──────────────────────────────
//
// Re-uses the same backend endpoint as the customer-wallet flow
// (POST /admin/wallets/:walletId/fund). Posts a DEPOSIT ledger entry that
// immediately credits the wallet and shows up in `recent transactions`.
// Audit-logged by the backend for any non-trivial reconciliation later.

function FundBusinessWalletModal({
  businessId,
  businessName,
  onClose,
  onSuccess,
}: {
  businessId: string;
  businessName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch the wallet inside the modal too — the BusinessWalletTab already has
  // it but we don't want to thread it through props if the user opened the
  // modal from a different entry-point in the future. Same response-unwrap
  // shape as BusinessWalletTab — `res.data` is the array, not `res` itself.
  useEffect(() => {
    let cancelled = false;
    api.businesses
      .getWallet(businessId)
      .then(res => {
        if (cancelled) return;
        const rawData = res.data;
        const wallets: Wallet[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray((rawData as any)?.data)
            ? (rawData as any).data
            : [];
        setWallet(wallets.find(w => w.currency === 'NGN') || wallets[0] || null);
      })
      .catch(() => {
        if (cancelled) return;
        setWallet(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingWallet(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) {
      toast.error('No wallet available');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      toast.error('Minimum amount is NGN 100');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.businesses.fundWallet(wallet._id, {
        amount: numAmount,
        currency: wallet.currency,
        description: description || `Admin funding for ${businessName}`,
      });
      toast.success(`Successfully funded ${formatCurrency(numAmount, wallet.currency)}`);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to fund wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Fund Business Wallet</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {loadingWallet ? (
          <div className="px-6 py-10 flex items-center justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-ruby-600 border-t-transparent rounded-full" />
          </div>
        ) : !wallet ? (
          <div className="px-6 py-6 text-sm text-gray-500 text-center">
            No wallet available for this business.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div className="text-xs text-gray-500">
              Funding wallet for <span className="font-semibold text-gray-700">{businessName}</span>
              <span className="ml-2">· Current balance: {formatCurrency(wallet.balance, wallet.currency)}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (NGN)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount (min 100)"
                min="100"
                step="1"
                required
                className="input-field"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={`Admin funding for ${businessName}`}
                className="input-field"
              />
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                This action immediately credits the business wallet and is audited.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Funding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Fund Wallet
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Debit Business Wallet Modal ──────────────────────────────
//
// Admin-only counterpart to FundBusinessWalletModal. Posts to
// `POST /admin/wallets/:walletId/debit`. Requires a reason string
// (charge-back, clawback, correction, etc.) that lands in the audit
// log AND the notification the business owner receives.
function DebitBusinessWalletModal({
  businessId,
  businessName,
  onClose,
  onSuccess,
}: {
  businessId: string;
  businessName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.businesses
      .getWallet(businessId)
      .then(res => {
        if (cancelled) return;
        const rawData = res.data;
        const wallets: Wallet[] = Array.isArray(rawData)
          ? rawData
          : Array.isArray((rawData as any)?.data)
            ? (rawData as any).data
            : [];
        setWallet(wallets.find(w => w.currency === 'NGN') || wallets[0] || null);
      })
      .catch(() => {
        if (cancelled) return;
        setWallet(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingWallet(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) {
      toast.error('No wallet available');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      toast.error('Minimum amount is NGN 100');
      return;
    }
    if (numAmount > wallet.balance) {
      toast.error(
        `Cannot debit ${formatCurrency(numAmount, wallet.currency)} — wallet only has ${formatCurrency(wallet.balance, wallet.currency)}.`,
      );
      return;
    }
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      toast.error('Please enter a clear reason (5+ characters).');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.businesses.debitWallet(wallet._id, {
        amount: numAmount,
        currency: wallet.currency,
        reason: trimmedReason,
      });
      toast.success(`Debited ${formatCurrency(numAmount, wallet.currency)} from ${businessName}`);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to debit wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Debit Business Wallet</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {loadingWallet ? (
          <div className="px-6 py-10 flex items-center justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-ruby-600 border-t-transparent rounded-full" />
          </div>
        ) : !wallet ? (
          <div className="px-6 py-6 text-sm text-gray-500 text-center">
            No wallet available for this business.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div className="text-xs text-gray-500">
              Debiting wallet for <span className="font-semibold text-gray-700">{businessName}</span>
              <span className="ml-2">· Current balance: {formatCurrency(wallet.balance, wallet.currency)}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (NGN)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount (min 100)"
                min="100"
                max={wallet.balance}
                step="1"
                required
                className="input-field"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Reversed fraudulent charge / Reclaim promotional credit"
                rows={3}
                required
                minLength={5}
                className="input-field resize-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Shown to the business owner in their notification and stored in the audit log.
              </p>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                This immediately removes funds from the business wallet. The business owner is notified and the action is audit-logged.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Debiting...
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4" /> Debit Wallet
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ContactItem({ icon: Icon, value, iconColor = 'text-gray-400' }: { icon: typeof Phone; value: string; iconColor?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
      <span className="truncate">{value}</span>
    </div>
  );
}

function CacBadge({ status }: { status?: string }) {
  if (!status) return null;
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    VERIFIED: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
  };
  const icons: Record<string, typeof ShieldCheck> = {
    PENDING: AlertTriangle,
    VERIFIED: ShieldCheck,
    REJECTED: ShieldX,
  };
  const Icon = icons[status] || AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${styles[status] || styles.PENDING}`}>
      <Icon className="w-2.5 h-2.5" />
      CAC {status}
    </span>
  );
}

/**
 * Pandago outlet status badge with conditional manual-register action.
 *
 * Visibility rules for the action button:
 *   - Legacy (`pandagoOutlet.isLegacy === true`) OR unclaimed
 *     (`isClaimed === false`) businesses: button is shown for
 *     NOT_REGISTERED / FAILED / STALE statuses.
 *   - Normal post-deploy claimed merchants: badge only, NO button. Those
 *     auto-register on admin approval; cron retries on failure.
 */
function PandagoBadge({
  business,
  onRegister,
  registering,
}: {
  business: Business;
  onRegister: (b: Business) => void;
  registering: boolean;
}) {
  const outlet = business.pandagoOutlet;
  const status = outlet?.status || 'NOT_REGISTERED';

  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700 border-green-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    FAILED: 'bg-red-50 text-red-700 border-red-200',
    STALE: 'bg-orange-50 text-orange-700 border-orange-200',
    NOT_REGISTERED: 'bg-gray-50 text-gray-500 border-gray-200',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    PENDING: 'Pending',
    FAILED: 'Failed',
    STALE: 'Stale',
    NOT_REGISTERED: 'Not registered',
  };

  const isManualEligible =
    outlet?.isLegacy === true || business.isClaimed === false;
  // P118 — claimed/non-legacy businesses normally hide the button (auto-
  // register owns the happy path). But a FAILED status means auto-register
  // has actually tripped — every admin should be able to retry it then,
  // regardless of legacy/claim status. The other two states (NOT_REGISTERED
  // / STALE) keep the original gate so admin can't pre-empt auto-register
  // / the cron sync.
  const showRegisterButton =
    (isManualEligible && (status === 'NOT_REGISTERED' || status === 'STALE')) ||
    status === 'FAILED';

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border w-fit ${styles[status] || styles.NOT_REGISTERED}`}
        title={
          status === 'FAILED' && outlet?.lastError
            ? `Last error: ${outlet.lastError}`
            : !isManualEligible && status !== 'ACTIVE'
              ? 'Auto-registers on admin approval. Cron retries on failure.'
              : undefined
        }
      >
        {labels[status] || status}
      </span>
      {/* Manual register / retry link. Visible for:
          - legacy + unclaimed businesses (auto-register only fires for
            claimed merchants), and
          - any FAILED business (P118 — admin recovery escape hatch after
            auto-register has tripped). The retry button is NOT a fix for
            the underlying Pandago auth issue — it just re-invokes the
            same registration path so the admin can verify recovery once
            the upstream cause is resolved off-platform. */}
      {showRegisterButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRegister(business);
          }}
          disabled={registering}
          className="text-[10px] font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 hover:underline w-fit"
        >
          {registering
            ? 'Registering…'
            : status === 'NOT_REGISTERED'
              ? 'Register'
              : status === 'FAILED'
                ? 'Retry'
                : 'Re-register'}
        </button>
      )}
      {status === 'FAILED' && outlet?.lastError && (
        <div className="text-[10px] text-red-600 truncate max-w-[140px]" title={outlet.lastError}>
          {outlet.lastError}
        </div>
      )}
    </div>
  );
}

// ─── Catalog Action Menu ───
function CatalogActionMenu({ item, type, onView, onEdit, onAction }: {
  item: Product | ServiceListing;
  type: 'product' | 'service';
  onView: () => void;
  onEdit: () => void;
  onAction: (action: 'delete' | 'suspend' | 'activate' | 'archive') => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const status = item.status;
  const isActive = status === 'ACTIVE';
  const isInactive = status === 'INACTIVE';

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 4, left: rect.right - 160 });
          }
          setOpen(!open);
        }}
        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div className="fixed w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-fade-in" style={{ top: pos.top, left: pos.left }}>
          <button onClick={() => { onView(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          {isActive && (
            <button onClick={() => { onAction('suspend'); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50">
              <Power className="w-3.5 h-3.5" /> Suspend
            </button>
          )}
          {(isInactive || status === 'DRAFT' || status === 'OUT_OF_STOCK') && (
            <button onClick={() => { onAction('activate'); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50">
              <Power className="w-3.5 h-3.5" /> Activate
            </button>
          )}
          {type === 'service' && status !== 'ARCHIVED' && (
            <button onClick={() => { onAction('archive'); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
          )}
          <button onClick={() => { onAction('delete'); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Catalog Detail Modal ───
function CatalogDetailContent({ type, item }: { type: 'product' | 'service'; item: Product | ServiceListing }) {
  if (type === 'product') {
    const p = item as Product;
    return (
      <div className="space-y-5">
        {/* Images */}
        {p.images && p.images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {p.images.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)).map((img, i) => (
              <div key={i} className={`relative rounded-lg overflow-hidden border ${img.isPrimary ? 'border-ruby-300 ring-2 ring-ruby-100' : 'border-gray-200'}`}>
                <img src={img.url} alt={img.alt || p.name} className="w-full h-20 object-cover" />
                {img.isPrimary && <span className="absolute top-1 left-1 text-[8px] bg-ruby-600 text-white px-1 py-0.5 rounded font-medium">PRIMARY</span>}
              </div>
            ))}
          </div>
        )}

        {/* Basic info */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</span><p className="text-sm font-medium text-gray-800 mt-0.5">{p.name}</p></div>
          <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</span><div className="mt-0.5"><StatusBadge status={p.status} /></div></div>
          <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Price</span><p className="text-sm font-medium text-gray-800 mt-0.5">{formatCurrency(p.basePrice)}{p.compareAtPrice ? <span className="ml-2 text-gray-400 line-through text-xs">{formatCurrency(p.compareAtPrice)}</span> : null}</p></div>
          {p.category && <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category</span><p className="text-sm font-medium text-gray-800 mt-0.5">{p.category}</p></div>}
          {p.sku && <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">SKU</span><p className="text-sm font-mono text-gray-800 mt-0.5">{p.sku}</p></div>}
          {p.trackInventory && <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Stock</span><p className={`text-sm font-medium mt-0.5 ${p.stockQuantity > 0 ? 'text-green-700' : 'text-red-600'}`}>{p.stockQuantity} units</p></div>}
          <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Available</span><p className="text-sm font-medium text-gray-800 mt-0.5">{p.isAvailable ? 'Yes' : 'No'}</p></div>
          <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Stats</span><p className="text-sm text-gray-800 mt-0.5">{p.orderCount} orders, {p.viewCount} views</p></div>
        </div>

        {p.description && (
          <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</span><p className="text-sm text-gray-600 mt-1">{p.description}</p></div>
        )}

        {/* Variations */}
        {p.variations && p.variations.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Variations ({p.variations.length})</span>
            <div className="space-y-2">
              {p.variations.map((v, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium text-gray-800">{v.name}</span>
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{v.type}</span>
                    {v.required && <span className="text-[10px] bg-ruby-100 text-ruby-600 px-1.5 py-0.5 rounded">Required</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {v.options.map((opt, j) => (
                      <span key={j} className={`text-xs px-2 py-1 rounded-md border ${opt.isAvailable ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-100 border-gray-200 text-gray-400 line-through'}`}>
                        {opt.name}{opt.priceAdjustment ? ` (+${formatCurrency(opt.priceAdjustment)})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons */}
        {p.addOns && p.addOns.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Add-ons ({p.addOns.length})</span>
            <div className="flex flex-wrap gap-2">
              {p.addOns.map((a, i) => (
                <span key={i} className={`text-xs px-2.5 py-1.5 rounded-lg border ${a.isAvailable ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-100 text-gray-400 line-through border-gray-200'}`}>
                  {a.name} — {formatCurrency(a.price)}{a.maxQuantity > 1 ? ` (max ${a.maxQuantity})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {p.tags && p.tags.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Tags</span>
            <div className="flex flex-wrap gap-1.5">{p.tags.map(t => <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>)}</div>
          </div>
        )}

        {/* Nutritional info */}
        {p.nutritionalInfo && (p.nutritionalInfo.calories || p.nutritionalInfo.protein) && (
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Nutritional Info</span>
            <div className="grid grid-cols-4 gap-2">
              {p.nutritionalInfo.calories !== undefined && <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-xs text-gray-500">Calories</p><p className="text-sm font-medium">{p.nutritionalInfo.calories}</p></div>}
              {p.nutritionalInfo.protein !== undefined && <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-xs text-gray-500">Protein</p><p className="text-sm font-medium">{p.nutritionalInfo.protein}g</p></div>}
              {p.nutritionalInfo.carbs !== undefined && <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-xs text-gray-500">Carbs</p><p className="text-sm font-medium">{p.nutritionalInfo.carbs}g</p></div>}
              {p.nutritionalInfo.fat !== undefined && <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-xs text-gray-500">Fat</p><p className="text-sm font-medium">{p.nutritionalInfo.fat}g</p></div>}
            </div>
            {p.nutritionalInfo.allergens && p.nutritionalInfo.allergens.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-red-600 font-semibold">ALLERGENS:</span>
                {p.nutritionalInfo.allergens.map(a => <span key={a} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{a}</span>)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Service detail
  const s = item as ServiceListing;
  const priceText = s.pricing?.type === 'QUOTE_REQUIRED' ? 'Quote Required' : s.pricing?.type === 'STARTS_FROM' ? `From ${formatCurrency(s.pricing.basePrice || 0)}` : formatCurrency(s.pricing?.basePrice || 0);
  const dur = s.duration?.minutes;
  const durText = dur ? `${dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 ? ` ${dur % 60}m` : ''}` : `${dur}m`}${s.duration?.isFlexible ? ' (flexible)' : ''}` : '—';

  return (
    <div className="space-y-5">
      {/* Media */}
      {((s.media && s.media.length > 0) || s.coverImageUrl) && (
        <div className="grid grid-cols-4 gap-2">
          {s.coverImageUrl && <img src={s.coverImageUrl} alt={s.name} className="w-full h-20 object-cover rounded-lg border border-gray-200" />}
          {s.media?.map((m, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-gray-200">
              <img src={m.url} alt={m.caption || s.name} className="w-full h-20 object-cover" />
              {m.type === 'VIDEO' && <span className="absolute top-1 left-1 text-[8px] bg-black/60 text-white px-1 py-0.5 rounded">VIDEO</span>}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</span><p className="text-sm font-medium text-gray-800 mt-0.5">{s.name}</p></div>
        <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</span><div className="mt-0.5"><StatusBadge status={s.status} /></div></div>
        <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Price</span><p className="text-sm font-medium text-gray-800 mt-0.5">{priceText}</p></div>
        <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Duration</span><p className="text-sm font-medium text-gray-800 mt-0.5">{durText}</p></div>
        <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fulfillment</span><p className="text-sm font-medium text-gray-800 mt-0.5">{s.fulfillmentMode?.replace(/_/g, ' ') || 'ON SITE'}</p></div>
        {s.pricing?.depositPercent > 0 && <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Deposit</span><p className="text-sm font-medium text-gray-800 mt-0.5">{s.pricing.depositPercent}%</p></div>}
        <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Stats</span><p className="text-sm text-gray-800 mt-0.5">{s.totalBookings} bookings, {s.viewCount} views, {s.averageRating?.toFixed(1) || '0'} rating ({s.totalReviews} reviews)</p></div>
      </div>

      {s.description && (
        <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</span><p className="text-sm text-gray-600 mt-1">{s.description}</p></div>
      )}

      {/* Availability */}
      {s.availability && s.availability.length > 0 && (
        <div>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Availability</span>
          <div className="space-y-1">
            {s.availability.filter(a => a.isAvailable).map(a => (
              <div key={a.dayOfWeek} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                <span className="font-medium text-gray-700 w-24">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][a.dayOfWeek]}</span>
                <span className="text-gray-600">{a.slots?.join(', ') || '—'}</span>
                <span className="text-xs text-gray-400">cap: {a.capacityPerSlot}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancellation */}
      {s.cancellationPolicy && (s.cancellationPolicy.freeCancellationHours || s.cancellationPolicy.cancellationFeePercent) && (
        <div className="bg-amber-50 rounded-lg p-3">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Cancellation Policy</span>
          <p className="text-sm text-amber-700 mt-1">
            Free cancellation up to {s.cancellationPolicy.freeCancellationHours || 0}h before.
            {s.cancellationPolicy.cancellationFeePercent ? ` Late cancellation fee: ${s.cancellationPolicy.cancellationFeePercent}%` : ''}
          </p>
        </div>
      )}

      {/* Requirements / Includes / Excludes */}
      {s.requirements && s.requirements.length > 0 && (
        <div><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Requirements</span>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">{s.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
      )}
      {s.includes && s.includes.length > 0 && (
        <div><span className="text-[11px] font-semibold text-green-600 uppercase tracking-wider mb-1 block">Includes</span>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">{s.includes.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
      )}
      {s.excludes && s.excludes.length > 0 && (
        <div><span className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-1 block">Excludes</span>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">{s.excludes.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
      )}

      {s.tags && s.tags.length > 0 && (
        <div>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Tags</span>
          <div className="flex flex-wrap gap-1.5">{s.tags.map(t => <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>)}</div>
        </div>
      )}
    </div>
  );
}

// ─── Catalog Edit Product Form ───
function CatalogEditProductForm({ product, isSubmitting, onCancel, onSubmit }: {
  product: Product;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: UpdateProductRequest) => void;
}) {
  const [form, setForm] = useState({
    name: product.name,
    description: product.description || '',
    basePrice: product.basePrice,
    compareAtPrice: product.compareAtPrice || 0,
    category: product.category || '',
    status: product.status as ProductStatus,
    isAvailable: product.isAvailable,
    isFeatured: product.isFeatured,
    stockQuantity: product.stockQuantity,
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</label>
        <input className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</label>
        <textarea className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 resize-none" rows={3} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Base Price (NGN)</label>
          <input type="number" min={0} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.basePrice} onChange={(e) => setForm(f => ({ ...f, basePrice: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Compare Price</label>
          <input type="number" min={0} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.compareAtPrice || ''} onChange={(e) => setForm(f => ({ ...f, compareAtPrice: parseFloat(e.target.value) || 0 }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category</label>
          <input className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</label>
          <select className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as ProductStatus }))}>
            {['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>
      {product.trackInventory && (
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Stock Quantity</label>
          <input type="number" min={0} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.stockQuantity} onChange={(e) => setForm(f => ({ ...f, stockQuantity: parseInt(e.target.value) || 0 }))} />
        </div>
      )}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm(f => ({ ...f, isAvailable: e.target.checked }))} className="rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
          Available
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm(f => ({ ...f, isFeatured: e.target.checked }))} className="rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
          Featured
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors" onClick={onCancel}>Cancel</button>
        <button
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-ruby-600 text-white hover:bg-ruby-700 transition-colors disabled:opacity-50"
          onClick={() => {
            const data: UpdateProductRequest = {};
            if (form.name !== product.name) data.name = form.name;
            if (form.description !== (product.description || '')) data.description = form.description;
            if (form.basePrice !== product.basePrice) data.basePrice = form.basePrice;
            if (form.compareAtPrice && form.compareAtPrice !== product.compareAtPrice) data.compareAtPrice = form.compareAtPrice;
            if (form.category !== (product.category || '')) data.category = form.category;
            if (form.status !== product.status) data.status = form.status;
            if (form.isAvailable !== product.isAvailable) data.isAvailable = form.isAvailable;
            if (form.isFeatured !== product.isFeatured) data.isFeatured = form.isFeatured;
            if (form.stockQuantity !== product.stockQuantity) data.stockQuantity = form.stockQuantity;
            onSubmit(data);
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Catalog Edit Service Form ───
function CatalogEditServiceForm({ service, isSubmitting, onCancel, onSubmit }: {
  service: ServiceListing;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: UpdateServiceRequest) => void;
}) {
  const [form, setForm] = useState({
    name: service.name,
    description: service.description || '',
    pricingType: service.pricing?.type || 'FIXED',
    basePrice: service.pricing?.basePrice || 0,
    depositPercent: service.pricing?.depositPercent || 0,
    durationMinutes: service.duration?.minutes || 60,
    isFlexible: service.duration?.isFlexible || false,
    fulfillmentMode: service.fulfillmentMode || 'ON_SITE',
    status: service.status as ServiceStatus,
    isFeatured: service.isFeatured,
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</label>
        <input className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</label>
        <textarea className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 resize-none" rows={3} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Pricing Type</label>
          <select className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.pricingType} onChange={(e) => setForm(f => ({ ...f, pricingType: e.target.value as PricingType }))}>
            <option value="FIXED">Fixed</option>
            <option value="STARTS_FROM">Starts From</option>
            <option value="QUOTE_REQUIRED">Quote Required</option>
          </select>
        </div>
        {form.pricingType !== 'QUOTE_REQUIRED' && (
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Price (NGN)</label>
            <input type="number" min={0} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.basePrice} onChange={(e) => setForm(f => ({ ...f, basePrice: parseFloat(e.target.value) || 0 }))} />
          </div>
        )}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Deposit %</label>
          <input type="number" min={0} max={100} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.depositPercent} onChange={(e) => setForm(f => ({ ...f, depositPercent: parseInt(e.target.value) || 0 }))} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Duration (min)</label>
          <input type="number" min={1} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.durationMinutes} onChange={(e) => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 0 }))} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fulfillment</label>
          <select className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.fulfillmentMode} onChange={(e) => setForm(f => ({ ...f, fulfillmentMode: e.target.value as ServiceFulfillmentMode }))}>
            <option value="ON_SITE">On Site</option>
            <option value="AT_HOME">At Home</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</label>
          <select className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as ServiceStatus }))}>
            {['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isFlexible} onChange={(e) => setForm(f => ({ ...f, isFlexible: e.target.checked }))} className="rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
          Flexible Duration
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm(f => ({ ...f, isFeatured: e.target.checked }))} className="rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
          Featured
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors" onClick={onCancel}>Cancel</button>
        <button
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-ruby-600 text-white hover:bg-ruby-700 transition-colors disabled:opacity-50"
          onClick={() => {
            const data: UpdateServiceRequest = {};
            if (form.name !== service.name) data.name = form.name;
            if (form.description !== (service.description || '')) data.description = form.description;
            const pricingChanged = form.pricingType !== service.pricing?.type || form.basePrice !== (service.pricing?.basePrice || 0) || form.depositPercent !== (service.pricing?.depositPercent || 0);
            if (pricingChanged) {
              data.pricing = { type: form.pricingType as 'FIXED' | 'STARTS_FROM' | 'QUOTE_REQUIRED', basePrice: form.basePrice, depositPercent: form.depositPercent };
            }
            const durationChanged = form.durationMinutes !== (service.duration?.minutes || 60) || form.isFlexible !== (service.duration?.isFlexible || false);
            if (durationChanged) {
              data.duration = { minutes: form.durationMinutes, isFlexible: form.isFlexible };
            }
            if (form.fulfillmentMode !== service.fulfillmentMode) data.fulfillmentMode = form.fulfillmentMode as 'ON_SITE' | 'AT_HOME' | 'BOTH';
            if (form.status !== service.status) data.status = form.status;
            if (form.isFeatured !== service.isFeatured) data.isFeatured = form.isFeatured;
            onSubmit(data);
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Gallery Uploader (multi-image) ───
/**
 * Multi-image gallery uploader used by Create + Edit business modals.
 * Mirrors the business-app pattern: up to 8 gallery images, separate from
 * the single logoUrl + coverImageUrl fields. Persists as `media: BusinessMediaItem[]`.
 */
function BusinessGalleryUploader({
  value,
  onChange,
  max = 8,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = ''; // reset so same file can be re-picked

    const remaining = max - value.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${max} gallery images`);
      return;
    }
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.warning(`Only ${remaining} more allowed; first ${remaining} taken`);
    }

    setUploading(true);
    const uploaded: string[] = [];
    for (const file of toUpload) {
      try {
        const res = await api.media.upload(file, 'businesses/gallery');
        if (res.data?.url) uploaded.push(res.data.url);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        toast.error(`${file.name}: ${msg}`);
      }
    }
    setUploading(false);
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Gallery
        </label>
        <span className="text-[11px] text-gray-400">{value.length}/{max}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {value.map((url, idx) => (
          <div key={`${url}-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden ring-1 ring-gray-200 bg-gray-50">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              className="absolute top-1 right-1 p-1 rounded-full bg-white/90 shadow-sm text-gray-600 hover:text-red-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => !uploading && inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100/50 transition-all flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 text-ruby-500 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] text-gray-400 mt-0.5">Add</span>
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">
        Up to {max} images shown on the public profile. JPEG, PNG, WebP — max 5MB each.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  );
}

// ─── Create Business Modal ───
function CreateBusinessModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AdminCreateBusinessRequest) => void;
  isSubmitting: boolean;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    description: '',
    tagline: '',
    locationId: '',
    categoryId: '',
    subcategoryId: '',
    longitude: 0,
    latitude: 0,
    logoUrl: '',
    coverImageUrl: '',
    gallery: [] as string[],
    claimContactPhone: '',
    claimContactEmail: '',
    address: { street: '', city: '', state: '' } as { street: string; city: string; state: string },
    contact: { phone: '', email: '', whatsapp: '' } as { phone: string; email: string; whatsapp: string },
  });

  // Fetch locations, categories, subcategories
  const { data: locations } = useApi<Location[]>(() => api.locations.list({ limit: 100 }), []);
  const { data: categories } = useApi<Category[]>(() => api.categories.list(), []);
  const { data: subcategories } = useApi<Subcategory[]>(
    () => form.categoryId ? api.subcategories.list({ categoryId: form.categoryId }) : Promise.resolve({ success: true, data: [] }),
    [form.categoryId]
  );

  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name || !form.locationId || !form.categoryId || !form.subcategoryId) {
      toast.error('Please fill in all required fields');
      return;
    }
    const data: AdminCreateBusinessRequest = {
      name: form.name,
      locationId: form.locationId,
      categoryId: form.categoryId,
      subcategoryId: form.subcategoryId,
      longitude: form.longitude || 3.3792,
      latitude: form.latitude || 6.5244,
    };
    if (form.description) data.description = form.description;
    if (form.tagline) data.tagline = form.tagline;
    if (form.logoUrl) data.logoUrl = form.logoUrl;
    if (form.coverImageUrl) data.coverImageUrl = form.coverImageUrl;
    if (form.gallery.length > 0) {
      data.media = form.gallery.map((url, idx) => ({
        url,
        type: 'IMAGE',
        order: idx,
        isPrimary: false,
      }));
    }
    if (form.claimContactPhone) data.claimContactPhone = form.claimContactPhone;
    if (form.claimContactEmail) data.claimContactEmail = form.claimContactEmail;
    if (form.address.street) data.address = form.address;
    if (form.contact.phone || form.contact.email) data.contact = form.contact;
    onSubmit(data);
  };

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setForm({
        name: '', description: '', tagline: '', locationId: '', categoryId: '', subcategoryId: '',
        longitude: 0, latitude: 0, logoUrl: '', coverImageUrl: '', gallery: [],
        claimContactPhone: '', claimContactEmail: '',
        address: { street: '', city: '', state: '' },
        contact: { phone: '', email: '', whatsapp: '' },
      });
    }
  }, [isOpen]);

  const steps = ['Basic Info', 'Location & Category', 'Contact & Claim'];
  const canNext = step === 0 ? !!form.name : step === 1 ? !!(form.locationId && form.categoryId && form.subcategoryId) : true;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Business" subtitle="Create a business profile for a merchant" size="lg">
      <div className="space-y-5">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  i === step ? 'bg-ruby-600 text-white' : i < step ? 'bg-green-100 text-green-700 cursor-pointer' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {i < step ? <CheckCircle className="w-3 h-3" /> : null}
                {s}
              </button>
              {i < steps.length - 1 && <ChevronDown className="w-3 h-3 text-gray-300 -rotate-90" />}
            </div>
          ))}
        </div>

        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Business Name *</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Mama's Kitchen"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</label>
              <textarea
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 resize-none"
                rows={3}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Brief description of the business"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tagline</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.tagline}
                onChange={(e) => update('tagline', e.target.value)}
                placeholder="Short tagline"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ImageUpload
                value={form.logoUrl}
                onChange={(url) => update('logoUrl', url || '')}
                folder="businesses/logos"
                label="Logo"
                helpText="Square image recommended"
                maxSizeMB={2}
              />
              <ImageUpload
                value={form.coverImageUrl}
                onChange={(url) => update('coverImageUrl', url || '')}
                folder="businesses/covers"
                label="Cover Image"
                helpText="Landscape image recommended"
                maxSizeMB={5}
              />
            </div>
            <BusinessGalleryUploader
              value={form.gallery}
              onChange={(urls) => update('gallery', urls)}
            />
          </div>
        )}

        {/* Step 1: Location & Category */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Location *</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.locationId}
                onChange={(e) => update('locationId', e.target.value)}
              >
                <option value="">Select location</option>
                {(locations || []).map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category *</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.categoryId}
                onChange={(e) => { update('categoryId', e.target.value); update('subcategoryId', ''); }}
              >
                <option value="">Select category</option>
                {(categories || []).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Subcategory *</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.subcategoryId}
                onChange={(e) => update('subcategoryId', e.target.value)}
                disabled={!form.categoryId}
              >
                <option value="">Select subcategory</option>
                {(subcategories || []).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Pin Business Location</label>
              <p className="text-xs text-gray-400 mt-0.5 mb-2">Search for an address or click on the map to set the exact location</p>
              <MapLocationPicker
                latitude={form.latitude || 6.5244}
                longitude={form.longitude || 3.3792}
                onLocationChange={(lat, lng) => {
                  update('latitude', lat);
                  update('longitude', lng);
                }}
                onAddressResolved={(addr) => {
                  if (!form.address.street && addr.street) {
                    setForm(f => ({
                      ...f,
                      address: {
                        ...f.address,
                        street: addr.street || f.address.street,
                        city: addr.city || f.address.city,
                        state: addr.state || f.address.state,
                      },
                    }));
                  }
                }}
                height="280px"
                countryCode="ng"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Street Address</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.address.street}
                onChange={(e) => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))}
                placeholder="123 Main Street"
              />
            </div>
          </div>
        )}

        {/* Step 2: Contact & Claim */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                A unique <strong>claim code</strong> will be auto-generated. Share it with the merchant so they can claim ownership of this business.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Merchant Phone</label>
                <input
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                  value={form.claimContactPhone}
                  onChange={(e) => update('claimContactPhone', e.target.value)}
                  placeholder="+234..."
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Merchant Email</label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                  value={form.claimContactEmail}
                  onChange={(e) => update('claimContactEmail', e.target.value)}
                  placeholder="merchant@email.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Business Phone</label>
                <input
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                  value={form.contact.phone}
                  onChange={(e) => setForm(f => ({ ...f, contact: { ...f.contact, phone: e.target.value } }))}
                  placeholder="+234..."
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Business Email</label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                  value={form.contact.email}
                  onChange={(e) => setForm(f => ({ ...f, contact: { ...f.contact, email: e.target.value } }))}
                  placeholder="business@email.com"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">WhatsApp</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.contact.whatsapp}
                onChange={(e) => setForm(f => ({ ...f, contact: { ...f.contact, whatsapp: e.target.value } }))}
                placeholder="+234..."
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2 border-t border-gray-100">
          <button
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 2 ? (
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 transition-colors disabled:opacity-50"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
            >
              Next
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 transition-colors disabled:opacity-50"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Business
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * Admin "Edit Business" multi-step modal.
 *
 * Restored from commit 6678be7 — was accidentally removed during the
 * multi-branch refactor (commit 7c840f6) along with its action-dropdown
 * entry. Backend endpoint (PUT /admin/businesses/:id via
 * api.businesses.adminUpdate) was untouched, so this is a pure UI restore.
 *
 * Three-step flow:
 *   0. Basic info — name, description, tagline, logo + cover images
 *   1. Location & category — location, category/subcategory, map pin, street
 *   2. Contact & claim — merchant contact (for unclaimed) + business contact
 */
function EditBusinessModal({
  business,
  onClose,
  onSubmit,
}: {
  business: Business;
  onClose: () => void;
  onSubmit: (data: Partial<AdminCreateBusinessRequest>) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: business.name || '',
    description: business.description || '',
    tagline: business.tagline || '',
    locationId: toLocationId(business.locationId as any) || '',
    categoryId: typeof (business as any).categoryId === 'object' ? (business as any).categoryId?._id || '' : (business as any).categoryId || '',
    subcategoryId: typeof (business as any).subcategoryId === 'object' ? (business as any).subcategoryId?._id || '' : (business as any).subcategoryId || '',
    longitude: (business as any).longitude || 3.3792,
    latitude: (business as any).latitude || 6.5244,
    logoUrl: business.logoUrl || '',
    coverImageUrl: business.coverImageUrl || '',
    // Gallery is the `media[]` array minus anything that looks like the
    // logo/cover (so we don't double-render them as gallery thumbs).
    gallery: ((business.media || []) as any[])
      .filter((m) =>
        typeof m === 'object' &&
        m.url &&
        m.type !== 'VIDEO' &&
        !m.isPrimary &&
        m.url !== business.logoUrl &&
        m.url !== business.coverImageUrl,
      )
      .map((m) => m.url as string),
    claimContactPhone: (business as any).claimContactPhone || '',
    claimContactEmail: (business as any).claimContactEmail || '',
    // `address` is typed as string | BusinessAddress on the shared Business
    // interface — cast to `any` since admin pages always get the structured
    // form back, never a flat string.
    address: {
      street: (business.address as any)?.street || '',
      city: (business.address as any)?.city || '',
      state: (business.address as any)?.state || '',
    },
    contact: {
      phone: business.contact?.phone || '',
      email: business.contact?.email || '',
      whatsapp: business.contact?.whatsapp || '',
    },
  });

  const { data: locations } = useApi<Location[]>(() => api.locations.list({ limit: 100 }), []);
  const { data: categories } = useApi<Category[]>(() => api.categories.list(), []);
  const { data: subcategories } = useApi<Subcategory[]>(
    () => form.categoryId ? api.subcategories.list({ categoryId: form.categoryId }) : Promise.resolve({ success: true, data: [] }),
    [form.categoryId]
  );

  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.name) { toast.error('Business name is required'); return; }
    setSubmitting(true);
    try {
      // Strip the local-only `gallery` field and translate it into the
      // backend's `media[]` shape. Sending `[]` is intentional — that lets
      // admins clear the gallery on edit.
      const { gallery, ...rest } = form;
      const data: any = { ...rest };
      data.media = gallery.map((url, idx) => ({
        url,
        type: 'IMAGE',
        order: idx,
        isPrimary: false,
      }));
      if (data.address && !data.address.street) delete data.address;
      if (data.contact && !data.contact.phone && !data.contact.email) delete data.contact;
      await onSubmit(data);
    } catch {
      toast.error('Failed to update business');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ['Basic Info', 'Location & Category', 'Contact & Claim'];

  return (
    <Modal isOpen onClose={onClose} title={`Edit: ${business.name}`} subtitle="Update business details" size="lg">
      <div className="space-y-5">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  i === step ? 'bg-ruby-600 text-white' : 'bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
              {i < steps.length - 1 && <ChevronDown className="w-3 h-3 text-gray-300 -rotate-90" />}
            </div>
          ))}
        </div>

        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Business Name *</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Mama's Kitchen"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</label>
              <textarea
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 resize-none"
                rows={3}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Brief description of the business"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tagline</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.tagline}
                onChange={(e) => update('tagline', e.target.value)}
                placeholder="Short tagline"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ImageUpload
                value={form.logoUrl}
                onChange={(url) => update('logoUrl', url || '')}
                folder="businesses/logos"
                label="Logo"
                helpText="Square image recommended"
                maxSizeMB={2}
              />
              <ImageUpload
                value={form.coverImageUrl}
                onChange={(url) => update('coverImageUrl', url || '')}
                folder="businesses/covers"
                label="Cover Image"
                helpText="Landscape image recommended"
                maxSizeMB={5}
              />
            </div>
            <BusinessGalleryUploader
              value={form.gallery}
              onChange={(urls) => update('gallery', urls)}
            />
          </div>
        )}

        {/* Step 1: Location & Category */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Location</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.locationId}
                onChange={(e) => update('locationId', e.target.value)}
              >
                <option value="">Select location</option>
                {(locations || []).map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.categoryId}
                onChange={(e) => { update('categoryId', e.target.value); update('subcategoryId', ''); }}
              >
                <option value="">Select category</option>
                {(categories || []).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Subcategory</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.subcategoryId}
                onChange={(e) => update('subcategoryId', e.target.value)}
                disabled={!form.categoryId}
              >
                <option value="">Select subcategory</option>
                {(subcategories || []).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Pin Business Location</label>
              <p className="text-xs text-gray-400 mt-0.5 mb-2">Search for an address or click on the map to set the exact location</p>
              <MapLocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onLocationChange={(lat, lng) => {
                  update('latitude', lat);
                  update('longitude', lng);
                }}
                onAddressResolved={(addr) => {
                  setForm(f => ({
                    ...f,
                    address: {
                      ...f.address,
                      street: addr.street || f.address.street,
                      city: addr.city || f.address.city,
                      state: addr.state || f.address.state,
                    },
                  }));
                }}
                height="280px"
                countryCode="ng"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Street Address</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.address.street}
                onChange={(e) => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))}
                placeholder="123 Main Street"
              />
            </div>
          </div>
        )}

        {/* Step 2: Contact & Claim */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Merchant Phone</label>
                <input
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                  value={form.claimContactPhone}
                  onChange={(e) => update('claimContactPhone', e.target.value)}
                  placeholder="+234..."
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Merchant Email</label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                  value={form.claimContactEmail}
                  onChange={(e) => update('claimContactEmail', e.target.value)}
                  placeholder="merchant@email.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Business Phone</label>
                <input
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                  value={form.contact.phone}
                  onChange={(e) => setForm(f => ({ ...f, contact: { ...f.contact, phone: e.target.value } }))}
                  placeholder="+234..."
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Business Email</label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                  value={form.contact.email}
                  onChange={(e) => setForm(f => ({ ...f, contact: { ...f.contact, email: e.target.value } }))}
                  placeholder="business@email.com"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">WhatsApp</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                value={form.contact.whatsapp}
                onChange={(e) => setForm(f => ({ ...f, contact: { ...f.contact, whatsapp: e.target.value } }))}
                placeholder="+234..."
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2 border-t border-gray-100">
          <button
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          {step < steps.length - 1 ? (
            <button
              className="px-5 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700 transition-colors"
              onClick={() => setStep(s => s + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              className="px-5 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
