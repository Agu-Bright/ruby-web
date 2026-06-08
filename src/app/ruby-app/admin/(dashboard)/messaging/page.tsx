'use client';

/**
 * P70-5 / P80 — Admin Messaging test page.
 *
 * Single ops surface for exercising the messaging chain:
 *
 *   - Choose a **channel** (SMS or WhatsApp).
 *   - Optionally **override the provider** ("use chain" / Twilio only /
 *     Termii only) so each provider can be verified independently —
 *     useful after a Twilio credential rotation or a Termii sender ID
 *     approval, to confirm the fix end-to-end without a full signup flow.
 *   - For WhatsApp, pick a **template key** and fill in the variables.
 *     The template wording lives in the provider dashboards; this form
 *     just controls which template + variable values we send.
 *
 * Wire-up:
 *   - Backend: POST /admin/health/sms/test    (admin-health.controller.ts)
 *   - Health:  GET  /admin/health/{sms,whatsapp}
 *   - Auth:    SUPER_ADMIN only
 */
import { useMemo, useState } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui';
import { useApi } from '@/lib/hooks';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type {
  MessagingHealth,
  MessagingProviderName,
  WhatsAppTemplateKey,
} from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

/**
 * Static registry mirroring the backend WHATSAPP_TEMPLATE_REGISTRY. We
 * duplicate the variable-name list on the client so the form knows what
 * fields to render per template. If the backend registry grows, add the
 * matching entry here.
 */
const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, { label: string; variableNames: string[] }> = {
  NEW_ORDER_ALERT: {
    label: 'New order alert',
    variableNames: ['businessName', 'orderNumber', 'itemCount', 'totalDisplay'],
  },
  NEW_BOOKING_ALERT: {
    label: 'New booking alert',
    variableNames: ['businessName', 'serviceName', 'scheduledDisplay', 'customerName'],
  },
  NEW_ENQUIRY_ALERT: {
    label: 'New enquiry alert',
    variableNames: ['businessName', 'customerName'],
  },
  REPING: {
    label: 'Re-ping reminder',
    variableNames: ['alertKind', 'businessName'],
  },
};

export default function MessagingPage() {
  const { isSuperAdmin } = useAuth();

  // Channel + provider override controls (P80).
  const [channel, setChannel] = useState<'SMS' | 'WHATSAPP'>('SMS');
  const [providerOverride, setProviderOverride] = useState<
    'chain' | MessagingProviderName
  >('chain');

  // SMS form state.
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  // WhatsApp form state.
  const [templateKey, setTemplateKey] = useState<WhatsAppTemplateKey>('NEW_ORDER_ALERT');
  const [waVariables, setWaVariables] = useState<Record<string, string>>({});

  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<{
    channel: string;
    phone: string;
    at: Date;
  } | null>(null);

  // Health endpoint — switches with the channel selection so the banner
  // always reflects whichever channel the admin is currently testing.
  const {
    data: health,
    refetch,
    isLoading,
  } = useApi<MessagingHealth>(
    () => (channel === 'SMS' ? api.health.sms() : api.health.whatsapp()),
    [channel],
  );

  const templateConfig = WHATSAPP_TEMPLATES[templateKey];

  const canSubmit = useMemo(() => {
    if (sending) return false;
    if (phone.trim().length < 10) return false;
    if (channel === 'SMS') return message.trim().length > 0;
    return templateConfig.variableNames.every(
      (n) => (waVariables[n] || '').trim().length > 0,
    );
  }, [sending, phone, channel, message, templateConfig, waVariables]);

  const handleSend = async () => {
    if (!canSubmit) return;
    setSending(true);
    try {
      await api.health.smsTest({
        phone: phone.trim(),
        channel,
        providerOverride:
          providerOverride === 'chain' ? undefined : providerOverride,
        message: channel === 'SMS' ? message.trim() : undefined,
        templateKey: channel === 'WHATSAPP' ? templateKey : undefined,
        variables: channel === 'WHATSAPP' ? waVariables : undefined,
      });
      toast.success(
        `${channel} sent to ${phone.trim()}${
          providerOverride !== 'chain' ? ` via ${providerOverride}` : ''
        }`,
      );
      setLastSent({ channel, phone: phone.trim(), at: new Date() });
      refetch();
    } catch (err) {
      const detail =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Send failed';
      toast.error(detail);
    } finally {
      setSending(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div>
        <PageHeader
          title="Messaging"
          description="Send a test SMS or WhatsApp through the live provider chain."
        />
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-4">
          <p className="text-sm text-amber-900">
            This screen is restricted to <strong>super admin</strong> accounts.
          </p>
        </div>
      </div>
    );
  }

  const chainHealthy =
    health &&
    health.chain.length > 0 &&
    health.chain.some((p) => health.providers[p]?.lastSendOk !== false);
  const statusColor: 'gray' | 'red' | 'amber' | 'green' = !health
    ? 'gray'
    : health.chain.length === 0
      ? 'red'
      : !chainHealthy
        ? 'amber'
        : 'green';

  return (
    <div>
      <PageHeader
        title="Messaging"
        description="Send a test SMS or WhatsApp template through the live provider chain. Useful for verifying Twilio or Termii configuration after an env change."
      />

      {/* Status banner — narrows to the selected channel. */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <MessageSquare size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {channel === 'SMS' ? 'SMS' : 'WhatsApp'} chain:{' '}
                <span className="font-mono text-xs">
                  {health?.chain.length ? health.chain.join(' → ') : 'none'}
                </span>
              </p>
              <p className="text-[11px] text-gray-500">
                {health?.stats24h
                  ? `${health.stats24h.totalSends} sends 24 h · failover ${health.stats24h.failoverRatePct}%`
                  : 'No 24 h stats yet'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={
                'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold ' +
                (statusColor === 'green'
                  ? 'bg-green-50 text-green-700'
                  : statusColor === 'amber'
                    ? 'bg-amber-50 text-amber-700'
                    : statusColor === 'red'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-gray-50 text-gray-600')
              }
            >
              {statusColor === 'green' ? (
                <CheckCircle2 size={11} />
              ) : statusColor === 'gray' ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <AlertTriangle size={11} />
              )}
              {!health
                ? 'Loading'
                : health.chain.length === 0
                  ? 'No provider'
                  : !chainHealthy
                    ? 'Degraded'
                    : 'Healthy'}
            </span>
            <button
              onClick={refetch}
              disabled={isLoading}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Send form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Send test message
        </h2>

        <div className="space-y-4">
          {/* Channel + Provider override */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as 'SMS' | 'WHATSAPP')}
                disabled={sending}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-gray-300 outline-none"
              >
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp (template)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Provider
              </label>
              <select
                value={providerOverride}
                onChange={(e) =>
                  setProviderOverride(
                    e.target.value as 'chain' | MessagingProviderName,
                  )
                }
                disabled={sending}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-gray-300 outline-none"
              >
                <option value="chain">Use chain (default)</option>
                <option value="twilio">Force Twilio</option>
                <option value="termii">Force Termii</option>
              </select>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Receiver phone number
            </label>
            <input
              type="tel"
              placeholder="+2348012345678 or 08012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={sending}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 disabled:opacity-50 focus:bg-white focus:border-gray-300 outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Accepts +234, 234, or 0 prefix. Normalised server-side to E.164.
            </p>
          </div>

          {channel === 'SMS' ? (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Message
              </label>
              <textarea
                placeholder="Type the message you want to send…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
                maxLength={300}
                rows={5}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 disabled:opacity-50 focus:bg-white focus:border-gray-300 outline-none resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-gray-400">
                  Max 300 chars · longer messages are truncated server-side.
                </p>
                <p className="text-[11px] text-gray-400 font-mono">
                  {message.length}/300
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Template
                </label>
                <select
                  value={templateKey}
                  onChange={(e) => {
                    setTemplateKey(e.target.value as WhatsAppTemplateKey);
                    setWaVariables({});
                  }}
                  disabled={sending}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-gray-300 outline-none"
                >
                  {(Object.keys(WHATSAPP_TEMPLATES) as WhatsAppTemplateKey[]).map(
                    (k) => (
                      <option key={k} value={k}>
                        {WHATSAPP_TEMPLATES[k].label} ({k})
                      </option>
                    ),
                  )}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Variables must match the Meta-approved template body
                  word-for-word. Wording lives in the provider dashboards.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templateConfig.variableNames.map((name) => (
                  <div key={name}>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      {name}
                    </label>
                    <input
                      type="text"
                      placeholder={`Value for ${name}`}
                      value={waVariables[name] || ''}
                      onChange={(e) =>
                        setWaVariables((v) => ({
                          ...v,
                          [name]: e.target.value,
                        }))
                      }
                      disabled={sending}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-gray-300 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSend}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              {sending ? 'Sending…' : `Send ${channel === 'SMS' ? 'SMS' : 'WhatsApp'}`}
            </button>
            {lastSent && !sending && (
              <p className="text-xs text-gray-500">
                Last sent {lastSent.channel} to{' '}
                <span className="font-mono">{lastSent.phone}</span> at{' '}
                {formatDateTime(lastSent.at.toISOString())}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 px-1">
        <p className="font-semibold text-gray-700 mb-1">Notes</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>
            Real messages are sent — there&apos;s no test mode. The
            configured provider bills the platform wallet (Termii) or
            account (Twilio post-paid) for each send.
          </li>
          <li>
            <strong>Force Twilio / Force Termii</strong> bypasses the chain
            and runs ONLY the selected provider. Use this to verify each
            provider independently after a credential change.
          </li>
          <li>
            <strong>Use chain</strong> mirrors production behaviour exactly:
            tries providers in order, falls over on TRANSIENT errors, stops
            on PERMANENT errors (invalid phone, recipient unsubscribed).
          </li>
          <li>
            WhatsApp template wording lives in each provider&apos;s
            dashboard (Termii templates / Twilio Content Builder). This
            form just fills in the variable values; if a template
            isn&apos;t yet approved by Meta for Twilio, the orchestrator
            transparently falls through to Termii.
          </li>
          <li>
            Health banner shows the last error per provider — pivot to
            /finance for the full 24 h failover stats and per-provider
            breakdown.
          </li>
        </ul>
        <p className="mt-3">
          See the{' '}
          <a className="underline" href="/ruby-app/admin/finance">
            Finance page
          </a>{' '}
          for the live chain stats card (24 h failover %, per-provider
          balance + last error).
        </p>
      </div>
    </div>
  );
}
