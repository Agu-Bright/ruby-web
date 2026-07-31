'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useVerifyRubyQuestPaystack } from '@/lib/business-api/ruby-quest';

export default function RubyQuestPaymentCompletePage() {
  const params = useSearchParams();
  const reference = params.get('reference');
  const verify = useVerifyRubyQuestPaystack();
  const [state, setState] = useState<'checking' | 'complete' | 'failed'>('checking');
  useEffect(() => { if (!reference) { setState('failed'); return; } void verify.mutate({ reference }).then((value) => setState(value ? 'complete' : 'failed')).catch(() => setState('failed')); }, [reference]);
  return <main className="mx-auto max-w-xl p-6"><section className="rounded-3xl border bg-white p-7 text-center shadow-sm">{state === 'checking' ? <><LoaderCircle className="mx-auto animate-spin text-ruby-red" size={32} /><h1 className="mt-4 text-2xl font-bold">Confirming payment</h1><p className="mt-2 text-sm text-gray-600">Please wait while we verify Paystack’s confirmation.</p></> : state === 'complete' ? <><h1 className="text-2xl font-bold">Ruby Quest tier activated</h1><p className="mt-2 text-sm text-gray-600">Your card is securely managed by Paystack. You can control auto-renewal for this tier from Ruby Quest.</p></> : <><h1 className="text-2xl font-bold">We could not confirm the payment yet</h1><p className="mt-2 text-sm text-gray-600">If Paystack shows payment succeeded, do not pay again. Return to Ruby Quest and refresh, or contact support with your Paystack reference.</p></>}<Link href="/business/dashboard/ruby-ads/ruby-quest" className="mt-6 inline-flex rounded-xl bg-ruby-red px-5 py-3 text-sm font-semibold text-white">Return to Ruby Quest</Link></section></main>;
}
