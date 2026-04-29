'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  Tag as TagIcon,
} from 'lucide-react';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, Modal, StatCard } from '@/components/ui';
import type {
  Marketer,
  ReferralCode,
  ReferralAttribution,
  ReferralAttributionStatus,
  GenerateCodeRequest,
} from '@/lib/types';

const ATTRIBUTION_STATUS_STYLES: Record<ReferralAttributionStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  COMMISSION_OWED: 'bg-blue-50 text-blue-700 border-blue-200',
  PAID: 'bg-green-50 text-green-700 border-green-200',
  VOIDED: 'bg-gray-50 text-gray-500 border-gray-200',
};

export default function MarketerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const marketerId = params?.id as string;

  const [tab, setTab] = useState<'codes' | 'attributions' | 'commissions'>('codes');
  const [generateCodeOpen, setGenerateCodeOpen] = useState(false);
  const [selectedAttributions, setSelectedAttributions] = useState<Set<string>>(
    new Set(),
  );

  const {
    data: marketer,
    isLoading: marketerLoading,
    refetch: refetchMarketer,
  } = useApi<Marketer>(() => api.marketers.get(marketerId), [marketerId]);

  const {
    data: codes,
    isLoading: codesLoading,
    refetch: refetchCodes,
  } = useApi<ReferralCode[]>(() => api.marketers.listCodes(marketerId), [marketerId]);

  const {
    data: attributions,
    isLoading: attributionsLoading,
    refetch: refetchAttributions,
  } = useApi<ReferralAttribution[]>(
    () => api.marketers.listAttributions(marketerId, { limit: 100 }),
    [marketerId],
  );

  const { mutate: generateCode, isLoading: isGenerating } = useMutation<
    ReferralCode,
    GenerateCodeRequest
  >((data) => api.marketers.generateCode(marketerId, data));

  const { mutate: toggleCode } = useMutation<
    ReferralCode,
    { id: string; status: 'ACTIVE' | 'DISABLED' }
  >(({ id, status }) => api.marketers.updateCode(id, { status }));

  const { mutate: processPayout, isLoading: isPayingOut } = useMutation<
    { paidCount: number; totalAmount: number },
    { ids: string[] }
  >(({ ids }) => api.marketers.processPayout(marketerId, ids, false));

  const owedAttributions = useMemo(
    () => (attributions ?? []).filter((a) => a.status === 'COMMISSION_OWED'),
    [attributions],
  );
  const totalOwed = useMemo(
    () => owedAttributions.reduce((s, a) => s + (a.commissionAmount ?? 0), 0),
    [owedAttributions],
  );

  const handlePayout = useCallback(async () => {
    const ids = Array.from(selectedAttributions);
    const useAll = ids.length === 0;
    const targetIds = useAll ? owedAttributions.map((a) => a._id) : ids;
    if (targetIds.length === 0) {
      toast.error('No commission-owed attributions to pay');
      return;
    }
    if (
      !confirm(
        `Pay out ${targetIds.length} attribution${targetIds.length === 1 ? '' : 's'} to ${marketer?.name}? This credits their wallet immediately.`,
      )
    ) {
      return;
    }
    const result = await processPayout({ ids: targetIds });
    if (result !== null) {
      toast.success(
        `Paid out ₦${(result?.totalAmount ?? 0).toLocaleString()} for ${result?.paidCount} attribution${result?.paidCount === 1 ? '' : 's'}`,
      );
      setSelectedAttributions(new Set());
      refetchMarketer();
      refetchAttributions();
    }
  }, [
    selectedAttributions,
    owedAttributions,
    processPayout,
    marketer?.name,
    refetchMarketer,
    refetchAttributions,
  ]);

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    toast.success(`Copied "${code}"`);
  };

  if (marketerLoading || !marketer) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-32 bg-gray-100 rounded" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  const owed =
    (marketer.totalCommissionEarned ?? 0) - (marketer.totalCommissionPaid ?? 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title={marketer.name}
        description={`${marketer.email} · ${marketer.phone} · ${marketer.type}`}
        action={
          <Link
            href="/ruby-app/admin/marketers"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Customer signups"
          value={marketer.totalCustomerSignups}
          icon={TrendingUp}
        />
        <StatCard
          title="Business signups"
          value={marketer.totalBusinessSignups}
          icon={TrendingUp}
        />
        <StatCard
          title="Commission owed"
          value={`₦${owed.toLocaleString()}`}
          icon={DollarSign}
        />
        <StatCard
          title="Commission paid"
          value={`₦${(marketer.totalCommissionPaid ?? 0).toLocaleString()}`}
          icon={CheckCircle}
        />
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-100 flex gap-1 px-4 pt-2">
          {(['codes', 'attributions', 'commissions'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-ruby-600 text-ruby-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
              {t === 'commissions' && totalOwed > 0 ? (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  ₦{totalOwed.toLocaleString()}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* CODES TAB */}
        {tab === 'codes' && (
          <div className="p-4">
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setGenerateCodeOpen(true)}
                disabled={marketer.status !== 'ACTIVE'}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700 disabled:opacity-50"
                title={
                  marketer.status === 'ACTIVE'
                    ? 'Generate a new code'
                    : 'Marketer must be ACTIVE to generate codes'
                }
              >
                <Plus className="w-4 h-4" />
                Generate code
              </button>
            </div>

            {codesLoading ? (
              <div className="text-sm text-gray-400">Loading…</div>
            ) : !codes || codes.length === 0 ? (
              <div className="text-sm text-gray-400 italic py-8 text-center">
                No codes yet. Click "Generate code" to create the first one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Code', 'Type', 'Status', 'Uses', 'Campaign', ''].map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((c) => (
                      <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                              {c.code}
                            </code>
                            <button
                              onClick={() => copyCode(c.code)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Copy"
                            >
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700">{c.type}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
                              c.status === 'ACTIVE'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : c.status === 'DISABLED'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700">
                          {c.usesCount}
                          {c.maxUses ? ` / ${c.maxUses}` : ''}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {c.campaignTag || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {c.status === 'ACTIVE' ? (
                            <button
                              onClick={async () => {
                                if (!confirm(`Disable code "${c.code}"?`)) return;
                                const r = await toggleCode({ id: c._id, status: 'DISABLED' });
                                if (r !== null) {
                                  toast.success(`Code "${c.code}" disabled`);
                                  refetchCodes();
                                }
                              }}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Disable
                            </button>
                          ) : c.status === 'DISABLED' ? (
                            <button
                              onClick={async () => {
                                const r = await toggleCode({ id: c._id, status: 'ACTIVE' });
                                if (r !== null) {
                                  toast.success(`Code "${c.code}" re-enabled`);
                                  refetchCodes();
                                }
                              }}
                              className="text-xs text-green-600 hover:underline"
                            >
                              Re-enable
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ATTRIBUTIONS TAB */}
        {tab === 'attributions' && (
          <div className="p-4">
            {attributionsLoading ? (
              <div className="text-sm text-gray-400">Loading…</div>
            ) : !attributions || attributions.length === 0 ? (
              <div className="text-sm text-gray-400 italic py-8 text-center">
                No referrals yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Referred user', 'Code', 'Type', 'Status', 'Signup', 'Activated', 'Commission'].map(
                        (h, i) => (
                          <th
                            key={i}
                            className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {attributions.map((a) => {
                      const u = typeof a.referredUserId === 'object' ? a.referredUserId : null;
                      const c = typeof a.codeId === 'object' ? a.codeId : null;
                      return (
                        <tr key={a._id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="text-sm text-gray-800">
                              {u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—' : '—'}
                            </div>
                            <div className="text-xs text-gray-400">{u?.email ?? u?.phone ?? ''}</div>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">
                              {c?.code ?? '—'}
                            </code>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">{a.type}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${ATTRIBUTION_STATUS_STYLES[a.status]}`}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {new Date(a.referredAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {a.activatedAt ? new Date(a.activatedAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            {a.commissionAmount > 0
                              ? `₦${a.commissionAmount.toLocaleString()}`
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* COMMISSIONS TAB */}
        {tab === 'commissions' && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-gray-600">
                {owedAttributions.length} attribution{owedAttributions.length === 1 ? '' : 's'} owed
                · <strong className="text-gray-900">₦{totalOwed.toLocaleString()}</strong>
              </div>
              <button
                onClick={handlePayout}
                disabled={owedAttributions.length === 0 || isPayingOut}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700 disabled:opacity-50"
              >
                {isPayingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                {selectedAttributions.size > 0
                  ? `Pay selected (${selectedAttributions.size})`
                  : 'Pay all owed'}
              </button>
            </div>

            {owedAttributions.length === 0 ? (
              <div className="text-sm text-gray-400 italic py-8 text-center">
                No commissions owed.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-3 py-2 w-8" />
                      {['Referred user', 'Type', 'Activated', 'Amount'].map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {owedAttributions.map((a) => {
                      const u = typeof a.referredUserId === 'object' ? a.referredUserId : null;
                      const checked = selectedAttributions.has(a._id);
                      return (
                        <tr key={a._id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedAttributions((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(a._id);
                                  else next.delete(a._id);
                                  return next;
                                });
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-sm text-gray-800">
                              {u
                                ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—'
                                : '—'}
                            </div>
                            <div className="text-xs text-gray-400">{u?.email ?? ''}</div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">{a.type}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {a.activatedAt
                              ? new Date(a.activatedAt).toLocaleDateString()
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">
                            ₦{a.commissionAmount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Code Modal */}
      <GenerateCodeModal
        isOpen={generateCodeOpen}
        onClose={() => setGenerateCodeOpen(false)}
        onSubmit={async (data) => {
          const result = await generateCode(data);
          if (result !== null) {
            toast.success(`Code "${(result as ReferralCode)?.code}" created`);
            setGenerateCodeOpen(false);
            refetchCodes();
          }
        }}
        submitting={isGenerating}
      />
    </div>
  );
}

// ─── Generate Code Modal ─────────────────────────────────────────────

function GenerateCodeModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GenerateCodeRequest) => Promise<void> | void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<GenerateCodeRequest>({
    code: '',
    type: 'BOTH',
    campaignTag: '',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate referral code"
      subtitle="Auto-generate or set a custom vanity code"
      size="md"
    >
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Custom code (optional)
          </label>
          <input
            value={form.code ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
            }
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono uppercase"
            placeholder="JANE10  (leave blank to auto-generate)"
            maxLength={20}
          />
          <p className="text-xs text-gray-400 mt-1">
            4–20 alphanumeric characters. Leave blank for an 8-char auto-generated code.
          </p>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Valid on
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          >
            <option value="BOTH">Both apps (customer + business)</option>
            <option value="CUSTOMER">Customer app only</option>
            <option value="BUSINESS">Business app only</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Campaign tag (optional)
          </label>
          <input
            value={form.campaignTag ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, campaignTag: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            placeholder="e.g. instagram-jan-2026"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Override customer commission (₦)
            </label>
            <input
              type="number"
              min={0}
              value={form.customCustomerCommission ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  customCustomerCommission: e.target.value
                    ? parseInt(e.target.value, 10)
                    : undefined,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              placeholder="(use marketer default)"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Override business commission (₦)
            </label>
            <input
              type="number"
              min={0}
              value={form.customBusinessCommission ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  customBusinessCommission: e.target.value
                    ? parseInt(e.target.value, 10)
                    : undefined,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              placeholder="(use marketer default)"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Generate
          </button>
        </div>
      </div>
    </Modal>
  );
}
