'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Store, Search, CheckCircle, XCircle, Ban, Eye, MapPin, Clock,
  Phone, Mail, Globe, Star, ShieldCheck, ShieldX, RotateCcw, RefreshCw,
  FileText, ExternalLink, AlertTriangle, MoreHorizontal, ChevronDown, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, StatCard, type Column } from '@/components/ui';
import type {
  Business, BusinessFilterParams, BusinessStatus, BusinessStats, VerifyCacRequest,
  BusinessMediaItem, BusinessHoursEntry, BusinessAddress,
} from '@/lib/types';
import { formatDate, formatCurrency, toLocationId, getOwnerName, getOwnerEmail, getCategoryName, getSubcategoryName, getLocationName } from '@/lib/utils';

const STATUS_OPTIONS: BusinessStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'LIVE', 'REJECTED', 'SUSPENDED'];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type ActionType = 'approve' | 'reject' | 'suspend' | 'reinstate' | 'verify-cac' | 'reject-cac' | 'feature' | 'delete' | 'update-status';

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
  ];

  if (business.status === 'PENDING_REVIEW') {
    items.push(
      { label: 'Approve', icon: CheckCircle, action: () => { onAction(business, 'approve'); setOpen(false); }, variant: 'success' },
      { label: 'Reject', icon: XCircle, action: () => { onAction(business, 'reject'); setOpen(false); }, variant: 'danger' },
    );
  }
  if (business.status === 'APPROVED' || business.status === 'LIVE') {
    items.push({ label: 'Suspend', icon: Ban, action: () => { onAction(business, 'suspend'); setOpen(false); }, variant: 'danger' });
  }
  if (business.status === 'SUSPENDED') {
    items.push({ label: 'Reinstate', icon: RotateCcw, action: () => { onAction(business, 'reinstate'); setOpen(false); }, variant: 'success' });
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
  const [filters, setFilters] = useState<BusinessFilterParams>({
    page: 1,
    limit: 20,
    ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1 ? { locationId: toLocationId(admin.locationIds[0]) } : {}),
  });
  const [search, setSearch] = useState('');
  const [detailBusiness, setDetailBusiness] = useState<Business | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'media' | 'cac' | 'hours'>('info');
  const [actionModal, setActionModal] = useState<{ business: Business; action: ActionType } | null>(null);
  const [reason, setReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<BusinessStatus>('PENDING_REVIEW');

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

  // Mutations
  const showError = useCallback((message: string) => toast.error(message), []);
  const mutationOpts = { onError: showError };
  const { mutate: approveBusiness, isLoading: approving } = useMutation(
    ({ id, data }: { id: string; data?: { notes?: string } }) => api.businesses.approve(id, data), mutationOpts
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

  const isProcessing = approving || rejecting || suspending || reinstating || verifyingCac || featuring || deleting;

  // Fetch full detail
  const { data: fullDetail, isLoading: loadingDetail, error: detailError } = useApi<Business>(
    () => detailBusiness ? api.businesses.get(detailBusiness._id) : Promise.resolve({ success: true, data: detailBusiness! }),
    [detailBusiness?._id],
  );

  const displayBusiness = fullDetail || detailBusiness;

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
      if (detailBusiness?._id === business._id) {
        setDetailBusiness(null);
      }
    }
    // Error toasts are handled automatically by the onError callback in each mutation
  }, [actionModal, reason, selectedStatus, approveBusiness, rejectBusiness, suspendBusiness, reinstateBusiness, verifyCac, featureBusiness, deleteBusiness, refetch, detailBusiness]);

  const openAction = (business: Business, action: ActionType) => {
    setActionModal({ business, action });
    setReason('');
    if (action === 'update-status') {
      setSelectedStatus(business.status as BusinessStatus);
    }
  };

  const getActionConfig = (action: ActionType) => {
    const configs: Record<ActionType, { title: string; description: (name: string) => string; label: string; variant: 'primary' | 'danger'; icon: typeof CheckCircle }> = {
      approve: {
        title: 'Approve Business',
        description: (name) => `Approve "${name}"? The business owner will be able to go live.`,
        label: 'Approve',
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
    };
    return configs[action];
  };

  const needsReason = (action: ActionType) => ['reject', 'suspend', 'reject-cac'].includes(action);

  // ─── Table columns ───
  const columns: Column<Business>[] = [
    {
      key: 'name',
      header: 'Business',
      render: (b) => (
        <div className="flex items-center gap-3">
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
            </div>
            <div className="text-xs text-gray-500 truncate">{getCategoryName(b.categoryId) || 'Uncategorized'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => (
        <div className="flex flex-col gap-1.5">
          <StatusBadge status={b.status} />
          {b.cacDocumentUrl && (
            <CacBadge status={b.cacDocumentStatus} />
          )}
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (b) => {
        const name = getOwnerName(b.ownerId);
        const email = getOwnerEmail(b.ownerId);
        return (
          <div className="min-w-0">
            <div className="text-sm text-gray-700 font-medium truncate">{name || 'Unknown'}</div>
            {email && <div className="text-xs text-gray-400 truncate">{email}</div>}
          </div>
        );
      },
    },
    {
      key: 'location',
      header: 'Location',
      render: (b) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{getLocationName(b.locationId) || '—'}</span>
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (b) => <span className="text-sm text-gray-500">{formatDate(b.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (b) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setDetailBusiness(b); setDetailTab('info'); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4 text-gray-400" />
          </button>
          <ActionDropdown
            business={b}
            onAction={openAction}
            onView={(biz) => { setDetailBusiness(biz); setDetailTab('info'); }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Businesses"
        description="Review and manage business applications"
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

      {/* Filters */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 transition-colors placeholder:text-gray-400"
              placeholder="Search businesses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          {stats && stats.pendingReview > 0 && filters.status !== 'PENDING_REVIEW' && (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              onClick={() => setFilters(f => ({ ...f, status: 'PENDING_REVIEW', page: 1 }))}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {stats.pendingReview} pending review
            </button>
          )}
          {filters.status && (
            <button
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
              onClick={() => setFilters(f => ({ ...f, status: undefined, page: 1 }))}
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={businesses || []}
        meta={meta}
        isLoading={isLoading}
        emptyMessage="No businesses found"
        currentPage={filters.page}
        onPageChange={(page) => setFilters(f => ({ ...f, page }))}
      />

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
              {(['info', 'media', 'cac', 'hours'] as const).map(tab => (
                <button
                  key={tab}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    detailTab === tab
                      ? 'border-ruby-600 text-ruby-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                  onClick={() => setDetailTab(tab)}
                >
                  {tab === 'info' ? 'Info' : tab === 'media' ? 'Media' : tab === 'cac' ? 'CAC' : 'Hours'}
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
                </div>

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
    </div>
  );
}

// ─── Helper Components ───

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
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
