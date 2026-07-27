'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { BIZ_ACCESS_TOKEN_KEY, BIZ_REFRESH_TOKEN_KEY, BIZ_SELECTED_BUSINESS_KEY, BIZ_USER_KEY } from '@/lib/business-auth';

export default function BusinessMagicLoginPage() {
  const router = useRouter(); const params = useSearchParams(); const [message, setMessage] = useState('Signing you in securely…');
  useEffect(() => { const token = params.get('token'); if (!token) { setMessage('This sign-in link is invalid. Request a new one.'); return; }
    api.businessAuth.consumeMagicLink(token).then((response: any) => { const data = response.data; localStorage.setItem(BIZ_ACCESS_TOKEN_KEY, data.accessToken); localStorage.removeItem(BIZ_REFRESH_TOKEN_KEY); localStorage.setItem(BIZ_USER_KEY, JSON.stringify({ _id: data.user.id, email: data.user.email, firstName: data.user.firstName, lastName: data.user.lastName })); localStorage.setItem(BIZ_SELECTED_BUSINESS_KEY, JSON.stringify({ _id: data.business.id, name: data.business.name, status: data.business.status })); localStorage.setItem('ruby_access_token', data.accessToken); router.replace('/business/dashboard'); }).catch((error) => setMessage(error?.message || 'This sign-in link is invalid, expired, or already used.'));
  }, [params, router]);
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center"><h1 className="text-xl font-bold">Ruby+ Business</h1><p className="mt-3 text-sm text-gray-600">{message}</p></div></main>;
}
