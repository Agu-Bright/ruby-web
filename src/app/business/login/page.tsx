'use client';

/**
 * Business login — `business.rubyplus.net/login`.
 *
 * Deliberately minimal: email + password only. Google / Apple sign-in are
 * planned for M0-stretch once the Google Client ID env vars are in place.
 * There is NO signup CTA on this screen — merchants must create their
 * account in the mobile app first. The link at the bottom goes to
 * `/register` (existing marketing signup form) purely for continuity;
 * copy makes clear that mobile is the primary onboarding surface.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BusinessAuthProvider, useBusinessAuth } from '@/lib/business-auth';
import { ApiClientError } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const { login } = useBusinessAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Enter your email and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { hasBusinesses, business } = await login(email.trim(), password);
      if (!hasBusinesses) {
        // Merchant registered but never created a business on mobile.
        // Send them to `/business-pending` so the copy explains their
        // options ("finish setup on mobile" or "start web onboarding").
        toast.success('Welcome back.');
        router.replace('/business/business-pending');
        return;
      }
      if (
        business?.status &&
        (business.status === 'DRAFT' ||
          business.status === 'PENDING_REVIEW' ||
          business.status === 'REJECTED' ||
          business.status === 'SUSPENDED')
      ) {
        router.replace('/business/business-pending');
        return;
      }
      toast.success('Welcome back.');
      router.replace('/business/dashboard');
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Login failed. Try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Sign in to manage your business on Ruby+
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Password
                </label>
                <Link
                  href="/business/forgot-password"
                  className="text-xs text-ruby-red hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-16 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-red focus:border-transparent text-sm"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-ruby-red text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60 transition"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Don&apos;t have an account?{' '}
              <Link
                href="/business/register"
                className="text-ruby-red font-medium hover:underline"
              >
                Sign up on mobile
              </Link>
            </p>
            <p className="text-[11px] text-gray-400 mt-2">
              New merchant accounts are created in the Ruby+ Business mobile app.
              Sign in here once you&apos;ve completed signup on mobile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap the login form in the provider so `login()` can persist state
// even before the dashboard shell mounts. Public-facing pages don't
// need auth data, so wrapping only the login form keeps the tree small.
export default function BusinessLoginPage() {
  return (
    <BusinessAuthProvider>
      <LoginForm />
    </BusinessAuthProvider>
  );
}
