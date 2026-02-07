'use client';

import { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  ChevronDown,
  Eye,
  RefreshCw,
  Building2,
  CreditCard,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader, DataTable, Modal, StatusBadge, type Column } from '@/components/ui';
import type {
  Payout,
  PayoutStatus,
  LedgerEntry,
  Wallet as WalletType,
  FeeConfig,
} from '@/lib/types';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/utils';

type Tab = 'payouts' | 'ledger' | 'wallets' | 'fees';

const PAYOUT_STATUSES: PayoutStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];

export default function FinancePage() {
  const { admin, isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('payouts');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const {
    data: payouts,
    meta: payoutsMeta,
    isLoading: payoutsLoading,
    refetch: refetchPayouts,
  } = useApi<Payout[]>(
    () => api.payouts.list({ page, limit: 20, status: (statusFilter as PayoutStatus) || undefined }),
    [page, statusFilter],
  );

  const {
    data: ledger,
    meta: ledgerMeta,
    isLoading: ledgerLoading,
  } = useApi<LedgerEntry[]>(
    () => api.ledger.list({ page, limit: 20 }),
    [page],
  );

  const {
    data: wallets,
    meta: walletsMeta,
    isLoading: walletsLoading,
  } = useApi<WalletType[]>(
    () => api.wallets.list({ page, limit: 20, search: search || undefined }),
    [page, search],
  );

  const {
    data: fees,
    meta: feesMeta,
    isLoading: feesLoading,
  } = useApi<FeeConfig[]>(
    () => api.feeConfigs.list({ page, limit: 20 }),
    [page],
  );

  const payoutAction = useMutation<Payout, { id: string; action: string; reason?: string }>(
    ({ id, action, reason }) =>
      api.payouts.action(id, { action: action as 'APPROVE' | 'DENY' | 'RETRY', reason })
  );

  const handlePayoutAction = async (payout: Payout, action: string) => {
    const reason = action === 'DENY' ? prompt('Reason for denial:') : undefined;
    if (action === 'DENY' && !reason) return;
    try {
      await payoutAction.mutate({ id: payout._id, action, reason: reason || undefined });
      toast.success(`Payout ${action.toLowerCase()}d successfully`);
      refetchPayouts();
      setShowDetailModal(false);
    } catch {
      toast.error(`Failed to ${action.toLowerCase()} payout`);
    }
  };

  const payoutColumns: Column<Payout>[] = [
    {
      key: 'businessId',
      header: 'Business',
      render: (p) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <Building2 size={14} className="text-gray-500" />
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900 truncate max-w-[160px]">{p.businessId}</p>
            <p className="text-xs text-gray-500">{p.method || 'Bank Transfer'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (p) => (
        <span className="font-semibold text-gray-900">{formatCurrency(p.amount, p.currency)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'createdAt',
      header: 'Requested',
      render: (p) => <span className="text-sm text-gray-500">{formatRelativeTime(p.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setSelectedPayout(p); setShowDetailModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="View details">
            <Eye size={14} className="text-gray-500" />
          </button>
          {p.status === 'PENDING' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); handlePayoutAction(p, 'APPROVE'); }} className="p-1.5 hover:bg-green-50 rounded-md transition-colors" title="Approve">
                <CheckCircle2 size={14} className="text-green-600" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handlePayoutAction(p, 'DENY'); }} className="p-1.5 hover:bg-red-50 rounded-md transition-colors" title="Deny">
                <XCircle size={14} className="text-red-600" />
              </button>
            </>
          )}
          {p.status === 'FAILED' && (
            <button onClick={(e) => { e.stopPropagation(); handlePayoutAction(p, 'RETRY'); }} className="p-1.5 hover:bg-blue-50 rounded-md transition-colors" title="Retry">
              <RefreshCw size={14} className="text-blue-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const ledgerColumns: Column<LedgerEntry>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (e) => (
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${e.direction === 'CREDIT' ? 'bg-green-100' : 'bg-red-100'}`}>
            {e.direction === 'CREDIT' ? <ArrowDownLeft size={13} className="text-green-600" /> : <ArrowUpRight size={13} className="text-red-600" />}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{e.type.replace(/_/g, ' ')}</p>
            <p className="text-xs text-gray-500">{e.referenceType}: {e.referenceId?.slice(-8)}</p>
          </div>
        </div>
      ),
    },
    { key: 'walletId', header: 'Wallet', render: (e) => <span className="text-sm text-gray-600 font-mono">{e.walletId?.slice(-8)}</span> },
    {
      key: 'amount',
      header: 'Amount',
      render: (e) => (
        <span className={`font-semibold ${e.direction === 'CREDIT' ? 'text-green-700' : 'text-red-700'}`}>
          {e.direction === 'CREDIT' ? '+' : '-'}{formatCurrency(e.amount, e.currency)}
        </span>
      ),
    },
    { key: 'balanceAfter', header: 'Balance After', render: (e) => <span className="text-sm text-gray-500">{formatCurrency(e.balanceAfter || 0, e.currency)}</span> },
    { key: 'createdAt', header: 'Date', render: (e) => <span className="text-sm text-gray-500">{formatDateTime(e.createdAt)}</span> },
  ];

  const walletColumns: Column<WalletType>[] = [
    {
      key: 'ownerType',
      header: 'Owner',
      render: (w) => (
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${w.ownerType === 'BUSINESS' ? 'bg-blue-100' : 'bg-purple-100'}`}>
            {w.ownerType === 'BUSINESS' ? <Building2 size={14} className="text-blue-600" /> : <CreditCard size={14} className="text-purple-600" />}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{w.ownerType}</p>
            <p className="text-xs text-gray-500 font-mono">{w.ownerId?.slice(-8)}</p>
          </div>
        </div>
      ),
    },
    { key: 'balance', header: 'Balance', render: (w) => <span className="font-semibold text-gray-900">{formatCurrency(w.balance, w.currency)}</span> },
    { key: 'currency', header: 'Currency', render: (w) => <span className="text-sm text-gray-600">{w.currency}</span> },
    { key: 'status', header: 'Status', render: (w) => <StatusBadge status={w.status || 'ACTIVE'} /> },
    { key: 'updatedAt', header: 'Last Updated', render: (w) => <span className="text-sm text-gray-500">{formatRelativeTime(w.updatedAt)}</span> },
  ];

  const feeColumns: Column<FeeConfig>[] = [
    {
      key: 'name',
      header: 'Fee Config',
      render: (f) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{f.name}</p>
          <p className="text-xs text-gray-500">{f.locationId ? `Location: ${f.locationId.slice(-8)}` : 'Global default'}</p>
        </div>
      ),
    },
    { key: 'scope', header: 'Scope', render: (f) => <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 rounded-full text-gray-700">{f.scope}</span> },
    { key: 'platformFeePercent', header: 'Platform Fee', render: (f) => <span className="text-sm text-gray-700">{f.platformFeePercent}%</span> },
    { key: 'deliveryFeeConfig', header: 'Delivery', render: (f) => <span className="text-sm text-gray-700">{f.deliveryFeeConfig ? f.deliveryFeeConfig.mode : '—'}</span> },
    { key: 'isActive', header: 'Status', render: (f) => <StatusBadge status={f.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
  ];

  const tabs_list: { key: Tab; label: string; icon: typeof Wallet }[] = [
    { key: 'payouts', label: 'Payouts', icon: ArrowUpRight },
    { key: 'ledger', label: 'Ledger', icon: TrendingUp },
    { key: 'wallets', label: 'Wallets', icon: Wallet },
    { key: 'fees', label: 'Fee Configs', icon: DollarSign },
  ];

  const pendingCount = payouts?.filter(p => p.status === 'PENDING').length || 0;
  const processingCount = payouts?.filter(p => p.status === 'PROCESSING').length || 0;
  const completedCount = payouts?.filter(p => p.status === 'COMPLETED').length || 0;
  const failedCount = payouts?.filter(p => p.status === 'FAILED').length || 0;

  return (
    <div>
      <PageHeader title="Finance" description="Manage payouts, transactions, wallets, and fee configurations" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Payouts', count: pendingCount, color: 'yellow', Icon: Clock },
          { label: 'Processing', count: processingCount, color: 'blue', Icon: RefreshCw },
          { label: 'Completed', count: completedCount, color: 'green', Icon: CheckCircle2 },
          { label: 'Failed', count: failedCount, color: 'red', Icon: AlertTriangle },
        ].map(({ label, count, color, Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center`}>
                <Icon size={18} className={`text-${color}-600`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-xl font-bold text-gray-900">{count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {tabs_list.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        {tab === 'payouts' && (
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none">
              <option value="">All statuses</option>
              {PAYOUT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
        {tab === 'wallets' && (
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search wallets..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
        )}
      </div>

      {tab === 'payouts' && <DataTable columns={payoutColumns} data={payouts || []} meta={payoutsMeta} isLoading={payoutsLoading} currentPage={page} onPageChange={setPage} emptyMessage="No payout requests found" onRowClick={(p) => { setSelectedPayout(p); setShowDetailModal(true); }} />}
      {tab === 'ledger' && <DataTable columns={ledgerColumns} data={ledger || []} meta={ledgerMeta} isLoading={ledgerLoading} currentPage={page} onPageChange={setPage} emptyMessage="No ledger entries found" />}
      {tab === 'wallets' && <DataTable columns={walletColumns} data={wallets || []} meta={walletsMeta} isLoading={walletsLoading} currentPage={page} onPageChange={setPage} emptyMessage="No wallets found" />}
      {tab === 'fees' && <DataTable columns={feeColumns} data={fees || []} meta={feesMeta} isLoading={feesLoading} currentPage={page} onPageChange={setPage} emptyMessage="No fee configurations found" />}

      <Modal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedPayout(null); }} title="Payout Details" size="lg">
        {selectedPayout && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Payout ID</p>
                <p className="font-mono text-sm text-gray-900">{selectedPayout._id}</p>
              </div>
              <StatusBadge status={selectedPayout.status} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedPayout.amount, selectedPayout.currency)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Method</p>
                <p className="text-lg font-medium text-gray-900">{selectedPayout.method || 'Bank Transfer'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Business ID</p><p className="font-mono text-gray-900">{selectedPayout.businessId}</p></div>
              <div><p className="text-gray-500">Location ID</p><p className="font-mono text-gray-900">{selectedPayout.locationId}</p></div>
              <div><p className="text-gray-500">Requested</p><p className="text-gray-900">{formatDateTime(selectedPayout.createdAt)}</p></div>
              {selectedPayout.processedAt && <div><p className="text-gray-500">Processed</p><p className="text-gray-900">{formatDateTime(selectedPayout.processedAt)}</p></div>}
            </div>
            {selectedPayout.bankDetails && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Bank Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-gray-500">Bank</p><p className="text-gray-900">{selectedPayout.bankDetails.bankName}</p></div>
                  <div><p className="text-gray-500">Account</p><p className="text-gray-900">{selectedPayout.bankDetails.accountNumber}</p></div>
                  <div><p className="text-gray-500">Account Name</p><p className="text-gray-900">{selectedPayout.bankDetails.accountName}</p></div>
                </div>
              </div>
            )}
            {(selectedPayout.reason || selectedPayout.rejectionReason) && (
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-xs font-medium text-red-600 uppercase mb-1">Reason</p>
                <p className="text-sm text-red-800">{selectedPayout.reason || selectedPayout.rejectionReason}</p>
              </div>
            )}
            {selectedPayout.status === 'PENDING' && (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button onClick={() => handlePayoutAction(selectedPayout, 'APPROVE')} disabled={payoutAction.isLoading}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">Approve Payout</button>
                <button onClick={() => handlePayoutAction(selectedPayout, 'DENY')} disabled={payoutAction.isLoading}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">Deny Payout</button>
              </div>
            )}
            {selectedPayout.status === 'FAILED' && (
              <div className="pt-4 border-t border-gray-200">
                <button onClick={() => handlePayoutAction(selectedPayout, 'RETRY')} disabled={payoutAction.isLoading}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">Retry Payout</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
