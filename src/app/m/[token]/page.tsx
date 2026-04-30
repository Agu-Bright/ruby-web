'use client';

/**
 * Public marketer stats page — `/m/:token`.
 *
 * Read-only snapshot a Ruby+ marketer / influencer can bookmark to track
 * their referrals without logging in. The token is opaque, issued and
 * shared by an admin from the marketer detail page. Regenerating the token
 * (admin action) invalidates the URL.
 *
 * Privacy: the API never returns referred-user PII (no emails, names, or
 * IDs of referred users — just types and timestamps).
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  TrendingUp,
  CheckCircle,
  Wallet as WalletIcon,
  DollarSign,
  Users,
  Store,
  Tag as TagIcon,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { PublicMarketerView } from '@/lib/types';

// ─── Helpers ────────────────────────────────────────────────────────────

const formatNgn = (n: number) =>
  `₦${(n ?? 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const formatDate = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('en-NG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const ATTRIBUTION_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  COMMISSION_OWED: 'bg-blue-50 text-blue-700 border-blue-200',
  PAID: 'bg-green-50 text-green-700 border-green-200',
  VOIDED: 'bg-gray-50 text-gray-500 border-gray-200',
};

const ATTRIBUTION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Awaiting activation',
  COMMISSION_OWED: 'Commission owed',
  PAID: 'Paid',
  VOIDED: 'Voided',
};

const CODE_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  EXPIRED: 'bg-gray-50 text-gray-500 border-gray-200',
  DISABLED: 'bg-red-50 text-red-700 border-red-200',
};

// ─── Page ───────────────────────────────────────────────────────────────

export default function PublicMarketerPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token as string;

  const [data, setData] = useState<PublicMarketerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.marketers.publicView(token);
        if (cancelled) return;
        if (res?.success && res.data) {
          setData(res.data);
        } else {
          setError('This referral link is no longer valid.');
        }
      } catch {
        if (!cancelled) setError('This referral link is no longer valid.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const owed = useMemo(() => {
    if (!data) return 0;
    return Math.max(
      0,
      (data.marketer.totalCommissionEarned ?? 0) -
        (data.marketer.totalCommissionPaid ?? 0),
    );
  }, [data]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading your stats…</span>
        </div>
      </div>
    );
  }

  // Error / 404 state — generic message, doesn't leak whether token format was valid
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Link not valid
          </h1>
          <p className="text-sm text-gray-500">
            {error || 'This referral link is no longer valid.'}
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Reach out to your Ruby+ contact for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const m = data.marketer;
  const isSuspended = m.status === 'SUSPENDED';

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="bg-gradient-to-br from-ruby-600 to-ruby-800 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2 h-2 rounded-full bg-white/80" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
              Ruby+ Referral Dashboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">{m.name}</h1>
          <p className="text-sm opacity-80 mt-1">
            {m.type.charAt(0) + m.type.slice(1).toLowerCase()} · Active since{' '}
            {formatDate(m.memberSince)}
          </p>
          {isSuspended && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-red-100/90 text-red-900 rounded-lg text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Account suspended — contact Ruby+ ops
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-6">
        {/* ─── Stats grid ───────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            icon={Users}
            label="Customer signups"
            value={m.totalCustomerSignups}
            sub={`${m.totalCustomerActivations} activated`}
          />
          <StatTile
            icon={Store}
            label="Business signups"
            value={m.totalBusinessSignups}
            sub={`${m.totalBusinessActivations} activated`}
          />
          <StatTile
            icon={DollarSign}
            label="Commission owed"
            value={formatNgn(owed)}
            sub="Pending payout"
            highlight={owed > 0}
          />
          <StatTile
            icon={CheckCircle}
            label="Commission paid"
            value={formatNgn(m.totalCommissionPaid)}
            sub="Lifetime"
          />
        </section>

        {/* ─── Codes ────────────────────────────────────────────── */}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-gray-400" />
            Your referral codes
          </h2>
          {data.codes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-500">
              No codes have been issued to you yet. Reach out to your Ruby+
              contact.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {data.codes.map((c) => (
                <div
                  key={c.code}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-gray-100 rounded font-mono text-sm font-semibold text-gray-900">
                        {c.code}
                      </code>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${
                          CODE_STATUS_STYLES[c.status] || ''
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 truncate">
                      {c.type === 'BOTH'
                        ? 'Customer + Business'
                        : c.type.charAt(0) + c.type.slice(1).toLowerCase()}
                      {c.campaignTag ? ` · ${c.campaignTag}` : ''}
                      {c.expiresAt
                        ? ` · expires ${formatDate(c.expiresAt)}`
                        : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-gray-900">
                      {c.usesCount}
                      {c.maxUses ? (
                        <span className="text-gray-400 font-normal">
                          /{c.maxUses}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400">
                      uses
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── Recent referrals ─────────────────────────────────── */}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            Recent referrals
          </h2>
          {data.recentAttributions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-500">
              No referrals yet. Once someone signs up using one of your codes,
              they'll show up here.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {data.recentAttributions.map((a, i) => (
                <div
                  key={i}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {a.type === 'CUSTOMER' ? (
                        <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      ) : (
                        <Store className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {a.type === 'CUSTOMER'
                          ? 'Customer signup'
                          : 'Business signup'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      Signed up {formatDate(a.referredAt)}
                      {a.activatedAt
                        ? ` · activated ${formatDate(a.activatedAt)}`
                        : ''}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full border whitespace-nowrap ${
                        ATTRIBUTION_STATUS_STYLES[a.status] || ''
                      }`}
                    >
                      {ATTRIBUTION_STATUS_LABELS[a.status] || a.status}
                    </span>
                    {a.commissionAmount > 0 && (
                      <span className="text-xs font-semibold text-gray-700">
                        {formatNgn(a.commissionAmount)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-gray-400 text-center">
            Showing the most recent 20. Older referrals are tallied into your
            stats above.
          </p>
        </section>

        {/* ─── How this works (informational) ───────────────────── */}
        <section className="mt-8 bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <WalletIcon className="w-4 h-4 text-gray-400" />
            How commissions work
          </h3>
          <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
            <li>
              <strong>Signup</strong> — someone enters your code at signup; they
              show as <em>Awaiting activation</em>.
            </li>
            <li>
              <strong>Activation</strong> — when a referred customer places
              their first paid order, or a referred business goes live, the
              status flips to <em>Commission owed</em>.
            </li>
            <li>
              <strong>Payout</strong> — Ruby+ ops processes commission payouts
              periodically. Once paid, the status becomes <em>Paid</em>.
            </li>
          </ul>
        </section>

        <p className="mt-6 text-center text-[11px] text-gray-400">
          This page is a private link issued to you. Don't share it publicly.
        </p>
      </main>
    </div>
  );
}

// ─── Inline stat tile (kept local to this page) ─────────────────────────

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-4 ${
        highlight ? 'border-blue-200 ring-2 ring-blue-100' : 'border-gray-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <Icon
          className={`w-4 h-4 ${highlight ? 'text-blue-600' : 'text-gray-400'}`}
        />
      </div>
      <div className="mt-2 text-xl font-bold text-gray-900">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mt-0.5">
        {label}
      </div>
      {sub && (
        <div className="text-[11px] text-gray-400 mt-1 truncate">{sub}</div>
      )}
    </div>
  );
}
