'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Tag, Search, Plus, Pencil, Trash2, Eye,
  MoreHorizontal, ChevronDown, TrendingUp, MousePointerClick,
  Loader2, ExternalLink, Store, Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, Modal, StatCard, ImageUpload, SearchableSelect, type Column, type SelectOption } from '@/components/ui';
import type { Promo, PromoFilterParams, Location, Business } from '@/lib/types';
import { formatDate, getBusinessName, getLocationName } from '@/lib/utils';

const EMPTY_PROMO = {
  title: '',
  description: '',
  imageUrl: '',
  linkType: 'BUSINESS' as 'BUSINESS' | 'EXTERNAL' | 'IN_APP',
  businessId: '',
  externalUrl: '',
  screenRoute: '',
  locationId: '',
  isActive: true,
  displayOrder: 0,
  startDate: '',
  endDate: '',
};

export default function PromosPage() {
  const [filters, setFilters] = useState<PromoFilterParams>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [formData, setFormData] = useState(EMPTY_PROMO);
  const [deleteModal, setDeleteModal] = useState<Promo | null>(null);
  const [viewModal, setViewModal] = useState<Promo | null>(null);

  // Data fetching
  const { data: promosData, meta: promosMeta, isLoading: promosLoading, refetch } = useApi(
    () => api.promos.list(filters),
    [JSON.stringify(filters)],
  );
  const { data: statsData } = useApi(() => api.promos.stats(), []);
  const { data: locationsData } = useApi(() => api.locations.list({ limit: 100, type: 'CITY' as any }), []);
  const { data: businessesData } = useApi(() => api.businesses.list({ limit: 200, status: 'LIVE' as any }), []);

  const createMutation = useMutation(api.promos.create);
  const updateMutation = useMutation(
    (input: { id: string; data: Partial<Promo> }) => api.promos.update(input.id, input.data),
  );
  const deleteMutation = useMutation(api.promos.delete);

  const promos = (promosData || []) as Promo[];
  const stats = statsData as { total: number; active: number; totalImpressions: number; totalClicks: number } | undefined;
  const locations = (locationsData || []) as Location[];
  const businesses = (businessesData || []) as Business[];

  const businessOptions: SelectOption[] = businesses.map((b) => ({
    value: b._id,
    label: b.name,
  }));
  const locationOptions: SelectOption[] = locations.map((l) => ({
    value: l._id,
    label: l.name,
  }));

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  }, [searchInput]);

  const openCreateModal = () => {
    setEditingPromo(null);
    setFormData(EMPTY_PROMO);
    setFormModalOpen(true);
  };

  const openEditModal = (promo: Promo) => {
    setEditingPromo(promo);
    setFormData({
      title: promo.title,
      description: promo.description || '',
      imageUrl: promo.imageUrl,
      linkType: promo.linkType,
      businessId: typeof promo.businessId === 'object' ? promo.businessId?._id || '' : promo.businessId || '',
      externalUrl: promo.externalUrl || '',
      screenRoute: (promo as any).screenRoute || '',
      locationId: typeof promo.locationId === 'object' ? promo.locationId?._id || '' : promo.locationId || '',
      isActive: promo.isActive,
      displayOrder: promo.displayOrder,
      startDate: promo.startDate ? promo.startDate.slice(0, 10) : '',
      endDate: promo.endDate ? promo.endDate.slice(0, 10) : '',
    });
    setFormModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.imageUrl) {
      toast.error('Image is required');
      return;
    }
    if (formData.linkType === 'BUSINESS' && !formData.businessId) {
      toast.error('Please select a business');
      return;
    }
    if (formData.linkType === 'EXTERNAL' && !formData.externalUrl) {
      toast.error('External URL is required');
      return;
    }
    if (formData.linkType === 'IN_APP' && !formData.screenRoute) {
      toast.error('Please select a screen');
      return;
    }

    const payload: any = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      imageUrl: formData.imageUrl,
      linkType: formData.linkType,
      isActive: formData.isActive,
      displayOrder: formData.displayOrder,
    };

    if (formData.linkType === 'BUSINESS') {
      payload.businessId = formData.businessId;
      payload.externalUrl = undefined;
      payload.screenRoute = undefined;
    } else if (formData.linkType === 'EXTERNAL') {
      payload.externalUrl = formData.externalUrl;
      payload.businessId = undefined;
      payload.screenRoute = undefined;
    } else if (formData.linkType === 'IN_APP') {
      payload.screenRoute = formData.screenRoute;
      payload.businessId = undefined;
      payload.externalUrl = undefined;
    }

    if (formData.locationId) payload.locationId = formData.locationId;
    if (formData.startDate) payload.startDate = formData.startDate;
    if (formData.endDate) payload.endDate = formData.endDate;

    try {
      if (editingPromo) {
        await updateMutation.mutate({ id: editingPromo._id, data: payload });
        toast.success('Promo updated successfully');
      } else {
        await createMutation.mutate(payload);
        toast.success('Promo created successfully');
      }
      setFormModalOpen(false);
      refetch();
    } catch {
      toast.error(editingPromo ? 'Failed to update promo' : 'Failed to create promo');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteMutation.mutate(deleteModal._id);
      toast.success('Promo deleted');
      setDeleteModal(null);
      refetch();
    } catch {
      toast.error('Failed to delete promo');
    }
  };

  const SCREEN_ROUTE_LABELS: Record<string, string> = {
    '/(tabs)': 'Home',
    '/(tabs)/explore': 'Explore / Reels',
    '/(main)/wallet': 'Wallet',
    '/(main)/ride': 'Request Ride',
    '/(main)/dispatch': 'Send Package',
    '/(tabs)/orders': 'Orders',
    '/(main)/profile/bookings': 'Bookings',
    '/(tabs)/profile': 'Profile',
  };

  const getPromoLink = (promo: Promo): string => {
    if (promo.linkType === 'BUSINESS') {
      return getBusinessName(promo.businessId) || 'Unknown Business';
    }
    if (promo.linkType === 'IN_APP') {
      return SCREEN_ROUTE_LABELS[promo.screenRoute || ''] || promo.screenRoute || '-';
    }
    return promo.externalUrl || '-';
  };

  const columns: Column<Promo>[] = [
    {
      key: 'imageUrl',
      header: 'Image',
      render: (p) => (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Tag className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (p) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
          {p.description && (
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{p.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'linkType',
      header: 'Link',
      render: (p) => (
        <div className="flex items-center gap-1.5">
          {p.linkType === 'BUSINESS' ? (
            <Store className="h-3.5 w-3.5 text-gray-400" />
          ) : p.linkType === 'IN_APP' ? (
            <Smartphone className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span className="text-sm text-gray-700 truncate max-w-[150px]">{getPromoLink(p)}</span>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (p) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          p.isActive
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        }`}>
          {p.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'impressions',
      header: 'Stats',
      render: (p) => (
        <div className="text-xs text-gray-500">
          <span>{p.impressions.toLocaleString()} views</span>
          <span className="mx-1">/</span>
          <span>{p.clicks.toLocaleString()} clicks</span>
        </div>
      ),
    },
    {
      key: 'displayOrder',
      header: 'Order',
      render: (p) => <span className="text-sm text-gray-700">{p.displayOrder}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (p) => <span className="text-sm text-gray-500">{formatDate(p.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (p) => <PromoActionDropdown promo={p} onEdit={openEditModal} onDelete={setDeleteModal} onView={setViewModal} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Promos & Discounts"
          description="Create and manage promotional banners"
        />
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Promo
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Promos" value={stats.total} icon={Tag} />
          <StatCard title="Active" value={stats.active} icon={Tag} />
          <StatCard title="Total Impressions" value={stats.totalImpressions.toLocaleString()} icon={TrendingUp} />
          <StatCard title="Total Clicks" value={stats.totalClicks.toLocaleString()} icon={MousePointerClick} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search promos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-500"
            />
          </div>

          <div className="relative">
            <select
              value={filters.isActive === undefined ? '' : String(filters.isActive)}
              onChange={(e) => {
                const val = e.target.value;
                setFilters((prev) => ({
                  ...prev,
                  isActive: val === '' ? undefined : val === 'true',
                  page: 1,
                }));
              }}
              className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={promos}
        isLoading={promosLoading}
        meta={promosMeta}
        currentPage={filters.page || 1}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        emptyMessage="No promos found. Create your first promo!"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingPromo ? 'Edit Promo' : 'Create Promo'}
        size="md"
      >
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
              placeholder="e.g. 20% Off All Orders"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
              placeholder="Optional description..."
            />
          </div>

          {/* Image Upload */}
          <div>
            <ImageUpload
              value={formData.imageUrl}
              onChange={(url) => setFormData({ ...formData, imageUrl: url || '' })}
              folder="promos"
              label="Promo Banner Image *"
              helpText="Recommended: 800x400px, max 5MB"
            />
          </div>

          {/* Link Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Link Type *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, linkType: 'BUSINESS' })}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  formData.linkType === 'BUSINESS'
                    ? 'bg-ruby-50 border-ruby-300 text-ruby-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Store className="h-4 w-4" />
                Business
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, linkType: 'EXTERNAL' })}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  formData.linkType === 'EXTERNAL'
                    ? 'bg-ruby-50 border-ruby-300 text-ruby-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ExternalLink className="h-4 w-4" />
                External URL
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, linkType: 'IN_APP' })}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  formData.linkType === 'IN_APP'
                    ? 'bg-ruby-50 border-ruby-300 text-ruby-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Smartphone className="h-4 w-4" />
                In-App Screen
              </button>
            </div>
          </div>

          {/* Business Select, External URL, or Screen Route */}
          {formData.linkType === 'IN_APP' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Screen *</label>
              <select
                value={formData.screenRoute}
                onChange={(e) => setFormData({ ...formData, screenRoute: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-ruby-500 focus:border-ruby-500"
              >
                <option value="">Select a screen...</option>
                <option value="/(tabs)">Home</option>
                <option value="/(tabs)/explore">Explore / Reels</option>
                <option value="/(main)/wallet">Wallet</option>
                <option value="/(main)/ride">Request Ride</option>
                <option value="/(main)/dispatch">Send Package</option>
                <option value="/(tabs)/orders">Orders</option>
                <option value="/(main)/profile/bookings">Bookings</option>
                <option value="/(tabs)/profile">Profile</option>
              </select>
            </div>
          ) : formData.linkType === 'BUSINESS' ? (
            <div>
              <SearchableSelect
                options={businessOptions}
                value={formData.businessId}
                onChange={(val) => setFormData({ ...formData, businessId: val })}
                placeholder="Select a business..."
                label="Business *"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">External URL *</label>
              <input
                type="url"
                value={formData.externalUrl}
                onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
                placeholder="https://example.com"
              />
            </div>
          )}

          {/* Location (optional) */}
          <div>
            <SearchableSelect
              options={[{ value: '', label: 'All Locations' }, ...locationOptions]}
              value={formData.locationId}
              onChange={(val) => setFormData({ ...formData, locationId: val })}
              placeholder="All locations (no filter)"
              label="Target Location (optional)"
            />
          </div>

          {/* Display Order + Active */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setFormModalOpen(false)}
              className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isLoading || updateMutation.isLoading}
              className="flex-1 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {(createMutation.isLoading || updateMutation.isLoading) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {editingPromo ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <Modal
          isOpen={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          title="Delete Promo"
          subtitle={deleteModal.title}
          size="sm"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                Are you sure you want to delete this promo? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isLoading}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {deleteMutation.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Detail Modal */}
      {viewModal && (
        <Modal
          isOpen={!!viewModal}
          onClose={() => setViewModal(null)}
          title={viewModal.title}
          size="lg"
        >
          <div className="space-y-4">
            {/* Promo Image */}
            {viewModal.imageUrl && (
              <div className="rounded-lg overflow-hidden">
                <img src={viewModal.imageUrl} alt={viewModal.title} className="w-full h-48 object-cover" />
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                viewModal.isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {viewModal.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-gray-500">Order: {viewModal.displayOrder}</span>
            </div>

            {viewModal.description && (
              <p className="text-sm text-gray-600">{viewModal.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Link Type</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{viewModal.linkType}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Destination</p>
                <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                  {getPromoLink(viewModal)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Impressions</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{viewModal.impressions.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Clicks</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{viewModal.clicks.toLocaleString()}</p>
              </div>
              {viewModal.locationId && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Location</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{getLocationName(viewModal.locationId)}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Created</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(viewModal.createdAt)}</p>
              </div>
            </div>

            {(viewModal.startDate || viewModal.endDate) && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date Range</p>
                <p className="text-sm text-gray-900 mt-1">
                  {viewModal.startDate ? formatDate(viewModal.startDate) : 'No start date'} — {viewModal.endDate ? formatDate(viewModal.endDate) : 'No end date'}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => { setViewModal(null); openEditModal(viewModal); }}
                className="flex-1 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 transition-colors flex items-center justify-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => { setViewModal(null); setDeleteModal(viewModal); }}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Action Dropdown ───
function PromoActionDropdown({ promo, onEdit, onDelete, onView }: {
  promo: Promo;
  onEdit: (promo: Promo) => void;
  onDelete: (promo: Promo) => void;
  onView: (promo: Promo) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
        <MoreHorizontal className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={() => { onView(promo); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye className="h-4 w-4" />
            View
          </button>
          <button
            onClick={() => { onEdit(promo); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => { onDelete(promo); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
