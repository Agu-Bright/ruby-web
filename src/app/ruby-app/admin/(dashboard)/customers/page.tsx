'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Search, UserCircle, Users, UserCheck, UserX, UserPlus,
  Eye, Power, Trash2, Mail, Phone, Calendar, Clock,
  Shield, MapPin, Heart, AlertCircle, ChevronDown, ChevronLeft, ChevronRight,
  RefreshCw, Wallet, ArrowUpRight, ArrowDownLeft,
  Plus, X, DollarSign, BadgeCheck, PhoneCall,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useApi, useMutation } from '@/lib/hooks';
import { StatCard, Modal, DataTable, type Column } from '@/components/ui';
import { formatDate, formatDateTime, formatCurrency, getInitials } from '@/lib/utils';
import type { Customer, CustomerFilterParams, CustomerStats, Wallet as WalletType, LedgerEntry } from '@/lib/types';

// ─── Inline UI Components ───────────────────────────────────

function DetailCard({
  icon: Icon, label, value,
}: {
  icon: React.ElementType; label: string; value: string;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3 text-gray-400" />
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className="text-sm text-gray-800 font-medium capitalize">{value || '—'}</p>
    </div>
  );
}

function ActionButton({
  icon: Icon, tooltip, onClick, variant,
}: {
  icon: React.ElementType; tooltip: string; onClick: (e: React.MouseEvent) => void; variant: 'default' | 'blue' | 'green' | 'red';
}) {
  const styles = {
    default: 'hover:bg-gray-100 text-gray-500 hover:text-gray-700',
    blue: 'hover:bg-blue-50 text-gray-500 hover:text-blue-600',
    green: 'hover:bg-emerald-50 text-gray-500 hover:text-emerald-600',
    red: 'hover:bg-red-50 text-gray-500 hover:text-red-600',
  };
  return (
    <button onClick={onClick} className={`p-2 rounded-lg transition-all duration-200 ${styles[variant]}`} title={tooltip}>
      <Icon className="w-4 h-4" />
    </button>
  );
}

function getProviderBadge(provider?: string) {
  switch (provider) {
    case 'google':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Google</span>;
    case 'apple':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-800 border border-gray-200">Apple</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Email</span>;
  }
}

type CustomerAction = 'activate' | 'deactivate' | 'delete';

// ─── Main Page ──────────────────────────────────────────────

export default function CustomersPage() {
  const { isSuperAdmin } = useAuth();
  const [filters, setFilters] = useState<CustomerFilterParams>({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState<'profile' | 'wallet' | 'addresses' | 'activity'>('profile');
  const [actionModal, setActionModal] = useState<{ customer: Customer; action: CustomerAction } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Server-side list fetch
  const { data: customers, meta, isLoading, error, refetch } = useApi<Customer[]>(
    () => api.customers.list({ ...filters, search: search || undefined }),
    [filters, search],
  );

  // Full detail fetch
  const { data: fullDetail, isLoading: loadingDetail } = useApi<Customer>(
    () => detailCustomer ? api.customers.get(detailCustomer._id) : Promise.resolve({ success: true, data: detailCustomer! }),
    [detailCustomer?._id],
  );
  const displayCustomer = fullDetail || detailCustomer;

  // Mutations
  const { mutate: activateCustomer, isLoading: activating } = useMutation(
    ({ id }: { id: string }) => api.customers.activate(id),
  );
  const { mutate: deactivateCustomer, isLoading: deactivating } = useMutation(
    ({ id }: { id: string }) => api.customers.deactivate(id),
  );
  const { mutate: deleteCustomer, isLoading: deleting } = useMutation(
    ({ id }: { id: string }) => api.customers.delete(id),
  );
  const isProcessing = activating || deactivating || deleting;

  // Stats from dedicated backend endpoint
  const { data: customerStats, refetch: refetchStats } = useApi<CustomerStats>(
    () => api.customers.stats(),
    [],
  );
  const stats = customerStats || { total: 0, active: 0, inactive: 0, newThisMonth: 0 };

  // Action handler
  const handleAction = useCallback(async () => {
    if (!actionModal) return;
    const { customer, action } = actionModal;
    const name = `${customer.firstName} ${customer.lastName}`;
    let result;

    switch (action) {
      case 'activate':
        result = await activateCustomer({ id: customer._id });
        if (result) toast.success(`${name} has been activated`);
        break;
      case 'deactivate':
        result = await deactivateCustomer({ id: customer._id });
        if (result) toast.success(`${name} has been deactivated`);
        break;
      case 'delete':
        result = await deleteCustomer({ id: customer._id });
        if (result) toast.success(`${name} has been deleted`);
        break;
    }

    if (result) {
      setActionModal(null);
      setDeleteConfirmText('');
      refetch();
      refetchStats();
      if (detailCustomer?._id === customer._id) {
        setDetailCustomer(null);
      }
    }
  }, [actionModal, activateCustomer, deactivateCustomer, deleteCustomer, refetch, refetchStats, detailCustomer]);

  const openAction = (customer: Customer, action: CustomerAction) => {
    setActionModal({ customer, action });
    setDeleteConfirmText('');
  };

  // Column definitions
  const columns: Column<Customer>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (c) => (
        <div className="flex items-center gap-3">
          {c.avatarUrl ? (
            <img src={c.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ruby-400 to-ruby-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {getInitials(c.firstName, c.lastName)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-900 text-sm">{c.firstName} {c.lastName}</span>
              {c.isEmailVerified && <span title="Email verified"><BadgeCheck className="w-3.5 h-3.5 text-emerald-500" /></span>}
              {c.isPhoneVerified && <span title="Phone verified"><PhoneCall className="w-3.5 h-3.5 text-blue-500" /></span>}
            </div>
            <div className="text-xs text-gray-400">{c.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (c) => <span className="text-sm text-gray-500">{c.phone || '—'}</span>,
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (c) => getProviderBadge(c.authProvider),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit ${
          c.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          {c.isActive ? 'Active' : 'Inactive'}
        </div>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (c) => <span className="text-sm text-gray-500">{formatDate(c.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      render: (c) => (
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <ActionButton icon={Eye} tooltip="View details" onClick={(e) => { e.stopPropagation(); setDetailCustomer(c); setDetailTab('profile'); }} variant="blue" />
          <ActionButton
            icon={Power}
            tooltip={c.isActive ? 'Deactivate' : 'Activate'}
            onClick={(e) => { e.stopPropagation(); openAction(c, c.isActive ? 'deactivate' : 'activate'); }}
            variant={c.isActive ? 'red' : 'green'}
          />
          {isSuperAdmin && (
            <ActionButton icon={Trash2} tooltip="Delete" onClick={(e) => { e.stopPropagation(); openAction(c, 'delete'); }} variant="red" />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-ruby-500 to-ruby-700 rounded-xl flex items-center justify-center shadow-lg shadow-ruby-500/20">
          <UserCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage end-user accounts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats.total} icon={Users} />
        <StatCard title="Active" value={stats.active} icon={UserCheck} className="border-l-4 border-l-emerald-500" />
        <StatCard title="Inactive" value={stats.inactive} icon={UserX} className="border-l-4 border-l-red-400" />
        <StatCard title="New This Month" value={stats.newThisMonth} icon={UserPlus} className="border-l-4 border-l-blue-400" />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setFilters(f => ({ ...f, page: 1 })); }}
              className="input-field pl-10 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters(f => ({
                    ...f, page: 1,
                    isActive: val === 'all' ? undefined : val === 'active',
                  }));
                }}
                className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {/* Quick filter pill for inactive users */}
          {stats.inactive > 0 && filters.isActive !== false && (
            <button
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
              onClick={() => setFilters(f => ({ ...f, isActive: false, page: 1 }))}
            >
              {stats.inactive} inactive
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="card p-6 border-red-200 bg-gradient-to-r from-red-50 to-red-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Failed to load customers</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button onClick={() => refetch()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={customers || []}
        meta={meta}
        isLoading={isLoading}
        emptyMessage="No customers found"
        currentPage={filters.page}
        onPageChange={(page) => setFilters(f => ({ ...f, page }))}
        onRowClick={(c) => { setDetailCustomer(c); setDetailTab('profile'); }}
      />

      {/* ─── Detail Modal ─── */}
      <Modal isOpen={!!detailCustomer} onClose={() => setDetailCustomer(null)} title="Customer Details" size="xl">
        {displayCustomer && (
          <CustomerDetailView
            customer={displayCustomer}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            isSuperAdmin={isSuperAdmin}
            onOpenAction={(action) => { setDetailCustomer(null); openAction(displayCustomer, action); }}
          />
        )}
        {loadingDetail && !fullDetail && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-ruby-600 border-t-transparent rounded-full" />
          </div>
        )}
      </Modal>

      {/* ─── Action Confirmation Modal ─── */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); setDeleteConfirmText(''); }}
        title={
          actionModal?.action === 'activate' ? 'Activate Customer'
            : actionModal?.action === 'deactivate' ? 'Deactivate Customer'
            : 'Delete Customer'
        }
      >
        {actionModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {actionModal.action === 'activate'
                ? `Activate "${actionModal.customer.firstName} ${actionModal.customer.lastName}"? They will regain access to the platform.`
                : actionModal.action === 'deactivate'
                ? `Deactivate "${actionModal.customer.firstName} ${actionModal.customer.lastName}"? They will lose access immediately.`
                : `Permanently delete "${actionModal.customer.firstName} ${actionModal.customer.lastName}"? This action cannot be undone.`
              }
            </p>

            {actionModal.action === 'delete' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Type <strong className="text-red-600">{actionModal.customer.firstName} {actionModal.customer.lastName}</strong> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="input-field"
                  placeholder="Type customer name..."
                />
              </div>
            )}

            {actionModal.action === 'delete' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  This will permanently delete the customer account, wallet, and all associated data.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => { setActionModal(null); setDeleteConfirmText(''); }}>
                Cancel
              </button>
              <button
                className={
                  actionModal.action === 'activate'
                    ? 'btn-primary'
                    : 'px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors'
                }
                onClick={handleAction}
                disabled={
                  isProcessing ||
                  (actionModal.action === 'delete' && deleteConfirmText !== `${actionModal.customer.firstName} ${actionModal.customer.lastName}`)
                }
              >
                {isProcessing ? 'Processing...'
                  : actionModal.action === 'activate' ? 'Activate'
                  : actionModal.action === 'deactivate' ? 'Deactivate'
                  : 'Delete'
                }
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Customer Detail View ───────────────────────────────────

function CustomerDetailView({
  customer, detailTab, setDetailTab, isSuperAdmin, onOpenAction,
}: {
  customer: Customer;
  detailTab: 'profile' | 'wallet' | 'addresses' | 'activity';
  setDetailTab: (tab: 'profile' | 'wallet' | 'addresses' | 'activity') => void;
  isSuperAdmin: boolean;
  onOpenAction: (action: CustomerAction) => void;
}) {
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [showFundModal, setShowFundModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<LedgerEntry | null>(null);
  const [otpData, setOtpData] = useState<{ code: string; purpose: string; createdAt: string; expiresAt: string } | null>(null);
  const [otpLoading, setOtpLoading] = useState(true);

  const fetchOtp = useCallback(async () => {
    setOtpLoading(true);
    try {
      const res = await api.customers.getOtp(customer._id);
      setOtpData(res.data);
    } catch {
      setOtpData(null);
    } finally {
      setOtpLoading(false);
    }
  }, [customer._id]);

  useEffect(() => {
    fetchOtp();
  }, [fetchOtp]);

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res = await api.customers.getWallets(customer._id);
      const rawData = res.data;
      const wallets = Array.isArray(rawData) ? rawData : (Array.isArray((rawData as any)?.data) ? (rawData as any).data : []);
      setWallet(wallets.length > 0 ? wallets[0] : null);
    } catch {
      setWallet(null);
    } finally {
      setWalletLoading(false);
    }
  }, [customer._id]);

  const fetchTransactions = useCallback(async (walletId: string, page: number) => {
    setTxLoading(true);
    try {
      const txRes = await api.customers.getWalletTransactions(walletId, { limit: 10, page });
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      setTxTotal(txRes.meta?.total || 0);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    if (wallet) {
      fetchTransactions(wallet._id, txPage);
    }
  }, [wallet, txPage, fetchTransactions]);

  const txTotalPages = Math.ceil(txTotal / 10) || 1;

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
        {customer.avatarUrl ? (
          <img src={customer.avatarUrl} alt="" className="w-14 h-14 rounded-xl object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-ruby-500 to-ruby-700 flex items-center justify-center shadow-lg shadow-ruby-500/20 shrink-0">
            <span className="text-xl font-bold text-white">{getInitials(customer.firstName, customer.lastName)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="text-xl font-bold text-gray-900 truncate">{customer.firstName} {customer.lastName}</h3>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              customer.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${customer.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {customer.isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {customer.email}
              {customer.isEmailVerified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />}
            </span>
            {customer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {customer.phone}
                {customer.isPhoneVerified && <PhoneCall className="w-3.5 h-3.5 text-blue-500 ml-0.5" />}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {customer.authProvider && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                <Shield className="w-3 h-3" /> {customer.authProvider}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['profile', 'wallet', 'addresses', 'activity'] as const).map(tab => (
          <button
            key={tab}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              detailTab === tab ? 'border-ruby-600 text-ruby-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setDetailTab(tab)}
          >
            {tab}
            {tab === 'wallet' && wallet && (
              <span className="ml-1.5 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">
                {formatCurrency(wallet.balance, wallet.currency)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Profile */}
      {detailTab === 'profile' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <DetailCard icon={Calendar} label="Joined" value={formatDate(customer.createdAt)} />
            <DetailCard icon={Clock} label="Last Login" value={customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : 'Never'} />
            <DetailCard icon={Shield} label="Auth Provider" value={customer.authProvider || 'local'} />
            <DetailCard icon={UserCircle} label="Account Type" value={'customer'} />
            <DetailCard icon={MapPin} label="Saved Addresses" value={`${customer.savedAddresses?.length || 0} addresses`} />
            <DetailCard icon={Heart} label="Favorites" value={`${customer.favouriteBusinesses?.length || 0} businesses`} />
          </div>

          {/* Preferences */}
          {customer.preferences && (
            <div>
              <span className="text-xs text-gray-500 uppercase mb-2 block">Preferences</span>
              <div className="flex flex-wrap gap-2">
                {customer.preferences.language && (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-50 text-gray-700 border border-gray-200">
                    Language: {customer.preferences.language}
                  </span>
                )}
                {customer.preferences.currency && (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-50 text-gray-700 border border-gray-200">
                    Currency: {customer.preferences.currency}
                  </span>
                )}
                {customer.preferences.notifications && (
                  <>
                    {customer.preferences.notifications.email && (
                      <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">Email Notifications</span>
                    )}
                    {customer.preferences.notifications.push && (
                      <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200">Push Notifications</span>
                    )}
                    {customer.preferences.notifications.sms && (
                      <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 border border-purple-200">SMS Notifications</span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Verification status */}
          <div>
            <span className="text-xs text-gray-500 uppercase mb-2 block">Verification</span>
            <div className="flex gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                customer.isEmailVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}>
                <Mail className="w-3.5 h-3.5" />
                Email {customer.isEmailVerified ? 'Verified' : 'Unverified'}
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                customer.isPhoneVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}>
                <Phone className="w-3.5 h-3.5" />
                Phone {customer.isPhoneVerified ? 'Verified' : 'Unverified'}
              </div>
            </div>
          </div>

          {/* Active OTP Code (admin visibility) */}
          {!otpLoading && otpData && (
            <div>
              <span className="text-xs text-gray-500 uppercase mb-2 block">Active OTP Code</span>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                    otpData.purpose === 'EMAIL_VERIFICATION'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {otpData.purpose === 'EMAIL_VERIFICATION' ? 'Email Verification' : 'Password Reset'}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(otpData.code);
                      toast.success('OTP copied to clipboard');
                    }}
                    className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-3xl font-mono font-bold text-amber-900 tracking-[0.3em] text-center mb-3">
                  {otpData.code}
                </p>
                <div className="flex items-center justify-between text-[11px] text-amber-700">
                  <span>Created: {formatDateTime(otpData.createdAt)}</span>
                  <span>Expires: {formatDateTime(otpData.expiresAt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Wallet */}
      {detailTab === 'wallet' && (
        <div className="space-y-5">
          {walletLoading ? (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="h-20 flex-1 bg-gray-100 rounded-xl" />
            </div>
          ) : wallet ? (
            <>
              {/* Frozen warning */}
              {wallet.status === 'FROZEN' && (
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
                    <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">Balance</p>
                    <p className="text-2xl font-bold text-emerald-800 mt-1">{formatCurrency(wallet.balance, wallet.currency)}</p>
                    <p className="text-[11px] text-emerald-500 mt-1">{wallet.status || 'ACTIVE'} · {wallet.currency}</p>
                  </div>
                  <button
                    onClick={() => setShowFundModal(true)}
                    disabled={wallet.status === 'FROZEN'}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" /> Add Funds
                  </button>
                </div>
              </div>

              {/* Transactions */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Transactions</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">{txTotal} total transactions</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  {txLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                          <div className="flex-1 space-y-1"><div className="h-3 bg-gray-100 rounded w-2/3" /><div className="h-2 bg-gray-50 rounded w-1/3" /></div>
                          <div className="h-4 bg-gray-100 rounded w-16" />
                        </div>
                      ))}
                    </div>
                  ) : transactions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((tx) => {
                        const isCredit = tx.direction === 'CREDIT' || tx.type === 'CREDIT';
                        return (
                          <button
                            key={tx._id}
                            onClick={() => setSelectedTx(tx)}
                            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-100/50 transition-colors text-left cursor-pointer"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCredit ? 'bg-emerald-100' : 'bg-red-100'}`}>
                              {isCredit ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-red-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 font-medium truncate">{tx.description || tx.referenceType}</p>
                              <p className="text-[11px] text-gray-400">{formatDateTime(tx.createdAt)}</p>
                            </div>
                            <div className={`text-sm font-semibold ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isCredit ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Transaction pagination */}
                  {txTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Page {txPage} of {txTotalPages}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setTxPage(p => Math.max(1, p - 1))}
                          disabled={txPage <= 1}
                          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setTxPage(p => Math.min(txTotalPages, p + 1))}
                          disabled={txPage >= txTotalPages}
                          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
              <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No wallet found</p>
              <p className="text-xs text-gray-400 mt-1">A wallet will be created when the customer makes their first transaction</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Addresses */}
      {detailTab === 'addresses' && (
        <div className="space-y-4">
          {customer.savedAddresses && customer.savedAddresses.length > 0 ? (
            <div className="space-y-2">
              {customer.savedAddresses.map((addr, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium text-gray-900">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] font-semibold text-ruby-600 bg-ruby-50 px-1.5 py-0.5 rounded">DEFAULT</span>
                    )}
                  </div>
                  <div className="text-gray-500 mt-1 ml-5">{addr.address}</div>
                  {(addr.city || addr.state) && (
                    <div className="text-gray-400 text-xs mt-0.5 ml-5">{[addr.city, addr.state].filter(Boolean).join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
              <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No saved addresses</p>
              <p className="text-xs text-gray-400 mt-1">Addresses will appear when the customer saves delivery locations</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Activity */}
      {detailTab === 'activity' && (
        <div className="space-y-5">
          {/* Emergency Contacts */}
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <Phone className="w-3.5 h-3.5 text-gray-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Emergency Contacts</h3>
            </div>
            {customer.emergencyContacts && customer.emergencyContacts.length > 0 ? (
              <div className="space-y-2 mt-3">
                {customer.emergencyContacts.map((contact, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{contact.name}</span>
                      <span className="text-gray-400 ml-2">({contact.relation})</span>
                    </div>
                    <div className="text-gray-500">{contact.phone}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-3">No emergency contacts set</p>
            )}
          </div>

          {/* Account info */}
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <UserCircle className="w-3.5 h-3.5 text-gray-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Account Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <DetailCard icon={Heart} label="Favourite Businesses" value={`${customer.favouriteBusinesses?.length || 0}`} />
              <DetailCard icon={AlertCircle} label="Emergency Contacts" value={`${customer.emergencyContacts?.length || 0}`} />
              <DetailCard icon={Calendar} label="Created" value={formatDateTime(customer.createdAt)} />
              <DetailCard icon={Clock} label="Updated" value={formatDateTime(customer.updatedAt)} />
            </div>
          </div>
        </div>
      )}

      {/* Actions Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {isSuperAdmin && (
            <button
              onClick={() => onOpenAction('delete')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete Account
            </button>
          )}
        </div>
        <button
          onClick={() => onOpenAction(customer.isActive ? 'deactivate' : 'activate')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            customer.isActive
              ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
          }`}
        >
          <Power className="w-4 h-4" />
          {customer.isActive ? 'Deactivate Account' : 'Activate Account'}
        </button>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <TransactionDetailModal
          entry={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}

      {/* Fund Wallet Modal */}
      {showFundModal && wallet && (
        <FundWalletModal
          wallet={wallet}
          customerName={`${customer.firstName} ${customer.lastName}`}
          onClose={() => setShowFundModal(false)}
          onSuccess={() => {
            setShowFundModal(false);
            fetchWallet();
            if (wallet) fetchTransactions(wallet._id, txPage);
          }}
        />
      )}
    </div>
  );
}

// ─── Fund Wallet Modal ──────────────────────────────────────

function FundWalletModal({
  wallet, customerName, onClose, onSuccess,
}: {
  wallet: WalletType; customerName: string; onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      toast.error('Minimum amount is NGN 100');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.customers.fundWallet(wallet._id, {
        amount: numAmount,
        currency: wallet.currency,
        description: description || `Admin funding for ${customerName}`,
      });
      toast.success(`Successfully funded ${formatCurrency(numAmount, wallet.currency)}`);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fund wallet';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Fund Wallet</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (NGN)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount (min 100)" min="100" step="1" required className="input-field" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={`Admin funding for ${customerName}`} className="input-field" />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              This action will immediately credit the wallet. This action is audited.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Funding...</>
              ) : (
                <><Plus className="w-4 h-4" /> Fund Wallet</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Transaction Detail Modal ──────────────────────────────

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

function TransactionDetailModal({
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
          <h2 className="text-base font-semibold text-gray-900">Transaction Details</h2>
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
