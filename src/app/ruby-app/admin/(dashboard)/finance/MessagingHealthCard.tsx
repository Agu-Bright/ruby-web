'use client';

/**
 * P80 — Messaging chain health card.
 *
 * Generic for both SMS and WhatsApp. Renders the configured provider
 * chain, per-provider configured/last-error state, and the 24 h failover
 * stats from the backend's `messaging_logs` collection.
 *
 * Replaces the P70 `SmsHealthCard` (which only knew about a single
 * provider). The old card's "send test SMS" form moved out to the
 * dedicated `/admin/messaging` page where the Channel + Provider Override
 * + WhatsApp Template Key dropdowns live — keeps this card focused on
 * monitoring.
 */
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Cable,
  Zap,
  PieChart,
} from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import type {
  MessagingHealth,
  MessagingProviderHealth,
  MessagingProviderName,
} from '@/lib/types';

interface Props {
  /** Channel to render — drives the title + API endpoint. */
  channel: 'SMS' | 'WHATSAPP';
}

export function MessagingHealthCard({ channel }: Props) {
  const { data: health, refetch, isLoading } = useApi<MessagingHealth>(() =>
    channel === 'SMS' ? api.health.sms() : api.health.whatsapp(),
  );

  // Synthesise top-level status. Pessimistic:
  //   - red    when no provider configured or every provider's last send failed
  //   - amber  when the primary provider has failed but a fallback succeeded
  //            recently (i.e. failoverRatePct > 5)
  //   - green  when chain healthy + recent activity ok
  const chainHealthy =
    health &&
    health.chain.length > 0 &&
    health.chain.some((p) => health.providers[p]?.lastSendOk !== false);
  const failoverRate = health?.stats24h.failoverRatePct ?? 0;
  const statusColor: 'gray' | 'red' | 'amber' | 'green' = !health
    ? 'gray'
    : health.chain.length === 0
      ? 'red'
      : !chainHealthy
        ? 'red'
        : failoverRate > 25
          ? 'red'
          : failoverRate > 5
            ? 'amber'
            : 'green';
  const StatusIcon =
    statusColor === 'green'
      ? CheckCircle2
      : statusColor === 'gray'
        ? Loader2
        : AlertTriangle;
  const statusLabel = !health
    ? 'Loading'
    : health.chain.length === 0
      ? 'No provider configured'
      : !chainHealthy
        ? 'Chain failing'
        : failoverRate > 25
          ? `Failover ${failoverRate}%`
          : failoverRate > 5
            ? `Failover ${failoverRate}%`
            : 'Healthy';

  const channelTitle = channel === 'SMS' ? 'SMS' : 'WhatsApp';
  const channelDescription =
    channel === 'SMS'
      ? 'OTP codes + merchant alerts'
      : 'Merchant alert templates (Meta-approved)';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <MessageSquare size={18} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {channelTitle} Gateway
            </h3>
            <p className="text-xs text-gray-500">{channelDescription}</p>
          </div>
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          {isLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Top row — overall status + chain + 24h success + failover rate */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatTile
          label="Status"
          icon={
            <StatusIcon
              size={14}
              className={
                statusColor === 'green'
                  ? 'text-green-600'
                  : statusColor === 'amber'
                    ? 'text-amber-600'
                    : statusColor === 'red'
                      ? 'text-red-600'
                      : 'text-gray-400'
              }
            />
          }
          value={statusLabel}
        />
        <StatTile
          label="Chain"
          icon={<Cable size={11} />}
          value={
            health?.chain.length
              ? health.chain.map(formatProvider).join(' → ')
              : '—'
          }
        />
        <StatTile
          label="Sends 24h"
          icon={<PieChart size={11} />}
          value={String(health?.stats24h.totalSends ?? 0)}
          sub={
            health?.stats24h
              ? `${health.stats24h.failedAll} failed`
              : undefined
          }
        />
        <StatTile
          label="Failover 24h"
          icon={<Zap size={11} />}
          value={`${failoverRate}%`}
          sub={
            health?.stats24h?.byProvider?.termii != null && health?.chain[0] === 'twilio'
              ? `${health.stats24h.byProvider.termii} via fallback`
              : undefined
          }
        />
      </div>

      {/* Per-provider rows */}
      <div className="space-y-2 mb-4">
        {(['twilio', 'termii'] as MessagingProviderName[]).map((name) => {
          const p = health?.providers[name];
          if (!p) return null;
          return <ProviderRow key={name} provider={p} />;
        })}
      </div>

      {/* Action banners */}
      {health && health.chain.length === 0 && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3">
          <p className="text-xs text-red-900">
            <strong>No {channelTitle} provider configured.</strong> Set{' '}
            <code className="bg-red-100 px-1 rounded">
              MESSAGING_{channel}_CHAIN=twilio,termii
            </code>{' '}
            (or one of them) in env and ensure the matching credentials are
            present, then redeploy. Until this is fixed, every outbound{' '}
            {channelTitle} message is dropped.
          </p>
        </div>
      )}
      {health && health.chain.length > 0 && failoverRate > 25 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs text-amber-900">
            <strong>Primary provider is failing more than 25 % of sends.</strong>{' '}
            If failover rate stays high for &gt; 1 h, consider reversing the
            chain order (set primary to{' '}
            {health.chain[1] || 'the secondary provider'}) until the upstream
            issue is resolved.
          </p>
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  icon,
  value,
  sub,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm font-bold text-gray-900 mt-1 break-words">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ProviderRow({ provider }: { provider: MessagingProviderHealth }) {
  const status: 'green' | 'amber' | 'gray' = !provider.configured
    ? 'gray'
    : provider.lastSendOk === false
      ? 'amber'
      : provider.lastSendAt
        ? 'green'
        : 'gray';
  const Icon =
    status === 'green'
      ? CheckCircle2
      : status === 'gray'
        ? Loader2
        : AlertTriangle;
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <Icon
          size={14}
          className={
            status === 'green'
              ? 'text-green-600 mt-0.5'
              : status === 'amber'
                ? 'text-amber-600 mt-0.5'
                : 'text-gray-400 mt-0.5'
          }
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-900">
            {formatProvider(provider.name)}{' '}
            <span className="text-[11px] font-medium text-gray-400 uppercase">
              {provider.configured ? 'configured' : 'not configured'}
            </span>
          </p>
          {provider.lastError && (
            <p
              className="text-[11px] text-red-600 mt-0.5 font-mono break-all"
              title={provider.lastError}
            >
              {provider.lastError.slice(0, 140)}
            </p>
          )}
        </div>
      </div>
      <div className="text-right text-[11px] text-gray-500 shrink-0">
        <div>
          {provider.balance != null
            ? formatCurrency(provider.balance)
            : provider.balanceLabel || '—'}
        </div>
        <div>
          {provider.lastSendAt
            ? formatRelativeTime(provider.lastSendAt)
            : 'No sends'}
        </div>
      </div>
    </div>
  );
}

function formatProvider(name: MessagingProviderName): string {
  return name === 'twilio' ? 'Twilio' : 'Termii';
}
