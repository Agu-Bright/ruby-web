'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('This password reset link is incomplete. Please request a new link.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.auth.resetCustomerPasswordWithLink({ token, password });
      setIsComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset your password. Please request a new link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fff7f6] px-4 py-10 sm:py-16 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 sm:p-9 shadow-xl shadow-ruby-500/10 border border-ruby-100">
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-ruby-50 text-ruby-600">
          {isComplete ? <CheckCircle2 className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
        </div>

        {isComplete ? (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Password updated</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Your password has been changed securely. You can now return to the Ruby+ app and sign in.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-ruby-600">Ruby+ account security</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Create a new password</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Choose a strong new password for your Ruby+ account. This link can only be used once.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">New password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-ruby-500 focus:ring-4 focus:ring-ruby-100"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-gray-700">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-ruby-500 focus:ring-4 focus:ring-ruby-100"
                  placeholder="Repeat your new password"
                />
              </div>

              {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

              <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-ruby-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-ruby-700 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? 'Updating password...' : 'Reset password'}
              </button>
            </form>

            <div className="mt-6 flex gap-2 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Your link expires in 30 minutes and is invalidated immediately after your password changes.
            </div>
          </>
        )}

        <Link href="/" className="mt-7 inline-block text-sm font-medium text-ruby-600 hover:text-ruby-700">Return to Ruby+ home</Link>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#fff7f6]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
