'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Store, Search, CheckCircle, XCircle, Ban, Eye, MapPin, Clock,
  Phone, Mail, Globe, Star, ShieldCheck, ShieldX, RotateCcw, RefreshCw,
  FileText, ExternalLink, AlertTriangle, MoreHorizontal, ChevronDown, Trash2,
  Plus, Copy, Loader2, Package, Wrench, Edit2, Archive, Power, Image as ImageIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, StatCard, ImageUpload, type Column } from '@/components/ui';
import type {
  Business, BusinessFilterParams, BusinessStatus, BusinessStats, VerifyCacRequest,
  BusinessMediaItem, BusinessHoursEntry, BusinessAddress,
  AdminCreateBusinessRequest, Location, Category, Subcategory,
  Product, ProductStatus, UpdateProductRequest,
  ServiceListing, ServiceStatus, UpdateServiceRequest, PricingType, ServiceFulfillmentMode,
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
  const [detailTab, setDetailTab] = useState<'info' | 'media' | 'cac' | 'hours' | 'catalog'>('info');
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

  const { mutate: createBusiness, isLoading: creating } = useMutation(
    (data: AdminCreateBusinessRequest) => api.businesses.adminCreate(data), mutationOpts
  );
  const { mutate: regenerateClaimCode } = useMutation(
    ({ id }: { id: string }) => api.businesses.regenerateClaimCode(id), mutationOpts
  );

  const isProcessing = approving || rejecting || suspending || reinstating || verifyingCac || featuring || deleting;

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
        if (b.isClaimed === false) {
          return (
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                Unclaimed
              </span>
              {b.claimCode && <div className="text-xs text-gray-400 mt-0.5 font-mono">{b.claimCode}</div>}
            </div>
          );
        }
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
        action={
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 transition-colors"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4" />
            Create Business
          </button>
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
              {(['info', 'media', 'cac', 'hours', 'catalog'] as const).map(tab => (
                <button
                  key={tab}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    detailTab === tab
                      ? 'border-ruby-600 text-ruby-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                  onClick={() => { setDetailTab(tab); if (tab === 'catalog') { setCatalogSearch(''); setCatalogStatusFilter(''); } }}
                >
                  {tab === 'info' ? 'Info' : tab === 'media' ? 'Media' : tab === 'cac' ? 'CAC' : tab === 'hours' ? 'Hours' : 'Catalog'}
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
        longitude: 0, latitude: 0, logoUrl: '', coverImageUrl: '', claimContactPhone: '', claimContactEmail: '',
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                  value={form.latitude || ''}
                  onChange={(e) => update('latitude', parseFloat(e.target.value) || 0)}
                  placeholder="6.5244"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
                  value={form.longitude || ''}
                  onChange={(e) => update('longitude', parseFloat(e.target.value) || 0)}
                  placeholder="3.3792"
                />
              </div>
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
