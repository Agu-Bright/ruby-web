'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function BusinessDashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Business dashboard route error', error); }, [error]);
  return <main className="flex min-h-[60vh] items-center justify-center p-6"><section role="alert" className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm"><p className="text-sm font-semibold text-ruby-red">Something needs attention</p><h1 className="mt-2 text-xl font-bold text-gray-900">This business page could not load</h1><p className="mt-2 text-sm leading-6 text-gray-600">Your account and business data are safe. Please try loading this page again.</p><button onClick={reset} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white"><RefreshCw size={16}/>Try again</button></section></main>;
}
