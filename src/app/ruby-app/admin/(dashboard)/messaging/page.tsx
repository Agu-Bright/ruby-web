'use client';

/**
 * P70-5 — Admin Messaging test page.
 *
 * A focused dashboard surface for sending a one-off SMS to any phone number.
 * Built primarily to verify the Termii (or Twilio) gateway after an env
 * change — admin types a phone + a message, hits Send, and the platform
 * fires the SMS through exactly the same `SmsService.sendSms()` pipeline
 * that handles OTPs and merchant alerts.
 *
 * Pairs with the SMS Gateway widget on /finance: that one shows live
 * health + balance, this one is the "smoke test" the admin uses to confirm
 * a fix actually works without doing a full signup flow.
 *
 * Wire-up:
 *   - Backend: POST /admin/health/sms/test  (admin-health.controller.ts)
 *   - Auth:    SUPER_ADMIN only             (Roles decorator on the route)
 *   - Health:  GET /admin/health/sms        (also rendered here, so admin
 *              gets provider status + balance in the same view)
 */
import { useState } from 'react';
import { MessageSquare, Send, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui';
import { useApi } from '@/lib/hooks';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { SmsHealth } from '@/lib/types';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/utils';

export default function MessagingPage() {
  const { isSuperAdmin } = useAuth();
  const { data: health, refetch, isLoading } = useApi<SmsHealth>(() =>
    api.health.sms(),
  );

  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<{
    phone: string;
    message: string;
    at: Date;
  } | null>(null);

  const canSubmit =
    !sending && phone.trim().length >= 10 && message.trim().length > 0;

  const handleSend = async () => {
    if (!canSubmit) return;
    const trimmedPhone = phone.trim();
    const trimmedMessage = message.trim();
    setSending(true);
    try {
      await api.health.smsTest({
        phone: trimmedPhone,
        message: trimmedMessage,
      });
      toast.success(`Message sent to ${trimmedPhone}`);
      setLastSent({
        phone: trimmedPhone,
        message: trimmedMessage,
        at: new Date(),
      });
      // Don't clear the inputs — admins often want to send a follow-up to
      // the same number. They can edit/clear themselves.
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

  // SUPER_ADMIN only — the underlying endpoint is also guarded, but we
  // render an explicit gate so the screen doesn't look broken for other
  // admin roles. Hide instead of redirect — they may have stumbled onto
  // the page from a stale bookmark.
  if (!isSuperAdmin) {
    return (
      <div>
        <PageHeader title="Messaging" description="Send a test SMS to verify the gateway." />
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-4">
          <p className="text-sm text-amber-900">
            This screen is restricted to <strong>super admin</strong> accounts.
            Ask a super admin to log in if you need to run an SMS test.
          </p>
        </div>
      </div>
    );
  }

  // Status colour mirrors the SmsHealthCard on /finance — keeps the two
  // surfaces visually consistent.
  const statusColor = !health
    ? 'gray'
    : !health.configured
      ? 'red'
      : health.lastSendOk === false
        ? 'amber'
        : 'green';

  return (
    <div>
      <PageHeader
        title="Messaging"
        description="Send a test SMS to any phone number through the live SMS gateway. Useful for verifying Termii configuration after an env change."
      />

      {/* Gateway status banner — same data as /finance widget, compact form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mt-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <MessageSquare size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Gateway:{' '}
                <span className="font-mono text-xs">
                  {health?.provider ?? '—'}
                </span>
              </p>
              <p className="text-[11px] text-gray-500">
                {health?.balance != null
                  ? `Termii balance: ${formatCurrency(health.balance)}`
                  : 'Balance unavailable'}
                {health?.lastSendAt
                  ? ` · last send ${formatRelativeTime(health.lastSendAt)}`
                  : ''}
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
                : !health.configured
                  ? 'Not configured'
                  : health.lastSendOk === false
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

        {!health?.configured && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 mt-3">
            <p className="text-xs text-amber-900">
              <strong>SMS_PROVIDER env is unset on this backend.</strong> No SMS
              will actually be sent. Set{' '}
              <code className="bg-amber-100 px-1 rounded">SMS_PROVIDER=termii</code>{' '}
              and{' '}
              <code className="bg-amber-100 px-1 rounded">TERMII_API_KEY=…</code>{' '}
              on your deploy host then redeploy.
            </p>
          </div>
        )}

        {health?.configured && health.lastError && (
          <div className="rounded-lg bg-red-50 border border-red-100 p-3 mt-3">
            <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider mb-1">
              Last error from gateway
            </p>
            <p className="text-xs text-red-800 font-mono break-all">
              {health.lastError}
            </p>
          </div>
        )}
      </div>

      {/* Send form — the main UI of this page */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Send SMS
        </h2>

        <div className="space-y-4">
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
              Accepts +234, 234, or 0 prefix. Normalised server-side.
            </p>
          </div>

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
                Max 300 characters · longer messages are truncated.
              </p>
              <p className="text-[11px] text-gray-400 font-mono">
                {message.length}/300
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              {sending ? 'Sending…' : 'Send message'}
            </button>
            {lastSent && !sending && (
              <p className="text-xs text-gray-500">
                Last sent to <span className="font-mono">{lastSent.phone}</span>{' '}
                at {formatDateTime(lastSent.at.toISOString())}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Caveats — small print so admins don't expect WhatsApp behaviour */}
      <div className="mt-4 text-xs text-gray-500 px-1">
        <p className="font-semibold text-gray-700 mb-1">Notes</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>
            Real SMS is sent — there&apos;s no &quot;test mode&quot;. Termii bills the
            platform wallet for each send.
          </li>
          <li>
            Sender ID is the configured Termii ID (default <code>OEalert</code>). The
            recipient will see that as the sender, not &quot;Ruby+&quot;.
          </li>
          <li>
            Delivery to numbers with carrier Do-Not-Disturb requires the
            transactional channel — already enabled by default in the
            backend (<code>TERMII_CHANNEL=dnd</code>).
          </li>
          <li>
            If you see &quot;Send failed&quot;, the gateway-status banner above shows
            the exact error returned by Termii.
          </li>
        </ul>
      </div>
    </div>
  );
}
