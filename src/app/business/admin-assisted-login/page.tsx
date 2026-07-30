'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { BusinessAuthProvider, useBusinessAuth } from '@/lib/business-auth';

function AssistedLoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { loginWithAssistedSession } = useBusinessAuth();
  const [message, setMessage] = useState('Opening the selected business dashboard securely…');
  useEffect(() => {
    // The destination can safely sever the relationship only after the admin
    // tab has completed its cross-origin navigation to this page.
    try { window.opener = null; } catch { /* Browser may forbid reassignment. */ }
    const handoffToken = params.get('token');
    if (!handoffToken) { setMessage('This assisted-login link is invalid. Return to Admin and try again.'); return; }
    api.businessAuth.consumeAdminAssistedLogin(handoffToken)
      .then(({ data }) => { loginWithAssistedSession(data); router.replace('/business/dashboard'); })
      .catch((error) => setMessage(error?.message || 'This assisted-login link has expired. Return to Admin and try again.'));
  }, [loginWithAssistedSession, params, router]);
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center"><h1 className="text-xl font-bold">Ruby+ Business</h1><p className="mt-3 text-sm text-gray-600">{message}</p></div></main>;
}

export default function AdminAssistedLoginPage() {
  return <BusinessAuthProvider><Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-sm text-gray-500">Preparing secure access…</p></main>}><AssistedLoginContent /></Suspense></BusinessAuthProvider>;
}
