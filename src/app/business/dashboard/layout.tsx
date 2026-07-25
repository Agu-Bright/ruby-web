'use client';

/**
 * BusinessDashboardShell — the authenticated merchant dashboard shell.
 *
 * Structure (analogous to `src/app/ruby-app/admin/(dashboard)/layout.tsx`):
 *   BusinessAuthProvider
 *     └── AuthGuard (redirect to /business/login if no user)
 *         └── StatusGate (redirect to /business/business-pending if gated)
 *             └── Layout (sidebar + topbar + content)
 *
 * The provider wraps at this level so every dashboard page reads from
 * the same context. Login / forgot-password / business-pending pages
 * live OUTSIDE this layout and mount their own provider instances —
 * the provider is intentionally lightweight (just localStorage + state)
 * so having it duplicated across auth pages costs nothing.
 */

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BusinessAuthProvider, useBusinessAuth } from '@/lib/business-auth';
import { ToastProvider } from '@/components/ui';
import { BusinessSidebar } from '@/components/business/BusinessSidebar';
import { BusinessTopbar } from '@/components/business/BusinessTopbar';
import { BusinessSocketsProvider } from '@/lib/business-sockets';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, isAuthenticated, isBusinessGated, user } = useBusinessAuth();

  // Auth + status gates. Runs on every route change; only fires the
  // redirect once because router.replace() unmounts the current page.
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Preserve the deep-link so post-login redirect can honour it —
      // matches mobile's "return to intended screen after auth" behaviour.
      const next = pathname && pathname !== '/business/login'
        ? `?next=${encodeURIComponent(pathname)}`
        : '';
      router.replace(`/business/login${next}`);
      return;
    }

    if (isBusinessGated) {
      router.replace('/business/business-pending');
      return;
    }
  }, [isLoading, isAuthenticated, isBusinessGated, pathname, router]);

  // Show a lightweight loading state while we hydrate the session.
  // Everything below assumes a real user — bail early otherwise so we
  // never render sidebar/topbar for an unauth'd viewer.
  if (isLoading || !isAuthenticated || !user || isBusinessGated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="skeleton w-72 h-32 rounded-2xl" />
      </div>
    );
  }

  return (
    <BusinessSocketsProvider>
      <div className="min-h-screen flex bg-gray-50">
        <BusinessSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <BusinessTopbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </BusinessSocketsProvider>
  );
}

export default function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BusinessAuthProvider>
      <DashboardShell>{children}</DashboardShell>
      <ToastProvider />
    </BusinessAuthProvider>
  );
}
