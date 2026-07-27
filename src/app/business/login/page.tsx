'use client';
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { BusinessAuthProvider } from '@/lib/business-auth';

function LoginForm() { const [email, setEmail] = useState(''); const [sending, setSending] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!email.trim()) return toast.error('Enter your business email.'); setSending(true); try { await api.businessAuth.requestMagicLink(email.trim()); toast.success('Check your email for your secure sign-in link.'); } catch { toast.error('We could not send your sign-in link. Try again.'); } finally { setSending(false); } };
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10"><section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"><div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-ruby-red/10 text-ruby-red"><Mail size={22}/></div><h1 className="text-2xl font-bold text-gray-900">Sign in to Ruby+ Business</h1><p className="mt-2 text-sm leading-relaxed text-gray-500">Enter the email linked to your business. We’ll send a secure sign-in link—no password needed.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">Business email<input type="email" autoComplete="email" required value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="you@business.com" disabled={sending} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ruby-red focus:outline-none focus:ring-2 focus:ring-ruby-red/20"/></label><button disabled={sending} className="w-full rounded-lg bg-ruby-red py-2.5 text-sm font-semibold text-white disabled:opacity-60">{sending ? 'Sending secure link…' : 'Email me a sign-in link'}</button></form><p className="mt-5 text-center text-xs text-gray-400">The link expires in 15 minutes and can only be used once.</p></section></main>;
}
export default function BusinessLoginPage(){return <BusinessAuthProvider><LoginForm/></BusinessAuthProvider>}
