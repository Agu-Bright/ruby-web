'use client';

import { useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  ChevronDown,
  User,
  MapPin,
  Shield,
  Settings,
  DollarSign,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader, DataTable, Modal, StatusBadge, type Column } from '@/components/ui';
import type { AuditLog } from '@/lib/types';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';

const ACTION_TYPES = [
  'LOCATION_ACTIVATED', 'LOCATION_DEACTIVATED',
  'BUSINESS_APPROVED', 'BUSINESS_REJECTED', 'BUSINESS_SUSPENDED',
  'PAYOUT_APPROVED', 'PAYOUT_DENIED', 'PAYOUT_RETRIED',
  'FEE_CHANGED', 'RISK_OVERRIDE',
  'ADMIN_CREATED', 'ADMIN_SUSPENDED',
  'CATEGORY_UPDATED', 'TEMPLATE_UPDATED',
  'DISPUTE_RESOLVED', 'ORDER_CANCELLED', 'BOOKING_CANCELLED',
] as const;

const RESOURCE_TYPES = [
  'LOCATION', 'BUSINESS', 'ORDER', 'BOOKING', 'PAYOUT',
  'DISPUTE', 'ADMIN_USER', 'CATEGORY', 'TEMPLATE', 'FEE_CONFIG',
] as const;

function getActionIcon(action: string) {
  if (action.includes('LOCATION')) return MapPin;
  if (action.includes('BUSINESS')) return FileText;
  if (action.includes('PAYOUT') || action.includes('FEE')) return DollarSign;
  if (action.includes('ADMIN') || action.includes('RISK')) return Shield;
  if (action.includes('CATEGORY') || action.includes('TEMPLATE')) return Settings;
  return ScrollText;
}

function getActionColor(action: string) {
  if (action.includes('APPROVED') || action.includes('ACTIVATED')) return 'bg-green-100 text-green-600';
  if (action.includes('REJECTED') || action.includes('SUSPENDED') || action.includes('DENIED') || action.includes('DEACTIVATED') || action.includes('CANCELLED')) return 'bg-red-100 text-red-600';
  if (action.includes('CREATED')) return 'bg-blue-100 text-blue-600';
  if (action.includes('OVERRIDE')) return 'bg-yellow-100 text-yellow-600';
  return 'bg-gray-100 text-gray-600';
}

export default function AuditLogsPage() {
  const { admin, isSuperAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: logs, meta, isLoading } = useApi<AuditLog[]>(
    () => api.auditLogs.list({
      page,
      limit: 25,
      action: actionFilter || undefined,
      resourceType: resourceFilter || undefined,
      search: search || undefined,
    }),
    [page, actionFilter, resourceFilter, search]
  );

  const columns: Column<AuditLog>[] = [
    {
      key: 'action',
      header: 'Action',
      render: (log) => {
        const Icon = getActionIcon(log.action);
        const colorClass = getActionColor(log.action);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
              <Icon size={14} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{log.action.replace(/_/g, ' ')}</p>
              <p className="text-xs text-gray-500">{log.resourceType} · <span className="font-mono">{log.resourceId?.slice(-8)}</span></p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'adminId',
      header: 'Performed By',
      render: (log) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
            <User size={12} className="text-gray-600" />
          </div>
          <div>
            <p className="text-sm text-gray-900">{log.adminName || log.adminEmail || log.adminId?.slice(-8)}</p>
            <p className="text-xs text-gray-500">{log.adminRole || 'Admin'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'locationId',
      header: 'Location',
      render: (log) => (
        <span className="text-sm text-gray-500">
          {log.locationId ? (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              <span className="font-mono">{log.locationId.slice(-8)}</span>
            </span>
          ) : (
            <span className="text-gray-400">Global</span>
          )}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'When',
      render: (log) => (
        <div>
          <p className="text-sm text-gray-700">{formatRelativeTime(log.createdAt)}</p>
          <p className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'details',
      header: '',
      render: (log) => (
        <button onClick={(e) => { e.stopPropagation(); setSelectedLog(log); setShowDetail(true); }}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="View details">
          <ExternalLink size={14} className="text-gray-400" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" description="Track all administrative actions across the platform" />

      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          <span className="text-sm text-gray-500">Total entries: <span className="font-medium text-gray-900">{meta?.total || 0}</span></span>
        </div>
        <div className="w-px h-4 bg-gray-300" />
        <span className="text-sm text-gray-500">Showing page {page} of {meta?.totalPages || 1}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by admin, resource ID..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none">
            <option value="">All actions</option>
            {ACTION_TYPES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={resourceFilter} onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none">
            <option value="">All resources</option>
            {RESOURCE_TYPES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <DataTable columns={columns} data={logs || []} meta={meta} isLoading={isLoading} currentPage={page} onPageChange={setPage}
        emptyMessage="No audit log entries found" onRowClick={(log) => { setSelectedLog(log); setShowDetail(true); }} />

      <Modal isOpen={showDetail} onClose={() => { setShowDetail(false); setSelectedLog(null); }} title="Audit Log Entry" size="lg">
        {selectedLog && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = getActionIcon(selectedLog.action);
                const colorClass = getActionColor(selectedLog.action);
                return (
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                    <Icon size={18} />
                  </div>
                );
              })()}
              <div>
                <h3 className="font-semibold text-gray-900">{selectedLog.action.replace(/_/g, ' ')}</h3>
                <p className="text-sm text-gray-500">{formatDateTime(selectedLog.createdAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs uppercase font-medium mb-1">Admin</p>
                <p className="text-gray-900 font-medium">{selectedLog.adminName || selectedLog.adminEmail}</p>
                <p className="text-gray-500 font-mono text-xs">{selectedLog.adminId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs uppercase font-medium mb-1">Role</p>
                <p className="text-gray-900 font-medium">{selectedLog.adminRole || 'Admin'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs uppercase font-medium mb-1">Resource Type</p>
                <p className="text-gray-900 font-medium">{selectedLog.resourceType}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs uppercase font-medium mb-1">Resource ID</p>
                <p className="text-gray-900 font-mono text-xs">{selectedLog.resourceId}</p>
              </div>
              {selectedLog.locationId && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs uppercase font-medium mb-1">Location</p>
                  <p className="text-gray-900 font-mono text-xs">{selectedLog.locationId}</p>
                </div>
              )}
              {selectedLog.ipAddress && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs uppercase font-medium mb-1">IP Address</p>
                  <p className="text-gray-900 font-mono text-xs">{selectedLog.ipAddress}</p>
                </div>
              )}
            </div>

            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Changes</p>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-green-400 font-mono">{JSON.stringify(selectedLog.changes, null, 2)}</pre>
                </div>
              </div>
            )}

            {selectedLog.reason && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs font-medium text-yellow-700 uppercase mb-1">Reason</p>
                <p className="text-sm text-yellow-800">{selectedLog.reason}</p>
              </div>
            )}

            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Additional Metadata</p>
                <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-gray-700 font-mono">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
