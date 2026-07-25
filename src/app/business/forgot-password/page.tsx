'use client';

/**
 * Business forgot-password — step 1 of the reset flow.
 * Submits email → backend sends 6-digit OTP → redirects to reset-password
 * screen where merchant enters OTP + new password.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api';

export default function BusinessForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = email.trim();
    if (!cleaned) {
      toast.error('Enter the email you signed up with.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.businessAuth.forgotPassword({ email: cleaned });
      toast.success('We sent a reset code to your email.');
      router.push(
        `/business/reset-password?email=${encodeURIComponent(cleaned)}`,
      );
    } catch (err) {
      // Deliberately don't leak whether the email exists — same generic
      // "check inbox" copy either way; backend also returns 200 for
      // unknown emails to prevent enumeration.
      const message =
        err instanceof ApiClientError && err.status < 500
          ? 'If that email exists, we sent a reset code.'
          : 'Could not send reset code right now. Try again in a moment.';
      toast.success(message);
      router.push(
        `/business/reset-password?email=${encodeURIComponent(cleaned)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Reset your password
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            We&apos;ll email you a 6-digit code to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-red focus:border-transparent text-sm"
                placeholder="you@example.com"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-ruby-red text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60 transition"
            >
              {isSubmitting ? 'Sending…' : 'Send reset code'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link
              href="/business/login"
              className="text-xs text-ruby-red font-medium hover:underline"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
