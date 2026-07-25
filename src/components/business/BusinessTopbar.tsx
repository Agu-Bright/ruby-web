'use client';

/**
 * BusinessTopbar — dashboard header.
 *
 * Contents (left → right):
 *   - Business name + status pill (from BusinessAuthContext.business)
 *   - Spacer
 *   - Notifications bell (placeholder — real dropdown lands with M11)
 *   - Profile menu (initials avatar) with Logout
 *
 * BranchSwitcher will slot in here when M12 lands and the merchant has
 * multiple branches; for M0 it's a static single-business display.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, ChevronDown } from 'lucide-react';
import { useBusinessAuth } from '@/lib/business-auth';
import { api } from '@/lib/api';
import { useBusinessQuery } from '@/lib/business-api/hooks';
import { useNotificationsRealtime } from '@/lib/business-sockets';
import { BusinessPwaInstall } from '@/components/business/BusinessPwaInstall';

// Local helper — the shared `getInitials(firstName, lastName)` in
// `@/lib/utils` demands both fields. We may only have an email at first,
// so accept a display string and pull a reasonable first + fallback letter.
function initialsFromDisplay(displayOrEmail: string): string {
  const s = displayOrEmail.trim();
  if (!s) return '?';
  const parts = s.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }
  // Email fallback — first letter of local part, first letter after '@' if present
  const [local, domain] = s.split('@');
  return `${local?.[0] || ''}${domain?.[0] || ''}`.toUpperCase() || '?';
}

const STATUS_TINT: Record<string, string> = {
  LIVE: 'bg-green-100 text-green-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  SUSPENDED: 'bg-rose-100 text-rose-800',
};

export function BusinessTopbar() {
  const router = useRouter();
  const { user, business, logout } = useBusinessAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const unreadFetcher = useCallback(() => api.businessNotifications.unreadCount(), []);
  const unread = useBusinessQuery<{ count: number }>(unreadFetcher, []);
  useNotificationsRealtime(() => { void unread.refetch(); });
  const unreadCount = unread.data?.count ?? 0;

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuTriggerRef.current?.focus();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email
    : '';
  const initials = initialsFromDisplay(displayName || user?.email || '?');

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-6">
      {/* Business identity */}
      {business ? (
        <div className="flex items-center gap-2 min-w-0">
          {business.logoUrl ? <img src={business.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" /> : <div aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ruby-red text-xs font-bold text-white">{business.name?.trim().charAt(0).toUpperCase() || 'R'}</div>}
          <div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-semibold text-gray-900">{business.name}</span>{business.status && <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_TINT[business.status] || 'bg-gray-100 text-gray-800'}`}>{business.status.replace('_', ' ')}</span>}</div>
        </div>
      ) : (
        <div className="text-sm text-gray-400">No business selected</div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      <BusinessPwaInstall />

      {/* Notifications (placeholder — real one lands with M11) */}
      <button
        type="button"
        onClick={() => router.push('/business/dashboard/notifications')}
        className="relative p-2 rounded-lg hover:bg-gray-50 transition"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-ruby-red px-1 text-center text-[10px] font-bold leading-4 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Profile menu */}
      <div className="relative">
        <button
          ref={menuTriggerRef}
          type="button"
          onClick={() => setMenuOpen((s) => !s)}
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-50 transition"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls="business-profile-menu"
          aria-label="Open account menu"
        >
          <div className="w-8 h-8 rounded-full bg-ruby-red text-white flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <ChevronDown size={14} className="text-gray-500" />
        </button>

        {menuOpen && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div id="business-profile-menu" role="menu" aria-label="Account menu" className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {displayName || user?.email}
                </p>
                {displayName && user?.email && (
                  <p className="text-[11px] text-gray-500 truncate">
                    {user.email}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/business/dashboard/profile');
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
                role="menuitem"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
                role="menuitem"
              >
                <LogOut size={12} />
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
