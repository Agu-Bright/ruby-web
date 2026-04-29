'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Search,
  Eye,
  Ban,
  CheckCircle,
  Edit2,
  TrendingUp,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X as XIcon,
  Loader2,
} from 'lucide-react';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, Modal, StatCard } from '@/components/ui';
import type {
  Marketer,
  MarketerFilterParams,
  MarketerStatus,
  MarketerType,
  CreateMarketerRequest,
} from '@/lib/types';

const PAGE_LIMIT = 25;

const TYPE_LABELS: Record<MarketerType, string> = {
  INFLUENCER: 'Influencer',
  MARKETER: 'Marketer',
  PARTNER: 'Partner',
};

const STATUS_STYLES: Record<MarketerStatus, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  INACTIVE: 'bg-gray-50 text-gray-700 border-gray-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
};

export default function MarketersPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<MarketerFilterParams>({
    page: 1,
    limit: PAGE_LIMIT,
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const {
    data: marketers,
    meta,
    isLoading,
    refetch,
  } = useApi<Marketer[]>(
    () => api.marketers.list(filters),
    [JSON.stringify(filters)],
  );

  const { mutate: createMarketer, isLoading: isCreating } = useMutation<
    Marketer,
    CreateMarketerRequest
  >((data) => api.marketers.create(data));

  const { mutate: suspendMarketer } = useMutation<Marketer, { id: string; reason?: string }>(
    ({ id, reason }) => api.marketers.suspend(id, reason),
  );
  const { mutate: reinstateMarketer } = useMutation<Marketer, { id: string }>(
    ({ id }) => api.marketers.reinstate(id),
  );

  const stats = useMemo(() => {
    const list = marketers ?? [];
    return {
      total: list.length,
      active: list.filter((m) => m.status === 'ACTIVE').length,
      totalCustomerSignups: list.reduce(
        (s, m) => s + (m.totalCustomerSignups ?? 0),
        0,
      ),
      totalBusinessSignups: list.reduce(
        (s, m) => s + (m.totalBusinessSignups ?? 0),
        0,
      ),
      commissionOwed: list.reduce(
        (s, m) =>
          s +
          ((m.totalCommissionEarned ?? 0) - (m.totalCommissionPaid ?? 0)),
        0,
      ),
    };
  }, [marketers]);

  const handleSuspend = useCallback(
    async (m: Marketer) => {
      const reason = window.prompt(`Suspend "${m.name}"? Reason (optional):`);
      if (reason === null) return;
      const result = await suspendMarketer({ id: m._id, reason: reason || undefined });
      if (result !== null) {
        toast.success(`${m.name} suspended`);
        refetch();
      }
    },
    [suspendMarketer, refetch],
  );

  const handleReinstate = useCallback(
    async (m: Marketer) => {
      if (!confirm(`Reinstate "${m.name}"?`)) return;
      const result = await reinstateMarketer({ id: m._id });
      if (result !== null) {
        toast.success(`${m.name} reinstated`);
        refetch();
      }
    },
    [reinstateMarketer, refetch],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Marketers"
        description="Manage influencers, marketers, and partners — and the referral codes that drive commissions"
        action={
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 transition-colors"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Marketer
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Total" value={stats.total} icon={Users} />
        <StatCard title="Active" value={stats.active} icon={CheckCircle} />
        <StatCard title="Customer signups" value={stats.totalCustomerSignups} icon={TrendingUp} />
        <StatCard title="Business signups" value={stats.totalBusinessSignups} icon={TrendingUp} />
        <StatCard
          title="Commission owed"
          value={`₦${stats.commissionOwed.toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search by name or email"
            value={filters.search ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
            }
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ruby-500 focus:border-ruby-500"
          />
        </div>
        <select
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: (e.target.value || undefined) as MarketerStatus | undefined,
              page: 1,
            }))
          }
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <select
          value={filters.type ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              type: (e.target.value || undefined) as MarketerType | undefined,
              page: 1,
            }))
          }
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">All types</option>
          <option value="INFLUENCER">Influencers</option>
          <option value="MARKETER">Marketers</option>
          <option value="PARTNER">Partners</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  'Name',
                  'Type',
                  'Status',
                  'Customer signups',
                  'Business signups',
                  'Commission owed',
                  'Total earned',
                  '',
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-5 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : !marketers || marketers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                    No marketers yet — click "Add Marketer" to create one.
                  </td>
                </tr>
              ) : (
                marketers.map((m) => {
                  const owed =
                    (m.totalCommissionEarned ?? 0) -
                    (m.totalCommissionPaid ?? 0);
                  return (
                    <tr
                      key={m._id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/ruby-app/admin/marketers/${m._id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-gray-900">{m.name}</div>
                        <div className="text-xs text-gray-400">{m.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {TYPE_LABELS[m.type]}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_STYLES[m.status]}`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {m.totalCustomerSignups}
                        <span className="text-xs text-gray-400 ml-1">
                          ({m.totalCustomerActivations} activated)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {m.totalBusinessSignups}
                        <span className="text-xs text-gray-400 ml-1">
                          ({m.totalBusinessActivations} activated)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        ₦{owed.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        ₦{(m.totalCommissionEarned ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/ruby-app/admin/marketers/${m._id}`}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="View detail"
                          >
                            <Eye className="w-4 h-4 text-gray-400" />
                          </Link>
                          {m.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleSuspend(m)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title="Suspend"
                            >
                              <Ban className="w-4 h-4 text-red-500" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReinstate(m)}
                              className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                              title="Reinstate"
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — backend's TransformInterceptor flattens
            { items, pagination: {...} } into the meta object. */}
        {meta && (meta.totalPages ?? 1) > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {meta.page ?? 1} of {meta.totalPages} · {meta.total ?? 0} total
            </span>
            <div className="flex gap-1">
              <button
                disabled={(meta.page ?? 1) <= 1}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))
                }
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={(meta.page ?? 1) >= (meta.totalPages ?? 1)}
                onClick={() =>
                  setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))
                }
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      <CreateMarketerModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={async (data) => {
          const result = await createMarketer(data);
          if (result !== null) {
            toast.success(`Marketer "${data.name}" created`);
            setCreateModalOpen(false);
            refetch();
            const m = result as Marketer | undefined;
            if (m?._id) {
              router.push(`/ruby-app/admin/marketers/${m._id}`);
            }
          }
        }}
        submitting={isCreating}
      />
    </div>
  );
}

// ─── Create Marketer Modal ───────────────────────────────────────────

function CreateMarketerModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMarketerRequest) => Promise<void> | void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<CreateMarketerRequest>({
    name: '',
    email: '',
    phone: '',
    type: 'MARKETER',
    customerCommission: 500,
    businessCommission: 2000,
    notes: '',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Marketer"
      subtitle="Create a new influencer, marketer, or partner record"
      size="md"
    >
      <div className="p-4 space-y-3">
        <Field label="Name" required>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            placeholder="Jane Doe"
          />
        </Field>
        <Field label="Email" required>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            placeholder="jane@example.com"
          />
        </Field>
        <Field label="Phone" required>
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            placeholder="+234 801 234 5678"
          />
        </Field>
        <Field label="Type">
          <select
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value as MarketerType }))
            }
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          >
            <option value="INFLUENCER">Influencer</option>
            <option value="MARKETER">Marketer</option>
            <option value="PARTNER">Partner</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Customer commission (₦)">
            <input
              type="number"
              min={0}
              value={form.customerCommission ?? 0}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  customerCommission: parseInt(e.target.value, 10) || 0,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </Field>
          <Field label="Business commission (₦)">
            <input
              type="number"
              min={0}
              value={form.businessCommission ?? 0}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  businessCommission: parseInt(e.target.value, 10) || 0,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            rows={3}
            value={form.notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            placeholder="Contract terms, contact preferences, etc."
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={
              submitting ||
              !form.name.trim() ||
              !form.email.trim() ||
              !form.phone.trim()
            }
            className="px-4 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}
