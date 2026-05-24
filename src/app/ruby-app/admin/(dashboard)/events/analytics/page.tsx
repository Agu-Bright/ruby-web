'use client';

import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { DataTable, StatusBadge, type Column } from '@/components/ui';
import type { AdminEventsSalesReport } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';

/**
 * Phase 40 P7 — admin sales report.
 *
 * Date-range + location + organiser filters. Top: 4 StatCards (tickets,
 * revenue, commission, VAT). Middle: line chart from the per-event roll-up
 * (we synthesise a "by event" series since cross-event timeseries would
 * require a per-day aggregation on the backend; events are listed below
 * for the drilldown). Bottom: DataTable with per-event sales + CSV export.
 */

export default function EventsSalesReportPage() {
  // Default to last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [fromDate, setFromDate] = useState(
    thirtyDaysAgo.toISOString().slice(0, 10),
  );
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));

  const { data, isLoading, refetch } = useApi(
    () =>
      api.events.salesReport({
        fromDate: new Date(fromDate).toISOString(),
        toDate: new Date(toDate + 'T23:59:59').toISOString(),
      }),
    [fromDate, toDate],
  );

  const handleExportCsv = async () => {
    // Validate the date range first — silent empty results on inverted
    // ranges is a real ops trap.
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      alert("'From' date must be before or equal to 'To' date.");
      return;
    }
    try {
      const response = await api.events.salesReportCsv({
        fromDate: new Date(fromDate).toISOString(),
        toDate: new Date(toDate + 'T23:59:59').toISOString(),
      });
      // Unwrap the envelope — request returns ApiResponse<T>.
      const payload = (response as any).data || response;
      if (!payload?.contentBase64) return;
      // ── UTF-8 decode ────────────────────────────────────────────────
      // Earlier draft used `atob(payload.contentBase64)` to get a string
      // then wrapped it in a Blob. That's a binary string — multi-byte
      // chars (₦, é, Hausa text in business names) get corrupted. The
      // fix: decode base64 into a Uint8Array of UTF-8 bytes, then prepend
      // the UTF-8 BOM so Excel on Windows opens it without mangling
      // non-ASCII names.
      const binary = atob(payload.contentBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]); // UTF-8 BOM
      const blob = new Blob([bom, bytes], {
        type: payload.contentType || 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = payload.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`CSV export failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const report = data;

  // Build a per-event bar-chart-friendly series for the line chart. Each
  // point is one event sorted by date — gives ops a quick visual of which
  // events drove revenue across the window.
  const chartSeries = useMemo(() => {
    if (!report) return [];
    return report.events
      .slice()
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .map((e) => ({
        date: new Date(e.startsAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        }),
        revenue: e.revenueNgn,
        tickets: e.ticketsSold,
      }));
  }, [report]);

  const columns: Column<AdminEventsSalesReport['events'][number]>[] = [
    {
      key: 'title',
      header: 'Event',
      render: (e) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-900">{e.title}</span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar size={11} /> {formatDateTime(e.startsAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <StatusBadge status={e.status as any} />,
    },
    {
      key: 'ticketsSold',
      header: 'Tickets sold',
      render: (e) => (
        <span className="text-sm font-semibold text-gray-900">
          {e.ticketsSold.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'revenueNgn',
      header: 'Organiser revenue',
      render: (e) => (
        <span className="text-sm font-semibold text-ruby-600">
          {formatCurrency(e.revenueNgn)}
        </span>
      ),
    },
    {
      key: 'feesNgn',
      header: 'Ruby+ commission',
      render: (e) => (
        <span className="text-sm text-gray-700">
          {formatCurrency(e.feesNgn)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={24} /> Events sales report
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Cross-event sales across the selected date range.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            From
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ruby-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            To
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ruby-400"
          />
        </div>
        <button
          onClick={refetch}
          className="self-end bg-ruby-500 hover:bg-ruby-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Events"
            value={report.totals.eventCount.toLocaleString()}
            icon={<Calendar size={20} />}
            color="text-blue-600"
          />
          <StatCard
            label="Tickets sold"
            value={report.totals.totalTicketsSold.toLocaleString()}
            icon={<TrendingUp size={20} />}
            color="text-green-600"
          />
          <StatCard
            label="Organiser revenue"
            value={formatCurrency(report.totals.totalRevenueNgn)}
            icon={<Wallet size={20} />}
            color="text-ruby-600"
          />
          <StatCard
            label="Ruby+ commission"
            value={formatCurrency(report.totals.totalFeesNgn)}
            icon={<ShieldCheck size={20} />}
            color="text-purple-600"
            hint={`+ VAT ${formatCurrency(report.totals.totalVatNgn)}`}
          />
        </div>
      )}

      {/* Line chart */}
      {report && chartSeries.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Revenue per event in window
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip
                formatter={
                  ((v: number, name: string) =>
                    name === 'revenue'
                      ? formatCurrency(v)
                      : v.toLocaleString()) as any
                }
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FD362F"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Revenue (₦)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-event table */}
      <DataTable
        data={report?.events || []}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No events with sales in this date range."
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-gray-500">
        <span className={color}>{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className={`text-2xl font-bold mt-2 ${color}`}>{value}</div>
      {hint ? <div className="text-xs text-gray-400 mt-1">{hint}</div> : null}
    </div>
  );
}
