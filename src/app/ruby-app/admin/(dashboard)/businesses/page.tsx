'use client';

import { useState, useCallback } from 'react';
import { Store, Search, CheckCircle, XCircle, Ban, Eye, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, type Column } from '@/components/ui';
import type { Business, BusinessFilterParams, BusinessStatus, BusinessApprovalAction } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const STATUS_OPTIONS: BusinessStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'LIVE', 'REJECTED', 'SUSPENDED'];

export default function BusinessesPage() {
  const { admin, isSuperAdmin } = useAuth();
  const [filters, setFilters] = useState<BusinessFilterParams>({
    page: 1,
    limit: 20,
    ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1 ? { locationId: admin.locationIds[0] } : {}),
  });
  const [search, setSearch] = useState('');
  const [detailBusiness, setDetailBusiness] = useState<Business | null>(null);
  const [actionModal, setActionModal] = useState<{ business: Business; action: 'APPROVED' | 'REJECTED' | 'SUSPENDED' } | null>(null);
  const [reason, setReason] = useState('');

  const { data: businesses, meta, isLoading, refetch } = useApi<Business[]>(
    () => api.businesses.list({ ...filters, search: search || undefined }),
    [filters, search]
  );

  const { mutate: updateStatus, isLoading: updatingStatus } = useMutation(
    ({ id, data }: { id: string; data: BusinessApprovalAction }) => api.businesses.updateStatus(id, data)
  );

  const handleAction = useCallback(async () => {
    if (!actionModal) return;
    const result = await updateStatus({
      id: actionModal.business._id,
      data: { status: actionModal.action, reason: reason || undefined },
    });
    if (result) {
      toast.success(`Business ${actionModal.action.toLowerCase()}`);
      setActionModal(null);
      setReason('');
      refetch();
    }
  }, [actionModal, reason, updateStatus, refetch]);

  const columns: Column<Business>[] = [
    {
      key: 'name',
      header: 'Business',
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <Store className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{b.name}</div>
            <div className="text-xs text-gray-500">{b.categoryName || 'Uncategorized'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (b) => <span className="text-sm text-gray-600">{b.ownerName || b.ownerId}</span>,
    },
    {
      key: 'location',
      header: 'Location',
      render: (b) => (
        <span className="text-sm text-gray-600 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {b.locationId}
        </span>
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
      className: 'w-32',
      render: (b) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setDetailBusiness(b); }} className="p-1.5 rounded hover:bg-gray-100" title="View">
            <Eye className="w-3.5 h-3.5 text-gray-500" />
          </button>
          {b.status === 'PENDING_REVIEW' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setActionModal({ business: b, action: 'APPROVED' }); }} className="p-1.5 rounded hover:bg-green-50" title="Approve">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setActionModal({ business: b, action: 'REJECTED' }); }} className="p-1.5 rounded hover:bg-red-50" title="Reject">
                <XCircle className="w-3.5 h-3.5 text-red-500" />
              </button>
            </>
          )}
          {(b.status === 'APPROVED' || b.status === 'LIVE') && (
            <button onClick={(e) => { e.stopPropagation(); setActionModal({ business: b, action: 'SUSPENDED' }); }} className="p-1.5 rounded hover:bg-red-50" title="Suspend">
              <Ban className="w-3.5 h-3.5 text-red-500" />
            </button>
          )}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search businesses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={filters.status || ''}
          onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value || undefined) as BusinessStatus | undefined, page: 1 }))}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
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

      {/* Detail Modal */}
      <Modal isOpen={!!detailBusiness} onClose={() => setDetailBusiness(null)} title="Business Details" size="lg">
        {detailBusiness && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 uppercase">Name</span>
                <p className="font-medium">{detailBusiness.name}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase">Status</span>
                <div className="mt-0.5"><StatusBadge status={detailBusiness.status} /></div>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase">Category</span>
                <p className="text-sm">{detailBusiness.categoryName || detailBusiness.categoryId}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase">Subcategory</span>
                <p className="text-sm">{detailBusiness.subcategoryName || detailBusiness.subcategoryId}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase">Owner</span>
                <p className="text-sm">{detailBusiness.ownerName || detailBusiness.ownerId}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase">Location</span>
                <p className="text-sm">{detailBusiness.locationId}</p>
              </div>
              {detailBusiness.phone && (
                <div>
                  <span className="text-xs text-gray-500 uppercase">Phone</span>
                  <p className="text-sm">{detailBusiness.phone}</p>
                </div>
              )}
              {detailBusiness.email && (
                <div>
                  <span className="text-xs text-gray-500 uppercase">Email</span>
                  <p className="text-sm">{detailBusiness.email}</p>
                </div>
              )}
            </div>

            {detailBusiness.description && (
              <div>
                <span className="text-xs text-gray-500 uppercase">Description</span>
                <p className="text-sm text-gray-700 mt-1">{detailBusiness.description}</p>
              </div>
            )}

            {detailBusiness.address && (
              <div>
                <span className="text-xs text-gray-500 uppercase">Address</span>
                <p className="text-sm">{typeof detailBusiness.address === 'object' ? `${(detailBusiness.address as Record<string, string>).street}, ${(detailBusiness.address as Record<string, string>).city}` : detailBusiness.address}</p>
              </div>
            )}

            {/* Dynamic attributes */}
            {detailBusiness.templateData && Object.keys(detailBusiness.templateData).length > 0 && (
              <div>
                <span className="text-xs text-gray-500 uppercase mb-2 block">Dynamic Attributes</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(detailBusiness.templateData).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500">{key}</span>
                      <p className="text-sm font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location pin preview */}
            {detailBusiness.coordinates && (
              <div>
                <span className="text-xs text-gray-500 uppercase mb-2 block">Location Pin</span>
                <div className="bg-gray-100 rounded-lg p-4 text-center text-sm text-gray-500">
                  📍 {detailBusiness.coordinates.coordinates[1].toFixed(6)}, {detailBusiness.coordinates.coordinates[0].toFixed(6)}
                  <div className="text-xs mt-1">(Map integration available with Mapbox/Google Maps)</div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {detailBusiness.status === 'PENDING_REVIEW' && (
                <>
                  <button className="btn-secondary text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setDetailBusiness(null); setActionModal({ business: detailBusiness, action: 'REJECTED' }); }}>
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button className="btn-primary" onClick={() => { setDetailBusiness(null); setActionModal({ business: detailBusiness, action: 'APPROVED' }); }}>
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); setReason(''); }}
        title={actionModal ? `${actionModal.action === 'APPROVED' ? 'Approve' : actionModal.action === 'REJECTED' ? 'Reject' : 'Suspend'} Business` : ''}
      >
        {actionModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {actionModal.action === 'APPROVED'
                ? `Approve "${actionModal.business.name}"? This will allow the business to go LIVE.`
                : actionModal.action === 'REJECTED'
                ? `Reject "${actionModal.business.name}"? The owner will be notified.`
                : `Suspend "${actionModal.business.name}"? This will hide them from discovery.`}
            </p>
            {actionModal.action !== 'APPROVED' && (
              <div>
                <label className="label">Reason {actionModal.action === 'REJECTED' && '(required)'}</label>
                <textarea
                  className="input"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide a reason..."
                />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => { setActionModal(null); setReason(''); }}>Cancel</button>
              <button
                className={actionModal.action === 'APPROVED' ? 'btn-primary' : 'px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors'}
                onClick={handleAction}
                disabled={updatingStatus || (actionModal.action === 'REJECTED' && !reason)}
              >
                {updatingStatus ? 'Processing...' : actionModal.action === 'APPROVED' ? 'Approve' : actionModal.action === 'REJECTED' ? 'Reject' : 'Suspend'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
