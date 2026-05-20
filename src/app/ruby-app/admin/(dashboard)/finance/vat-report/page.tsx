'use client';

import { useState, useMemo } from 'react';
import { Receipt, TrendingUp, TrendingDown, Calculator, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import type { VatReport } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

/**
 * Phase 16 — VAT Report.
 *
 * Aggregates VAT collected vs refunded across orders, bookings, and
 * event tickets within a date range. Finance uses this number as the
 * remittance figure for FIRS each month.
 *
 * Source of truth: each transaction's stored `vat` / `feeBreakdown.vat`
 * snapshot. The aggregation is server-side via Mongo $group — see
 * VatReportController. Refunded transactions are subtracted from gross
 * so the "Net VAT" card is what you actually owe FIRS.
 */
function defaultStartOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function defaultStartOfNextMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export default function VatReportPage() {
  const [startDate, setStartDate] = useState(defaultStartOfMonthIso);
  const [endDate, setEndDate] = useState(defaultStartOfNextMonthIso);

  const { data: report, isLoading, error, refetch } = useApi<VatReport>(
    () => api.vat.report({ startDate, endDate }),
    [startDate, endDate],
  );

  const handleExportCsv = () => {
    if (!report) return;
    const rows: string[][] = [
      ['Type', 'Count', 'Collected', 'Refunded', 'Net'],
      ...report.byType.map((r) => [
        r.type,
        String(r.count),
        String(r.collected),
        String(r.refunded),
        String(r.net),
      ]),
      ['TOTAL', String(report.transactionCount), String(report.totalCollected), String(report.totalRefunded), String(report.netVat)],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vat-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('VAT report exported');
  };

  const periodLabel = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    e.setDate(e.getDate() - 1); // inclusive end for display
    return `${s.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} – ${e.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="VAT Report"
        description="Aggregate Nigerian VAT collected on Ruby+ platform fees. Use this for monthly FIRS remittance."
      />

      {/* Date range + export */}
      <div className="card flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
            Start date (inclusive)
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-200 focus:border-ruby-300"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
            End date (exclusive)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-200 focus:border-ruby-300"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={refetch}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!report}
            className="inline-flex items-center gap-1.5 bg-ruby-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-ruby-600 disabled:opacity-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="VAT Collected"
          amount={report?.totalCollected}
          currency={report?.currency || 'NGN'}
          icon={TrendingUp}
          colorClasses="bg-green-50 text-green-700 border-green-200"
          loading={isLoading}
        />
        <SummaryCard
          label="VAT Refunded"
          amount={report?.totalRefunded}
          currency={report?.currency || 'NGN'}
          icon={TrendingDown}
          colorClasses="bg-amber-50 text-amber-700 border-amber-200"
          loading={isLoading}
        />
        <SummaryCard
          label="Net VAT (FIRS)"
          amount={report?.netVat}
          currency={report?.currency || 'NGN'}
          icon={Calculator}
          colorClasses="bg-ruby-50 text-ruby-700 border-ruby-200"
          loading={isLoading}
          highlight
        />
      </div>

      {/* By type table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">By transaction type</h2>
            <p className="text-xs text-gray-500 mt-0.5">{periodLabel}</p>
          </div>
          <div className="text-xs text-gray-500">
            {report?.transactionCount ?? 0} transaction{report?.transactionCount === 1 ? '' : 's'}
          </div>
        </div>
        {error ? (
          <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>
        ) : isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : !report || report.byType.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No VAT-eligible transactions in this period.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-right px-4 py-2.5">Count</th>
                <th className="text-right px-4 py-2.5">Collected</th>
                <th className="text-right px-4 py-2.5">Refunded</th>
                <th className="text-right px-4 py-2.5">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.byType.map((row) => (
                <tr key={row.type}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {row.type === 'EVENT_TICKET' ? 'Event tickets' : row.type.charAt(0) + row.type.slice(1).toLowerCase() + 's'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{row.count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-700">{formatCurrency(row.collected, report.currency)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">
                    {row.refunded > 0 ? formatCurrency(row.refunded, report.currency) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(row.net, report.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-900">Total</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{report.transactionCount.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(report.totalCollected, report.currency)}</td>
                <td className="px-4 py-3 text-right font-semibold text-amber-700">
                  {report.totalRefunded > 0 ? formatCurrency(report.totalRefunded, report.currency) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-ruby-700">{formatCurrency(report.netVat, report.currency)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  currency,
  icon: Icon,
  colorClasses,
  loading,
  highlight,
}: {
  label: string;
  amount?: number;
  currency: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClasses: string;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${highlight ? colorClasses : 'bg-white border-gray-200'}`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-xs font-semibold uppercase tracking-wider ${highlight ? '' : 'text-gray-500'}`}>
          {label}
        </p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${highlight ? 'bg-white/40' : colorClasses}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={`mt-2 text-2xl font-bold ${highlight ? '' : 'text-gray-900'}`}>
        {loading ? '…' : amount != null ? formatCurrency(amount, currency) : '—'}
      </p>
    </div>
  );
}
