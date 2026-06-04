'use client';

/**
 * P70 — SMS gateway health card.
 *
 * Surfaces the state of the outbound SMS pipeline (Termii by default) on
 * the admin Finance page so an operator can spot a silent OTP-delivery
 * outage without poking at backend logs. The most common root cause we're
 * hunting:
 *   - `SMS_PROVIDER` env var unset → SmsService falls through to the no-op
 *     branch; OTPs are generated + stored but never sent. The user sees
 *     "code sent" but nothing arrives.
 *   - Termii wallet empty / sender ID revoked / API key invalid →
 *     `sendSms` returns false, recorded in `lastError`.
 *
 * The card also exposes a "Send test SMS" form so ops can verify a config
 * fix without doing a full signup flow.
 */
import { useState } from 'react';
import { MessageSquare, CheckCircle2, AlertTriangle, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/lib/hooks';
import { api, ApiClientError } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import type { SmsHealth } from '@/lib/types';

export function SmsHealthCard() {
  const { data: health, refetch, isLoading } = useApi<SmsHealth>(() => api.health.sms());

  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testing, setTesting] = useState(false);

  const sendTest = async () => {
    if (!testPhone.trim()) {
      toast.error('Enter a phone number to test');
      return;
    }
    setTesting(true);
    try {
      await api.health.smsTest({
        phone: testPhone.trim(),
        message: testMessage.trim() || undefined,
      });
      toast.success(`Test SMS sent to ${testPhone}. Check the device.`);
      // Refresh health to update the lastSendAt timestamp visible above.
      refetch();
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to send test SMS';
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  // Three-state colour: green when configured + last send ok, amber when
  // configured but last send failed or unknown, red when provider is unset.
  const statusColor = !health
    ? 'gray'
    : !health.configured
      ? 'red'
      : health.lastSendOk === false
        ? 'amber'
        : 'green';
  const StatusIcon =
    statusColor === 'green'
      ? CheckCircle2
      : statusColor === 'gray'
        ? Loader2
        : AlertTriangle;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <MessageSquare size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">SMS Gateway</h3>
            <p className="text-xs text-gray-500">
              Verification codes + merchant SMS alerts
            </p>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Provider
          </p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {health?.provider ?? '—'}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Status
          </p>
          <div className="flex items-center gap-1.5 mt-1">
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
            <p className="text-sm font-bold text-gray-900">
              {!health
                ? 'Loading'
                : !health.configured
                  ? 'Not configured'
                  : health.lastSendOk === false
                    ? 'Degraded'
                    : 'Healthy'}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Termii balance
          </p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {health?.balance != null
              ? `${formatCurrency(health.balance)}`
              : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Last send
          </p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {health?.lastSendAt
              ? formatRelativeTime(health.lastSendAt)
              : 'No sends yet'}
          </p>
          {health?.lastSendOk === false && (
            <p className="text-[11px] text-red-600 mt-0.5">Last attempt failed</p>
          )}
        </div>
      </div>

      {health?.lastError && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 mb-4">
          <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider mb-1">
            Last error
          </p>
          <p className="text-xs text-red-800 font-mono break-all">{health.lastError}</p>
        </div>
      )}

      {!health?.configured && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 mb-4">
          <p className="text-xs text-amber-900">
            <strong>SMS_PROVIDER env var is unset on this backend.</strong> All
            OTP / merchant SMS sends are being silently dropped. Set{' '}
            <code className="bg-amber-100 px-1 rounded">SMS_PROVIDER=termii</code>{' '}
            and{' '}
            <code className="bg-amber-100 px-1 rounded">TERMII_API_KEY=…</code>{' '}
            in your deploy host's env panel, then redeploy.
          </p>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Send test SMS
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="tel"
            placeholder="+2348012345678"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            disabled={testing}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 disabled:opacity-50"
          />
          <input
            type="text"
            placeholder="Optional message override"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            disabled={testing}
            className="flex-[2] px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 disabled:opacity-50"
            maxLength={300}
          />
          <button
            onClick={sendTest}
            disabled={testing || !testPhone.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {testing ? 'Sending…' : 'Send'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          Fires a real SMS via the configured provider. Use to verify a config
          change without going through a full signup flow.
        </p>
      </div>
    </div>
  );
}
