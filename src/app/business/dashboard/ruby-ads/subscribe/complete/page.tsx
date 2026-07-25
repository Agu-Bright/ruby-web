'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { useVerifyPaystackAdSubscription } from '@/lib/business-api/ad-subscriptions';

export default function SubscriptionCheckoutCompletePage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref');
  const started = useRef(false);
  const [complete, setComplete] = useState(false);
  const verify = useVerifyPaystackAdSubscription();

  useEffect(() => {
    if (!reference || started.current) return;
    started.current = true;
    void verify.mutate({ reference }).then((subscription) => {
      if (subscription) setComplete(true);
    });
  }, [reference, verify]);

  const failed = !reference || !!verify.error;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center p-6">
      <section className="w-full rounded-3xl border bg-white p-7 text-center shadow-sm">
        {complete ? <CheckCircle2 className="mx-auto text-emerald-600" size={44} /> : failed ? <XCircle className="mx-auto text-ruby-red" size={44} /> : <LoaderCircle className="mx-auto animate-spin text-ruby-red" size={44} />}
        <h1 className="mt-5 text-2xl font-bold text-gray-900">{complete ? 'Your Ruby+ Ads tier is active' : failed ? 'We could not confirm this payment' : 'Confirming your payment'}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{complete ? 'Your card has been securely saved by Paystack for future renewals. You can manage your tier at any time.' : failed ? 'If you completed payment, do not pay again. Return to Ruby+ Ads and refresh, or contact support with your Paystack reference.' : 'Please wait while we securely confirm your Paystack subscription.'}</p>
        <Link href={complete ? '/business/dashboard/ruby-ads/manage' : '/business/dashboard/ruby-ads/subscribe'} className="mt-6 inline-flex rounded-xl bg-ruby-red px-5 py-3 text-sm font-semibold text-white">{complete ? 'Manage subscription' : 'Back to tiers'}</Link>
      </section>
    </main>
  );
}
