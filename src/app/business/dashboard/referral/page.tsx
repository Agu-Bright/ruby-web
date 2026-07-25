'use client';

import { Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useReferral } from '@/lib/business-api/organization';

export default function ReferralPage() {
  const referral = useReferral();
  const r = referral.data as {
    referralCode?: string;
    creditsEarnedKobo?: number;
    creditsEarned?: number;
    referredCount?: number;
  } | null;

  const code = r?.referralCode ?? '';
  const creditsRaw = Number(r?.creditsEarnedKobo ?? r?.creditsEarned ?? 0);
  const displayCredits =
    r?.creditsEarnedKobo !== undefined ? creditsRaw / 100 : creditsRaw;
  const message = code
    ? `Join Ruby+ Business using my referral code ${code}.`
    : '';

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard?.writeText(code);
    toast.success('Referral code copied');
  };

  const share = async () => {
    if (!code) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Join Ruby+ Business', text: message });
        return;
      } catch {
        return;
      }
    }
    await copy();
  };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">Referrals</h1>
      <p className="mt-1 text-sm text-gray-500">
        Share your business referral code and earn Ruby+ growth credits when a
        referred business joins.
      </p>

      <section className="mt-6 rounded-2xl border bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Your referral code
        </p>

        {referral.isLoading ? (
          <div className="skeleton mt-3 h-10 w-40 rounded" />
        ) : (
          <>
            <p className="mt-2 text-3xl font-bold tracking-wider text-ruby-red">
              {code || '—'}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!code}
                onClick={() => void copy()}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                <Copy size={16} />
                Copy code
              </button>
              <button
                type="button"
                disabled={!code}
                onClick={() => void share()}
                className="inline-flex items-center gap-2 rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Share2 size={16} />
                Share
              </button>
            </div>
          </>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6">
          <div>
            <p className="text-xs text-gray-500">Referred businesses</p>
            <b className="mt-1 block text-xl">{r?.referredCount ?? 0}</b>
          </div>
          <div>
            <p className="text-xs text-gray-500">Credits earned</p>
            <b className="mt-1 block text-xl">
              ₦{Math.round(displayCredits).toLocaleString('en-NG')}
            </b>
          </div>
        </div>
      </section>
    </main>
  );
}
