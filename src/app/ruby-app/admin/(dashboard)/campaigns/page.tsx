'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Megaphone, Search, CheckCircle, XCircle, Eye,
  MoreHorizontal, ChevronDown, TrendingUp, Clock, Zap,
  Star, Image, PlayCircle, Bell, AlertTriangle, Loader2, Pin,
  Upload, Plus, Film, X, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, StatCard, type Column } from '@/components/ui';
import type {
  AdCampaign, AdCampaignStats, AdCampaignFilterParams,
  AdCampaignStatus, AdType, AdProduct,
} from '@/lib/types';
import { formatDate, formatCurrency, getAdTypeName, getAdStatusLabel, getBusinessName, getLocationName } from '@/lib/utils';

const STATUS_OPTIONS: AdCampaignStatus[] = ['PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
const TYPE_OPTIONS: AdType[] = ['FEATURED_LISTING', 'SLIDESHOW_AD', 'EXPLORE_REELS_AD', 'PUSH_NOTIFICATION', 'FEATURED_REVIEWS'];

const AD_TYPE_ICONS: Record<string, typeof Star> = {
  FEATURED_LISTING: Star,
  SLIDESHOW_AD: Image,
  EXPLORE_REELS_AD: PlayCircle,
  PUSH_NOTIFICATION: Bell,
  FEATURED_REVIEWS: Pin,
};

type ActionType = 'approve' | 'reject' | 'delete';

// ─── Action Dropdown ───
function ActionDropdown({ campaign, onAction, onView }: {
  campaign: AdCampaign;
  onAction: (campaign: AdCampaign, action: ActionType) => void;
  onView: (campaign: AdCampaign) => void;
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

  const items: { label: string; icon: typeof Eye; action: () => void; variant?: 'default' | 'success' | 'danger' }[] = [
    { label: 'View Details', icon: Eye, action: () => { onView(campaign); setOpen(false); } },
  ];

  if (campaign.status === 'PENDING_REVIEW') {
    items.push(
      { label: 'Approve', icon: CheckCircle, action: () => { onAction(campaign, 'approve'); setOpen(false); }, variant: 'success' },
      { label: 'Reject', icon: XCircle, action: () => { onAction(campaign, 'reject'); setOpen(false); }, variant: 'danger' },
    );
  }

  // Delete is always available
  items.push(
    { label: 'Delete', icon: Trash2, action: () => { onAction(campaign, 'delete'); setOpen(false); }, variant: 'danger' },
  );

  const variantColors = {
    default: 'text-gray-700 hover:bg-gray-50',
    success: 'text-emerald-700 hover:bg-emerald-50',
    danger: 'text-red-600 hover:bg-red-50',
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
        <MoreHorizontal className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${variantColors[item.variant || 'default']} transition-colors`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Status Badge Colors ───
export default function CampaignsPage() {
  const [filters, setFilters] = useState<AdCampaignFilterParams>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{ campaign: AdCampaign; action: ActionType } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: campaignsData, meta: campaignsMeta, isLoading: campaignsLoading, refetch } = useApi(
    () => api.adCampaigns.list(filters),
    [JSON.stringify(filters)],
  );
  const { data: statsData } = useApi(() => api.adCampaigns.stats(), []);
  const { data: adProductsData, refetch: refetchProducts } = useApi(
    () => api.adProducts.list(),
    [],
  );

  const approveMutation = useMutation(api.adCampaigns.approve);
  const rejectMutation = useMutation(
    (id: string) => api.adCampaigns.reject(id, { rejectionReason }),
  );
  const deleteMutation = useMutation(api.adCampaigns.delete);
  const updatePriceMutation = useMutation(
    (input: { type: string; ratePerUnit: number }) =>
      api.adProducts.updatePrice(input.type, input.ratePerUnit),
  );

  const campaigns = campaignsData || [];
  const stats = statsData as AdCampaignStats | undefined;
  const pagination = campaignsMeta;
  const adProducts = (adProductsData || []) as AdProduct[];
  const [editingProduct, setEditingProduct] = useState<AdProduct | null>(null);
  const [newPrice, setNewPrice] = useState('');

  // Upload Reel Modal state
  const [uploadReelOpen, setUploadReelOpen] = useState(false);
  const [reelVideoFile, setReelVideoFile] = useState<File | null>(null);
  const [reelVideoPreview, setReelVideoPreview] = useState<string | null>(null);
  const [reelCaption, setReelCaption] = useState('');
  const [reelHashtags, setReelHashtags] = useState('');
  const [reelUploading, setReelUploading] = useState(false);
  const [reelBusinessId, setReelBusinessId] = useState<string>('');
  const [reelBusinessName, setReelBusinessName] = useState('');
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  const [businessSearchResults, setBusinessSearchResults] = useState<Array<{ _id: string; name: string; slug: string }>>([]);
  const [businessSearching, setBusinessSearching] = useState(false);
  const businessSearchTimer = useRef<NodeJS.Timeout | null>(null);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video must be under 100MB');
      return;
    }
    setReelVideoFile(file);
    setReelVideoPreview(URL.createObjectURL(file));
  };

  const handleBusinessSearch = useCallback((query: string) => {
    setBusinessSearchQuery(query);
    if (businessSearchTimer.current) clearTimeout(businessSearchTimer.current);
    if (!query.trim()) { setBusinessSearchResults([]); return; }
    businessSearchTimer.current = setTimeout(async () => {
      setBusinessSearching(true);
      try {
        const res = await api.businesses.list({ search: query, limit: 8, status: 'LIVE' } as any);
        setBusinessSearchResults((res?.data || []).map((b: any) => ({ _id: b._id, name: b.name, slug: b.slug })));
      } catch {
        setBusinessSearchResults([]);
      } finally {
        setBusinessSearching(false);
      }
    }, 300);
  }, []);

  const handleUploadReel = async () => {
    if (!reelVideoFile) { toast.error('Please select a video'); return; }
    setReelUploading(true);
    try {
      // Upload video
      const uploadRes = await api.media.upload(reelVideoFile, 'reels');
      const videoUrl = uploadRes?.data?.url;
      if (!videoUrl) throw new Error('Upload failed');

      // Create admin reel (optionally attached to business)
      const hashtagsArr = reelHashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean);
      await api.adCampaigns.createAdminReel(
        {
          media: [{ url: videoUrl, type: 'VIDEO' }],
          caption: reelCaption.trim() || undefined,
          hashtags: hashtagsArr.length > 0 ? hashtagsArr : undefined,
        },
        reelBusinessId || undefined,
      );

      toast.success(reelBusinessId ? `Reel published for ${reelBusinessName}!` : 'Reel uploaded and published!');
      setUploadReelOpen(false);
      setReelVideoFile(null);
      setReelVideoPreview(null);
      setReelCaption('');
      setReelHashtags('');
      setReelBusinessId('');
      setReelBusinessName('');
      setBusinessSearchQuery('');
      setBusinessSearchResults([]);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload reel');
    } finally {
      setReelUploading(false);
    }
  };

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  }, [searchInput]);

  const handleAction = (campaign: AdCampaign, action: ActionType) => {
    setActionModal({ campaign, action });
    setRejectionReason('');
  };

  const handleView = (campaign: AdCampaign) => {
    setSelectedCampaign(campaign);
    setViewModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    const { campaign, action } = actionModal;

    try {
      if (action === 'approve') {
        await approveMutation.mutate(campaign._id);
        toast.success('Campaign approved successfully');
      } else if (action === 'reject') {
        await rejectMutation.mutate(campaign._id);
        toast.success('Campaign rejected. Wallet refunded.');
      } else if (action === 'delete') {
        await deleteMutation.mutate(campaign._id);
        toast.success('Campaign deleted successfully');
      }
      setActionModal(null);
      refetch();
    } catch {
      toast.error(`Failed to ${action} campaign`);
    }
  };

  const columns: Column<AdCampaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      render: (c) => {
        const Icon = AD_TYPE_ICONS[c.type] || Zap;
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-ruby-50 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4 text-ruby-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
              <p className="text-xs text-gray-500">{getAdTypeName(c.type)}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'businessId',
      header: 'Business',
      render: (c) => (
        <span className="text-sm text-gray-700">{getBusinessName(c.businessId) || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <StatusBadge status={c.status} />
      ),
    },
    {
      key: 'totalCost',
      header: 'Cost',
      render: (c) => <span className="text-sm font-medium text-gray-900">{formatCurrency(c.totalCost)}</span>,
    },
    {
      key: 'impressions',
      header: 'Impressions',
      render: (c) => <span className="text-sm text-gray-700">{c.impressions.toLocaleString()}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (c) => <span className="text-sm text-gray-500">{formatDate(c.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (c) => <ActionDropdown campaign={c} onAction={handleAction} onView={handleView} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Ad Campaigns"
          description="Manage and review advertising campaigns"
        />
        <button
          onClick={() => setUploadReelOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 transition-colors shadow-sm"
        >
          <Film className="h-4 w-4" />
          Upload Reel
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Campaigns" value={stats.total} icon={Megaphone} />
          <StatCard title="Pending Review" value={stats.pendingReview} icon={Clock} />
          <StatCard title="Active" value={stats.active} icon={Zap} />
          <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={TrendingUp} />
        </div>
      )}

      {/* Ad Product Pricing */}
      {adProducts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Ad Product Pricing</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {adProducts.map((p) => {
              const Icon = AD_TYPE_ICONS[p.type] || Zap;
              return (
                <div key={p.type} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-ruby-50 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-ruby-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{p.name}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(p.ratePerUnit)}
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      /{p.rateUnit === 'DAY' ? 'day' : 'notification'}
                    </span>
                  </p>
                  <button
                    onClick={() => { setEditingProduct(p); setNewPrice(String(p.ratePerUnit)); }}
                    className="mt-2 text-xs text-ruby-600 hover:text-ruby-700 font-medium"
                  >
                    Edit Price
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-500"
            />
          </div>

          <div className="relative">
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as AdCampaignStatus || undefined, page: 1 }))}
              className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{getAdStatusLabel(s)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as AdType || undefined, page: 1 }))}
              className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
            >
              <option value="">All Types</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{getAdTypeName(t)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={campaigns}
        isLoading={campaignsLoading}
        meta={pagination}
        currentPage={filters.page || 1}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        emptyMessage="No campaigns found"
      />

      {/* View Detail Modal */}
      {selectedCampaign && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={selectedCampaign.name}
          subtitle={getAdTypeName(selectedCampaign.type)}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={selectedCampaign.status} />
              <span className="text-sm text-gray-500">Payment: {selectedCampaign.paymentStatus}</span>
            </div>

            {selectedCampaign.status === 'REJECTED' && selectedCampaign.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">Rejection Reason</p>
                  <p className="text-sm text-red-600">{selectedCampaign.rejectionReason}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Business</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{getBusinessName(selectedCampaign.businessId) || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Location</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{getLocationName(selectedCampaign.locationId) || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Cost</p>
                <p className="text-sm font-medium text-ruby-600 mt-1">{formatCurrency(selectedCampaign.totalCost)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Duration</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{selectedCampaign.duration ? `${selectedCampaign.duration} days` : '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Impressions</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{selectedCampaign.impressions.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Clicks</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{selectedCampaign.clicks.toLocaleString()}</p>
              </div>
            </div>

            {selectedCampaign.startDate && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date Range</p>
                <p className="text-sm text-gray-900 mt-1">
                  {formatDate(selectedCampaign.startDate)} — {formatDate(selectedCampaign.endDate || '')}
                </p>
              </div>
            )}

            {selectedCampaign.caption && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Caption</p>
                <p className="text-sm text-gray-700 mt-1">{selectedCampaign.caption}</p>
              </div>
            )}

            {selectedCampaign.notificationMessage && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Notification Message</p>
                <p className="text-sm text-gray-700 mt-1">{selectedCampaign.notificationMessage}</p>
              </div>
            )}

            {selectedCampaign.targetRadius && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Target Radius</p>
                <p className="text-sm text-gray-900 mt-1">{selectedCampaign.targetRadius} km</p>
              </div>
            )}

            {selectedCampaign.media && selectedCampaign.media.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Media</p>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedCampaign.media.map((m, i) =>
                    m.type === 'VIDEO' || m.url?.match(/\.(mp4|mov|webm)$/i) ? (
                      <video key={i} src={m.url} controls className="h-24 rounded-lg object-cover" />
                    ) : (
                      <img key={i} src={m.url} alt={`Media ${i + 1}`} className="h-24 rounded-lg object-cover" />
                    )
                  )}
                </div>
              </div>
            )}

            {selectedCampaign.reviewIds && selectedCampaign.reviewIds.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Featured Reviews</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCampaign.reviewIds.map((id: string, i: number) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-md font-mono">
                      <Pin className="h-3 w-3 mr-1" />
                      {typeof id === 'object' ? (id as any)._id || id : id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedCampaign.status === 'PENDING_REVIEW' && (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => { setViewModalOpen(false); handleAction(selectedCampaign, 'approve'); }}
                  className="flex-1 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => { setViewModalOpen(false); handleAction(selectedCampaign, 'reject'); }}
                  className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Ad Product Price Modal */}
      {editingProduct && (
        <Modal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          title={`Update Price: ${editingProduct.name}`}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate Per {editingProduct.rateUnit === 'DAY' ? 'Day' : 'Notification'} (NGN)
              </label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const price = parseFloat(newPrice);
                  if (isNaN(price) || price < 0) return;
                  try {
                    await updatePriceMutation.mutate({ type: editingProduct.type, ratePerUnit: price });
                    toast.success('Price updated successfully');
                    setEditingProduct(null);
                    refetchProducts();
                  } catch {
                    toast.error('Failed to update price');
                  }
                }}
                disabled={updatePriceMutation.isLoading}
                className="flex-1 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {updatePriceMutation.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Reel Modal */}
      <Modal
        isOpen={uploadReelOpen}
        onClose={() => { if (!reelUploading) { setUploadReelOpen(false); setReelVideoFile(null); setReelVideoPreview(null); setReelCaption(''); setReelHashtags(''); setReelBusinessId(''); setReelBusinessName(''); setBusinessSearchQuery(''); setBusinessSearchResults([]); } }}
        title="Upload Reel"
        subtitle="Auto-approved — will appear in Explore feed immediately"
        size="md"
      >
        <div className="space-y-4">
          {/* Video Upload */}
          {reelVideoPreview ? (
            <div className="relative rounded-xl overflow-hidden bg-black" style={{ maxHeight: 280 }}>
              <video
                src={reelVideoPreview}
                controls
                className="w-full object-contain"
                style={{ maxHeight: 280 }}
              />
              <button
                onClick={() => { setReelVideoFile(null); setReelVideoPreview(null); }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition-colors">
              <div className="w-12 h-12 rounded-full bg-ruby-50 flex items-center justify-center">
                <Upload className="h-5 w-5 text-ruby-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Click to select a video</p>
                <p className="text-xs text-gray-500 mt-1">MP4, MOV, WebM — Max 100MB</p>
              </div>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
            </label>
          )}

          {/* Attach to Business (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attach to Business <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            {reelBusinessId ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-emerald-800 flex-1 truncate">{reelBusinessName}</span>
                <button
                  onClick={() => { setReelBusinessId(''); setReelBusinessName(''); setBusinessSearchQuery(''); setBusinessSearchResults([]); }}
                  className="text-emerald-600 hover:text-emerald-800 p-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={businessSearchQuery}
                  onChange={(e) => handleBusinessSearch(e.target.value)}
                  placeholder="Search business by name..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
                />
                {businessSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-48 overflow-y-auto">
                    {businessSearchResults.map((b) => (
                      <button
                        key={b._id}
                        onClick={() => {
                          setReelBusinessId(b._id);
                          setReelBusinessName(b.name);
                          setBusinessSearchQuery('');
                          setBusinessSearchResults([]);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-ruby-50 flex items-center justify-center flex-shrink-0">
                          <Star className="h-3 w-3 text-ruby-500" />
                        </div>
                        <span className="truncate">{b.name}</span>
                        <span className="text-xs text-gray-400 ml-auto flex-shrink-0">@{b.slug}</span>
                      </button>
                    ))}
                  </div>
                )}
                {businessSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {reelBusinessId ? 'Reel will show with this business\'s branding' : 'Leave empty to post as Ruby+ (platform content)'}
            </p>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caption (optional)</label>
            <textarea
              value={reelCaption}
              onChange={(e) => setReelCaption(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Write a caption..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{reelCaption.length}/500</p>
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags (optional)</label>
            <input
              type="text"
              value={reelHashtags}
              onChange={(e) => setReelHashtags(e.target.value)}
              placeholder="food, lagos, nightlife (comma separated)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => { setUploadReelOpen(false); setReelVideoFile(null); setReelVideoPreview(null); setReelCaption(''); setReelHashtags(''); setReelBusinessId(''); setReelBusinessName(''); setBusinessSearchQuery(''); setBusinessSearchResults([]); }}
              disabled={reelUploading}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadReel}
              disabled={!reelVideoFile || reelUploading}
              className="flex-1 py-2.5 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {reelUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  Publish Reel
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Approve/Reject/Delete Action Modal */}
      {actionModal && (
        <Modal
          isOpen={!!actionModal}
          onClose={() => setActionModal(null)}
          title={`${actionModal.action === 'approve' ? 'Approve' : actionModal.action === 'delete' ? 'Delete' : 'Reject'} ${actionModal.campaign.isOrganic ? 'Reel' : 'Campaign'}`}
          subtitle={actionModal.campaign.name}
          size="sm"
        >
          <div className="space-y-4">
            {actionModal.action === 'approve' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  This will activate the campaign. The business has already been charged{' '}
                  <strong>{formatCurrency(actionModal.campaign.totalCost)}</strong>.
                </p>
              </div>
            ) : actionModal.action === 'delete' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  This will permanently delete this {actionModal.campaign.isOrganic ? 'reel' : 'campaign'}. This action cannot be undone.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    This will reject the campaign and refund{' '}
                    <strong>{formatCurrency(actionModal.campaign.totalCost)}</strong> to the business wallet.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20"
                    placeholder="Enter reason for rejection..."
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={approveMutation.isLoading || rejectMutation.isLoading || deleteMutation.isLoading}
                className={`flex-1 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  actionModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {(approveMutation.isLoading || rejectMutation.isLoading || deleteMutation.isLoading) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {actionModal.action === 'approve' ? 'Approve' : actionModal.action === 'delete' ? 'Delete' : 'Reject'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
