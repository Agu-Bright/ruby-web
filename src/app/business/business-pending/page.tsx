'use client';

/**
 * business-pending — the gate merchants land on when their business
 * status is DRAFT, PENDING_REVIEW, REJECTED, or SUSPENDED.
 *
 * Mirrors the mobile `(auth)/business-pending.tsx` — same copy per status,
 * only action is Logout. Merchants can also open the mobile app to
 * continue onboarding (DRAFT), or contact support (REJECTED / SUSPENDED).
 *
 * Not part of the dashboard shell — no sidebar, no branch switcher.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BusinessAuthProvider,
  useBusinessAuth,
  type BusinessStatus,
} from '@/lib/business-auth';

const COPY: Record<
  BusinessStatus | 'NO_BUSINESS',
  {
    title: string;
    body: string;
    tint: 'amber' | 'blue' | 'rose' | 'gray';
  }
> = {
  DRAFT: {
    title: 'Finish setting up your business',
    body: 'Your business is still in draft. Confirm your business location and submit it for Ruby+ review.',
    tint: 'amber',
  },
  PENDING_REVIEW: {
    title: 'We’re reviewing your business',
    body: 'Our team is reviewing your details. You’ll get an email as soon as your listing goes live — usually within 24 hours on business days.',
    tint: 'blue',
  },
  APPROVED: {
    title: 'Almost live',
    body: 'Your business is approved and about to go live. Refresh in a moment.',
    tint: 'blue',
  },
  LIVE: {
    title: 'Your business is live',
    body: 'You shouldn’t be seeing this screen — hop back to the dashboard.',
    tint: 'blue',
  },
  REJECTED: {
    title: 'Your business needs changes',
    body: 'Our review flagged issues that need fixing before you can go live. Check your email for details, or contact Ruby+ support.',
    tint: 'rose',
  },
  SUSPENDED: {
    title: 'Your business is suspended',
    body: 'Access to your dashboard is temporarily paused. Contact Ruby+ support to resolve the issue.',
    tint: 'rose',
  },
  NO_BUSINESS: {
    title: 'No business linked to this account',
    body: 'You’ve signed up but haven’t created a business yet. Open the Ruby+ Business mobile app to set up your first business.',
    tint: 'gray',
  },
};

const TINT_STYLES: Record<'amber' | 'blue' | 'rose' | 'gray', string> = {
  amber: 'bg-amber-50 border-amber-200 text-amber-900',
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  rose: 'bg-rose-50 border-rose-200 text-rose-900',
  gray: 'bg-gray-50 border-gray-200 text-gray-900',
};

function BusinessPendingContent() {
  const router = useRouter();
  const { user, business, isLoading, logout, isAuthenticated } = useBusinessAuth();

  // Not authenticated → bounce to login. Not gated → bounce to dashboard.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/business/login');
      return;
    }
    const s = business?.status;
    if (s === 'LIVE' || s === 'APPROVED') {
      router.replace('/business/dashboard');
    }
  }, [isLoading, isAuthenticated, business?.status, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="skeleton w-72 h-32 rounded-2xl" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const key: BusinessStatus | 'NO_BUSINESS' = business?.status ?? 'NO_BUSINESS';
  const copy = COPY[key];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className={`rounded-2xl border p-6 mb-6 ${TINT_STYLES[copy.tint]}`}>
          <h1 className="text-xl font-bold mb-2">{copy.title}</h1>
          <p className="text-sm leading-relaxed">{copy.body}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <p className="text-xs text-gray-500 mb-1">Signed in as</p>
          <p className="text-sm font-medium text-gray-900 mb-4">
            {user?.email}
          </p>
          {business?.name && (
            <>
              <p className="text-xs text-gray-500 mb-1">Business</p>
              <p className="text-sm font-medium text-gray-900 mb-4">
                {business.name}
                {business.status && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    · {business.status}
                  </span>
                )}
              </p>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
            {business?.status === 'DRAFT' && (
              <a
                href="/business/onboarding"
                className="text-center py-2.5 rounded-lg bg-ruby-red text-white font-semibold text-sm hover:opacity-95 transition"
              >
                Continue setup
              </a>
            )}
            <a
              href="https://apps.apple.com/app/ruby-business/id0000000000"
              target="_blank"
              rel="noreferrer"
              className="text-center py-2.5 rounded-lg bg-ruby-red text-white font-semibold text-sm hover:opacity-95 transition"
            >
              Open the mobile app
            </a>
            <button
              onClick={logout}
              className="text-center py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition"
            >
              Log out
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Need help?{' '}
          <a
            href="mailto:support@rubyplus.net"
            className="text-ruby-red hover:underline"
          >
            support@rubyplus.net
          </a>
        </p>
      </div>
    </div>
  );
}

export default function BusinessPendingPage() {
  return (
    <BusinessAuthProvider>
      <BusinessPendingContent />
    </BusinessAuthProvider>
  );
}
