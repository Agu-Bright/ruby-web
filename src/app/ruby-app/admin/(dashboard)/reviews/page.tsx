'use client';

import { useState, useCallback } from 'react';
import { Star, ShieldCheck, Flag, Trash2, Eye, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, Modal, type Column } from '@/components/ui';
import { formatDate } from '@/lib/utils';

interface ReviewUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
}

interface ReviewBusiness {
  _id: string;
  name?: string;
  slug?: string;
}

interface Review {
  _id: string;
  businessId: string | ReviewBusiness;
  userId: string | ReviewUser;
  rating: number;
  text?: string;
  photos?: string[];
  isVerified: boolean;
  isFlagged: boolean;
  flagReason?: string;
  reply?: { text: string; repliedAt: string };
  createdAt: string;
}

type FilterStatus = 'all' | 'verified' | 'flagged';

export default function ReviewsPage() {
  const { admin } = useAuth();
  const [filters, setFilters] = useState<{
    page: number;
    limit: number;
    rating?: number;
    isFlagged?: string;
    isVerified?: string;
  }>({ page: 1, limit: 20 });
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Review | null>(null);

  const { data: reviews, meta, isLoading, refetch } = useApi<Review[]>(
    () => api.reviews.list(filters),
    [filters]
  );

  const { mutate: verifyReview, isLoading: verifying } = useMutation(
    (id: string) => api.reviews.verify(id)
  );

  const { mutate: deleteReview, isLoading: deleting } = useMutation(
    (id: string) => api.reviews.delete(id)
  );

  const handleStatusFilter = (status: FilterStatus) => {
    setStatusFilter(status);
    const newFilters: typeof filters = { ...filters, page: 1 };
    delete newFilters.isFlagged;
    delete newFilters.isVerified;
    if (status === 'verified') newFilters.isVerified = 'true';
    if (status === 'flagged') newFilters.isFlagged = 'true';
    setFilters(newFilters);
  };

  const handleRatingFilter = (rating: number | undefined) => {
    setFilters(prev => ({ ...prev, page: 1, rating }));
  };

  const handleVerify = useCallback(async (review: Review) => {
    const result = await verifyReview(review._id);
    if (result) {
      toast.success(review.isVerified ? 'Review unverified' : 'Review verified — it will show on the home screen');
      refetch();
    }
  }, [verifyReview, refetch]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    const result = await deleteReview(deleteConfirm._id);
    if (result !== undefined) {
      toast.success('Review deleted');
      setDeleteConfirm(null);
      refetch();
    }
  }, [deleteConfirm, deleteReview, refetch]);

  const getUserName = (user: string | ReviewUser) => {
    if (typeof user === 'object' && user) {
      return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown User';
    }
    return 'Unknown User';
  };

  const getBusinessName = (business: string | ReviewBusiness) => {
    if (typeof business === 'object' && business) return business.name || 'Unknown';
    return 'Unknown';
  };

  // Stats from current data
  const totalReviews = (meta as any)?.pagination?.total || meta?.total || 0;
  const verifiedCount = reviews?.filter(r => r.isVerified).length || 0;
  const flaggedCount = reviews?.filter(r => r.isFlagged).length || 0;

  const columns: Column<Review>[] = [
    {
      key: 'reviewer',
      header: 'Reviewer',
      render: (r) => {
        const user = typeof r.userId === 'object' ? r.userId : null;
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">{getUserName(r.userId)}</div>
              <div className="text-xs text-gray-500">{user?.email || ''}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'business',
      header: 'Business',
      render: (r) => (
        <span className="text-sm text-gray-700">{getBusinessName(r.businessId)}</span>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (r) => (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'text',
      header: 'Review',
      render: (r) => (
        <p className="text-sm text-gray-600 max-w-[280px] truncate">
          {r.text || <span className="italic text-gray-400">No text</span>}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.isVerified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
          )}
          {r.isFlagged && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
              <Flag className="w-3 h-3" /> Flagged
            </span>
          )}
          {!r.isVerified && !r.isFlagged && (
            <span className="text-xs text-gray-400">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (r) => <span className="text-xs text-gray-500">{formatDate(r.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedReview(r)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleVerify(r)}
            disabled={verifying}
            className={`p-1.5 rounded-md hover:bg-gray-100 ${
              r.isVerified ? 'text-green-600' : 'text-gray-400'
            }`}
            title={r.isVerified ? 'Unverify' : 'Verify (show on home screen)'}
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
          {admin?.role === 'super_admin' && (
            <button
              onClick={() => setDeleteConfirm(r)}
              className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        subtitle="Manage customer reviews. Verified reviews appear on the home screen."
      />

      {/* Filter bar */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter tabs */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {(['all', 'verified', 'flagged'] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Rating filter */}
          <div className="relative">
            <select
              value={filters.rating || ''}
              onChange={(e) => handleRatingFilter(e.target.value ? Number(e.target.value) : undefined)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-ruby-500"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Stats */}
          <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
            <span>{totalReviews} total</span>
            <span className="text-green-600">{verifiedCount} verified</span>
            <span className="text-red-600">{flaggedCount} flagged</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={reviews || []}
        isLoading={isLoading}
        pagination={meta?.pagination}
        onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
        emptyMessage="No reviews found"
      />

      {/* Detail Modal */}
      {selectedReview && (
        <Modal
          isOpen={!!selectedReview}
          onClose={() => setSelectedReview(null)}
          title="Review Details"
          size="md"
        >
          <div className="space-y-4">
            {/* Reviewer info */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{getUserName(selectedReview.userId)}</div>
                <div className="text-sm text-gray-500">on {getBusinessName(selectedReview.businessId)}</div>
              </div>
              <div className="text-sm text-gray-400">{formatDate(selectedReview.createdAt)}</div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${i < selectedReview.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                />
              ))}
              <span className="text-sm font-medium text-gray-700 ml-2">{selectedReview.rating}/5</span>
            </div>

            {/* Review text */}
            {selectedReview.text && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedReview.text}</p>
              </div>
            )}

            {/* Photos */}
            {selectedReview.photos && selectedReview.photos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Photos ({selectedReview.photos.length})</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedReview.photos.map((url, i) => (
                    <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border" />
                  ))}
                </div>
              </div>
            )}

            {/* Business reply */}
            {selectedReview.reply && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs font-medium text-blue-700 mb-1">Business Reply</p>
                <p className="text-sm text-blue-900">{selectedReview.reply.text}</p>
                <p className="text-xs text-blue-500 mt-1">{formatDate(selectedReview.reply.repliedAt)}</p>
              </div>
            )}

            {/* Flag info */}
            {selectedReview.isFlagged && selectedReview.flagReason && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <p className="text-xs font-medium text-red-700 mb-1">Flagged</p>
                <p className="text-sm text-red-900">{selectedReview.flagReason}</p>
              </div>
            )}

            {/* Status badges */}
            <div className="flex items-center gap-2 pt-2 border-t">
              {selectedReview.isVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified — showing on home screen
                </span>
              )}
              {selectedReview.isFlagged && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  <Flag className="w-3.5 h-3.5" /> Flagged
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { handleVerify(selectedReview); setSelectedReview(null); }}
                disabled={verifying}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedReview.isVerified
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                {selectedReview.isVerified ? 'Unverify' : 'Verify for Home Screen'}
              </button>
              {admin?.role === 'super_admin' && (
                <button
                  onClick={() => { setDeleteConfirm(selectedReview); setSelectedReview(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Review"
          size="sm"
        >
          <div className="space-y-4">
            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
              <p className="text-sm text-red-800">
                This will permanently delete this {deleteConfirm.rating}-star review
                by <strong>{getUserName(deleteConfirm.userId)}</strong> on{' '}
                <strong>{getBusinessName(deleteConfirm.businessId)}</strong>.
                The business rating will be recalculated.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Review'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
