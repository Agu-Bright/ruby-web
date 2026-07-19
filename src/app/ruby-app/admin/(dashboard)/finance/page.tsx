'use client';

import { useState, useMemo } from 'react';
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
  X,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader, DataTable, Modal, StatusBadge, type Column } from '@/components/ui';
// P80 — replaced the single-provider SmsHealthCard with the chain-aware
// MessagingHealthCard. The new card handles BOTH SMS and WhatsApp; we
// just render it twice with different `channel` props. SmsHealthCard.tsx
// stays in the repo until the next release for safety, but it's no
// longer rendered anywhere.
import { MessagingHealthCard } from './MessagingHealthCard';
import { DeoluHealthCard } from './DeoluHealthCard';
import { WebSearchHealthCard } from './WebSearchHealthCard';
import type {
  Payout,
  PayoutStatus,
  PayoutStats,
  LedgerEntry,
  Wallet as WalletType,
  FeeConfig,
  FeeType,
} from '@/lib/types';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/utils';

const FEE_TYPES: { value: FeeType; label: string }[] = [
  { value: 'ORDER_PLATFORM_FEE', label: 'Order Platform Fee' },
  { value: 'BOOKING_PLATFORM_FEE', label: 'Booking Platform Fee' },
  { value: 'PAYMENT_PROCESSING_FEE', label: 'Payment Processing Fee' },
  { value: 'DELIVERY_PLATFORM_FEE', label: 'Delivery Platform Fee' },
  // Phase 40 — Ruby+'s per-ticket commission. percentage = X%, flatFee = ₦Y.
  // Default (no row) = 5% + ₦200.
  { value: 'EVENT_TICKET_PLATFORM_FEE', label: 'Event Ticket Platform Fee' },
  // Phase 16 — Nigerian VAT (7.5% on platform fees by default).
  { value: 'VAT', label: 'VAT (Nigerian)' },
];

const getFeeTypeLabel = (type: string) => FEE_TYPES.find(f => f.value === type)?.label || type.replace(/_/g, ' ');

type Tab = 'payouts' | 'ledger' | 'wallets' | 'fees';

const PAYOUT_STATUSES: PayoutStatus[] = ['PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED'];

export default function FinancePage() {
  const { admin, isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('payouts');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState<LedgerEntry | null>(null);

  // Fee config state
  const [selectedFee, setSelectedFee] = useState<FeeConfig | null>(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);

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
    refetch: refetchFees,
  } = useApi<FeeConfig[]>(
    () => api.feeConfigs.list({ page, limit: 20 }),
    [page],
  );

  // Categories drive the CATEGORY-scope commission picker + row rendering.
  const { data: categories } = useApi<import('@/lib/types').Category[]>(
    () => api.categories.list({ isActive: true }),
    [],
  );
  const categoryMap = useMemo(() => {
    const m = new Map<string, string>();
    (categories || []).forEach(c => m.set(c._id, c.name));
    return m;
  }, [categories]);

  const { data: payoutStats } = useApi<PayoutStats>(
    () => api.payouts.stats(),
    [],
  );

  const handlePayoutAction = async (payout: Payout, action: string) => {
    setActionLoading(true);
    try {
      switch (action) {
        case 'RETRY':
          await api.payouts.process(payout._id);
          break;
        case 'COMPLETE':
          await api.payouts.complete(payout._id);
          break;
      }
      toast.success(`Payout ${action.toLowerCase()}d successfully`);
      refetchPayouts();
      setShowDetailModal(false);
    } catch {
      toast.error(`Failed to ${action.toLowerCase()} payout`);
    } finally {
      setActionLoading(false);
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

  // ─── Fee CRUD Handlers ─────────────────────────────────
  const handleSaveFee = async (data: Partial<FeeConfig>) => {
    const isEdit = !!selectedFee;
    setFeeLoading(true);
    try {
      if (isEdit) {
        // Backend UpdateFeeConfigDto only accepts mutable fields —
        // feeType/scope are immutable. P58-followup: percentage is now
        // editable (was being silently dropped on update, leaving the
        // 5% Ruby+ commission + 7.5% VAT permanently frozen at seed
        // values).
        await api.feeConfigs.update(selectedFee._id, {
          flatFee: data.flatFee,
          percentage: data.percentage,
          isActive: data.isActive,
        });
        toast.success('Fee configuration updated');
      } else {
        await api.feeConfigs.create(data);
        toast.success('Fee configuration created');
      }
      setShowFeeModal(false);
      setSelectedFee(null);
      refetchFees();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(isEdit ? `Update failed: ${message}` : `Create failed: ${message}`);
    } finally {
      setFeeLoading(false);
    }
  };

  const handleDeleteFee = async () => {
    if (!selectedFee) return;
    setFeeLoading(true);
    try {
      await api.feeConfigs.delete(selectedFee._id);
      toast.success('Fee configuration deleted');
      setShowDeleteConfirm(false);
      setSelectedFee(null);
      refetchFees();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(`Delete failed: ${message}`);
    } finally {
      setFeeLoading(false);
    }
  };

  const feeColumns: Column<FeeConfig>[] = [
    {
      key: 'feeType',
      header: 'Fee Type',
      render: (f) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{getFeeTypeLabel(f.feeType ?? '')}</p>
          {f.scope === 'CATEGORY' && (
            <span className="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
              {categoryMap.get(typeof f.categoryId === 'string' ? f.categoryId : '') || 'Category'}
            </span>
          )}
          {f.scope === 'GLOBAL' && (
            <span className="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
              Global
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'percentage',
      header: 'Rate (%)',
      render: (f) =>
        (f.percentage ?? 0) > 0 ? (
          <span className="text-sm font-semibold text-gray-900">{f.percentage}%</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      key: 'flatFee',
      header: 'Flat Fee (NGN)',
      render: (f) => (
        <span className="text-sm font-semibold text-gray-900">{formatCurrency(f.flatFee ?? 0)}</span>
      ),
    },
    { key: 'isActive', header: 'Status', render: (f) => <StatusBadge status={f.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions',
      header: '',
      render: (f) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setSelectedFee(f); setShowFeeModal(true); }}
            className="p-1.5 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
            <Pencil size={14} className="text-blue-600" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setSelectedFee(f); setShowDeleteConfirm(true); }}
            className="p-1.5 hover:bg-red-50 rounded-md transition-colors" title="Delete">
            <Trash2 size={14} className="text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  const tabs_list: { key: Tab; label: string; icon: typeof Wallet }[] = [
    { key: 'payouts', label: 'Payouts', icon: ArrowUpRight },
    { key: 'ledger', label: 'Ledger', icon: TrendingUp },
    { key: 'wallets', label: 'Wallets', icon: Wallet },
    { key: 'fees', label: 'Fee Configs', icon: DollarSign },
  ];

  const processingCount = payoutStats?.pendingCount ?? 0;
  const completedCount = payoutStats?.completedCount ?? 0;
  const failedCount = payoutStats?.failedCount ?? 0;
  const totalRequested = payoutStats?.totalRequested ?? 0;

  return (
    <div>
      <PageHeader title="Finance" description="Manage payouts, transactions, wallets, and fee configurations" />

      {/* P80 — chain-aware health cards (SMS + WhatsApp). Replace the
          P70 single-provider SmsHealthCard. Sit above payout stats so a
          silent OTP outage is the first thing visible when opening Finance. */}
      <MessagingHealthCard channel="SMS" />
      <MessagingHealthCard channel="WHATSAPP" />

      {/* P77 (f) — Deolu search-pipeline health. Catches the three failures
          that cause the "no merchants" canned-reply loop: missing Atlas
          index, businesses without embeddings, end-to-end canary returning
          zero. Lets ops triage from one page instead of grepping logs. */}
      <DeoluHealthCard />

      {/* P100 — Web Search (Google CSE) health. Surfaces provider
          config status + Mongo cache effectiveness so ops can see
          quota burn rate at a glance. Misconfig banner spells out the
          two env vars the backend needs. */}
      <WebSearchHealthCard />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Withdrawals', count: totalRequested, sub: formatCurrency(payoutStats?.totalAmount ?? 0), color: 'yellow', Icon: Clock },
          { label: 'Processing', count: processingCount, sub: formatCurrency(payoutStats?.pendingAmount ?? 0), color: 'blue', Icon: RefreshCw },
          { label: 'Completed', count: completedCount, sub: formatCurrency(payoutStats?.completedAmount ?? 0), color: 'green', Icon: CheckCircle2 },
          { label: 'Failed', count: failedCount, sub: undefined as string | undefined, color: 'red', Icon: AlertTriangle },
        ].map(({ label, count, sub, color, Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center`}>
                <Icon size={18} className={`text-${color}-600`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-xl font-bold text-gray-900">{count}</p>
                {sub && <p className="text-xs text-gray-400">{sub}</p>}
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
              className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none">
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
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
        )}
        {tab === 'fees' && (
          <>
            <div className="flex-1" />
            <button onClick={() => { setSelectedFee(null); setShowFeeModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
              <Plus size={15} /> Add Fee Config
            </button>
          </>
        )}
      </div>

      {tab === 'payouts' && <DataTable columns={payoutColumns} data={payouts || []} meta={payoutsMeta} isLoading={payoutsLoading} currentPage={page} onPageChange={setPage} emptyMessage="No payout requests found" onRowClick={(p) => { setSelectedPayout(p); setShowDetailModal(true); }} />}
      {tab === 'ledger' && <DataTable columns={ledgerColumns} data={ledger || []} meta={ledgerMeta} isLoading={ledgerLoading} currentPage={page} onPageChange={setPage} emptyMessage="No ledger entries found" onRowClick={(entry) => setSelectedLedgerEntry(entry)} />}
      {tab === 'wallets' && <DataTable columns={walletColumns} data={wallets || []} meta={walletsMeta} isLoading={walletsLoading} currentPage={page} onPageChange={setPage} emptyMessage="No wallets found" />}
      {tab === 'fees' && <DataTable columns={feeColumns} data={fees || []} meta={feesMeta} isLoading={feesLoading} currentPage={page} onPageChange={setPage} emptyMessage="No fee configurations found" onRowClick={(f) => { setSelectedFee(f); setShowFeeModal(true); }} />}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedPayout.amount, selectedPayout.currency)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Method</p>
                <p className="text-lg font-medium text-gray-900">{selectedPayout.method || 'Bank Transfer'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
            {selectedPayout.status === 'FAILED' && (
              <div className="pt-4 border-t border-gray-200">
                <button onClick={() => handlePayoutAction(selectedPayout, 'RETRY')} disabled={actionLoading}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">Retry Payout</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Ledger Entry Detail Modal */}
      {selectedLedgerEntry && (
        <LedgerDetailModal
          entry={selectedLedgerEntry}
          onClose={() => setSelectedLedgerEntry(null)}
        />
      )}

      {/* Fee Config Create/Edit Modal */}
      {showFeeModal && (
        <FeeConfigModal
          fee={selectedFee}
          categories={categories || []}
          isLoading={feeLoading}
          onSave={handleSaveFee}
          onClose={() => { setShowFeeModal(false); setSelectedFee(null); }}
        />
      )}

      {/* Fee Delete Confirmation */}
      <Modal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setSelectedFee(null); }} title="Delete Fee Config" size="sm">
        <div className="space-y-4">
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Are you sure you want to delete this fee configuration? This action cannot be undone.
            </p>
          </div>
          {selectedFee && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-900">{getFeeTypeLabel(selectedFee.feeType ?? '')}</p>
              <p className="text-gray-500">Flat fee: {formatCurrency(selectedFee.flatFee ?? 0)}</p>
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => { setShowDeleteConfirm(false); setSelectedFee(null); }}
              className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleDeleteFee} disabled={feeLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
              {feeLoading && <Loader2 size={14} className="animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Ledger Detail Modal ──────────────────────────────────

const TX_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Wallet Top-up',
  WITHDRAWAL: 'Withdrawal',
  ORDER_PAYMENT: 'Order Payment',
  BOOKING_PAYMENT: 'Booking Payment',
  TRANSFER_IN: 'Money Received',
  TRANSFER_OUT: 'Money Sent',
  REFUND_RECEIVED: 'Refund Received',
  REFUND_ISSUED: 'Refund Issued',
  PAYMENT_RECEIVED: 'Payment Received',
  PLATFORM_FEE: 'Platform Fee',
  DELIVERY_FEE: 'Delivery Fee',
  PAYOUT: 'Payout',
  PAYOUT_REVERSAL: 'Payout Reversal',
  CANCELLATION_FEE: 'Cancellation Fee',
  AD_PURCHASE: 'Ad Purchase',
  AD_REFUND: 'Ad Refund',
  ADJUSTMENT_CREDIT: 'Adjustment (Credit)',
  ADJUSTMENT_DEBIT: 'Adjustment (Debit)',
};

const TX_STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
  REVERSED: 'bg-gray-100 text-gray-700',
};

function LedgerDetailModal({
  entry, onClose,
}: {
  entry: LedgerEntry; onClose: () => void;
}) {
  const isCredit = entry.direction === 'CREDIT' || entry.type === 'CREDIT';
  const typeLabel = TX_TYPE_LABELS[entry.referenceType] || entry.referenceType?.replace(/_/g, ' ') || entry.type;
  const status = entry.status || 'COMPLETED';
  const meta = entry.metadata || {};

  const senderName = (meta.customerName as string) || (meta.senderName as string) || null;
  const receiverName = (meta.businessName as string) || (meta.receiverName as string) || null;

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Type', value: typeLabel },
    { label: 'Description', value: entry.description || '—' },
    ...(senderName ? [{ label: 'From', value: senderName }] : []),
    ...(receiverName ? [{ label: 'To', value: receiverName }] : []),
    { label: 'Amount', value: `${isCredit ? '+' : '-'}${formatCurrency(entry.amount, entry.currency)}` },
    { label: 'Balance Before', value: formatCurrency(entry.balanceBefore, entry.currency) },
    { label: 'Balance After', value: formatCurrency(entry.balanceAfter, entry.currency) },
    { label: 'Currency', value: entry.currency || 'NGN' },
    ...(entry.transactionRef ? [{ label: 'Reference', value: entry.transactionRef, mono: true }] : []),
    { label: 'Reference Type', value: entry.referenceType || '—' },
    ...(entry.referenceId ? [{ label: 'Reference ID', value: entry.referenceId, mono: true }] : []),
    { label: 'Wallet ID', value: entry.walletId, mono: true },
    { label: 'Date & Time', value: formatDateTime(entry.createdAt) },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-slide-up max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Ledger Entry Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {/* Amount hero */}
          <div className="text-center mb-5">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isCredit ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {isCredit ? <ArrowDownLeft className="w-5 h-5 text-emerald-600" /> : <ArrowUpRight className="w-5 h-5 text-red-600" />}
            </div>
            <p className={`text-2xl font-bold ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
              {isCredit ? '+' : '-'}{formatCurrency(entry.amount, entry.currency)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{typeLabel}</p>
            <span className={`inline-block mt-2 px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${TX_STATUS_STYLES[status] || TX_STATUS_STYLES.COMPLETED}`}>
              {status}
            </span>
          </div>

          {/* Detail rows */}
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between py-2.5">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">{row.label}</span>
                <span className={`text-sm text-gray-800 font-medium text-right max-w-[60%] break-all ${row.mono ? 'font-mono text-xs' : ''}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Metadata */}
          {Object.keys(meta).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Metadata</p>
              <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 break-all whitespace-pre-wrap">
                {JSON.stringify(meta, null, 2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Fee Config Create/Edit Modal ───────────────────────

function FeeConfigModal({
  fee,
  categories,
  isLoading,
  onSave,
  onClose,
}: {
  fee: FeeConfig | null;
  categories: import('@/lib/types').Category[];
  isLoading: boolean;
  onSave: (data: Partial<FeeConfig>) => void;
  onClose: () => void;
}) {
  const isEdit = !!fee;

  const [feeType, setFeeType] = useState<FeeType>(fee?.feeType || 'ORDER_PLATFORM_FEE');
  const [scope, setScope] = useState<'GLOBAL' | 'CATEGORY'>(fee?.scope === 'CATEGORY' ? 'CATEGORY' : 'GLOBAL');
  const [categoryId, setCategoryId] = useState<string>(
    typeof fee?.categoryId === 'string' ? fee.categoryId : '',
  );
  const [flatFee, setFlatFee] = useState(fee?.flatFee?.toString() || '');
  // P58-followup — previously the modal only edited flatFee and hardcoded
  // percentage: 0. That meant the EVENT_TICKET_PLATFORM_FEE (5% + ₦200
  // default) and VAT (7.5%) could never be tuned from the admin UI —
  // they were stuck at whatever the seed/migration set. Now both are
  // editable. Defaults to 0 for new configs so the existing "flat fee
  // only" workflow keeps working without surprises.
  const [percentage, setPercentage] = useState(
    fee?.percentage !== undefined ? fee.percentage.toString() : '',
  );
  const [isActive, setIsActive] = useState(fee?.isActive ?? true);

  // CATEGORY scope only makes sense for the per-merchant-commission fee
  // type (ORDER_PLATFORM_FEE). VAT / event-ticket / delivery are global.
  const scopePickerEnabled = feeType === 'ORDER_PLATFORM_FEE';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const flat = parseFloat(flatFee || '0');
    const pct = parseFloat(percentage || '0');
    if (isNaN(flat) || flat < 0) {
      toast.error('Please enter a valid flat fee amount');
      return;
    }
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('Percentage must be between 0 and 100');
      return;
    }
    if (flat === 0 && pct === 0) {
      toast.error('Set a flat fee, a percentage, or both — at least one must be > 0');
      return;
    }
    if (scope === 'CATEGORY' && !categoryId) {
      toast.error('Pick a category for CATEGORY-scoped fees');
      return;
    }
    onSave({
      feeType,
      scope: scopePickerEnabled ? scope : 'GLOBAL',
      categoryId: scope === 'CATEGORY' && scopePickerEnabled ? categoryId : undefined,
      flatFee: flat,
      percentage: pct,
      isActive,
    });
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-slide-up flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit' : 'Add'} Fee</h2>
            <p className="text-xs text-gray-500 mt-0.5">Set a flat service fee charged on transactions</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Fee Type */}
          <div>
            <label className={labelCls}>Fee Type</label>
            <select value={feeType} onChange={(e) => setFeeType(e.target.value as FeeType)} className={inputCls} disabled={isEdit}>
              {FEE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Scope — only ORDER_PLATFORM_FEE supports per-category rates
              (that's the per-merchant commission on order/booking subtotal).
              Everything else is GLOBAL only. */}
          {scopePickerEnabled && (
            <div>
              <label className={labelCls}>Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as 'GLOBAL' | 'CATEGORY')}
                className={inputCls}
                disabled={isEdit}
              >
                <option value="GLOBAL">Global (fallback for all businesses)</option>
                <option value="CATEGORY">Category (per-category commission %)</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Category rates take priority over the Global fallback. If nothing matches, the built-in 10% default applies.
              </p>
            </div>
          )}

          {/* Category picker — required when scope is CATEGORY. */}
          {scopePickerEnabled && scope === 'CATEGORY' && (
            <div>
              <label className={labelCls}>Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputCls}
                disabled={isEdit}
              >
                <option value="">Choose a category…</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Percentage — for the event ticket platform fee (5%), VAT
              (7.5%), etc. Final fee = (transaction × percentage / 100)
              + flatFee. Most fee types use ONE of percentage or flatFee
              (not both), but the EVENT_TICKET_PLATFORM_FEE uses both. */}
          <div>
            <label className={labelCls}>Percentage (%)</label>
            <input
              type="number"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              min="0"
              max="100"
              step="0.5"
              placeholder="e.g. 5 for 5%"
              className={inputCls}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Charged as a percentage of the transaction value. For
              EVENT_TICKET_PLATFORM_FEE the default is 5%. For VAT it's
              7.5%. Set 0 to disable the percentage component.
            </p>
          </div>

          {/* Flat Fee */}
          <div>
            <label className={labelCls}>Flat Fee Amount (NGN)</label>
            <input type="number" value={flatFee} onChange={(e) => setFlatFee(e.target.value)}
              min="0" step="1" placeholder="e.g. 200" className={inputCls} />
            <p className="text-[10px] text-gray-400 mt-1">
              Fixed amount added on top of the percentage. For
              EVENT_TICKET_PLATFORM_FEE the default is ₦200. Set 0 to
              disable the flat component.
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Active</p>
              <p className="text-xs text-gray-500">Enable or disable this fee</p>
            </div>
            <button type="button" onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-red-600' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Fee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
