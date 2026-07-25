'use client';

/**
 * BusinessSidebar — dashboard nav.
 *
 * Nav groups match the plan's structure:
 *   Overview / Commerce / Catalog / Marketing / Communication / Finance / Analytics / Settings
 *
 * Each item is a plain Next `<Link>` — active-item highlighting is
 * longest-prefix wins (same trick the admin sidebar uses so
 * `/business/dashboard/orders/abc123` still highlights `Orders`).
 *
 * Conditional visibility (Services hidden when !hasServices, etc.) will
 * be layered in with M4/M5 once `useCategoryProfile` lands. For M0 every
 * item is visible; placeholder pages just say "coming soon".
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  CalendarCheck,
  Package,
  Wrench,
  Megaphone,
  Ticket,
  MessageCircle,
  AlertTriangle,
  Wallet,
  BarChart3,
  Bell,
  Building2,
  Users,
  Gift,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useBusinessVisibility } from '@/lib/business-auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

export const BUSINESS_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/business/dashboard', icon: LayoutDashboard },
      {
        label: 'Notifications',
        href: '/business/dashboard/notifications',
        icon: Bell,
      },
    ],
  },
  {
    title: 'Commerce',
    items: [
      {
        label: 'Orders',
        href: '/business/dashboard/orders',
        icon: ShoppingBag,
      },
      {
        label: 'Bookings',
        href: '/business/dashboard/bookings',
        icon: CalendarCheck,
      },
      {
        label: 'Chat',
        href: '/business/dashboard/chat',
        icon: MessageCircle,
      },
    ],
  },
  {
    title: 'Catalog',
    items: [
      {
        label: 'Products',
        href: '/business/dashboard/products',
        icon: Package,
      },
      {
        label: 'Services',
        href: '/business/dashboard/services',
        icon: Wrench,
      },
    ],
  },
  {
    title: 'Marketing',
    items: [
      {
        label: 'Ruby+ Ads',
        href: '/business/dashboard/ruby-ads',
        icon: Sparkles,
      },
      { label: 'Events', href: '/business/dashboard/events', icon: Ticket },
      {
        label: 'Reviews',
        href: '/business/dashboard/reviews',
        icon: Megaphone,
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Wallet', href: '/business/dashboard/wallet', icon: Wallet },
      {
        label: 'Payouts',
        href: '/business/dashboard/payouts',
        icon: Wallet,
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        label: 'Analytics',
        href: '/business/dashboard/analytics',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'Organization',
    items: [
      {
        label: 'Branches',
        href: '/business/dashboard/branches',
        icon: Building2,
      },
      { label: 'Staff', href: '/business/dashboard/staff', icon: Users },
      {
        label: 'Referrals',
        href: '/business/dashboard/referral',
        icon: Gift,
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        label: 'Disputes',
        href: '/business/dashboard/disputes',
        icon: AlertTriangle,
      },
      {
        label: 'Settings',
        href: '/business/dashboard/settings',
        icon: Settings,
      },
    ],
  },
];

/**
 * Compute the single "most-specific active href" so nested routes don't
 * highlight two sidebar items at once. Longest-prefix wins.
 */
function computeActiveHref(pathname: string): string | null {
  const candidates: string[] = [];
  for (const g of BUSINESS_NAV_GROUPS) {
    for (const i of g.items) {
      if (pathname === i.href || pathname.startsWith(i.href + '/')) {
        candidates.push(i.href);
      }
    }
  }
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.length - a.length)[0];
}

export function BusinessSidebar() {
  const pathname = usePathname();
  const activeHref = computeActiveHref(pathname);
  const visibility = useBusinessVisibility();

  // Apply per-business visibility to the catalog group. Products hide
  // when the business doesn't sell products; Services hide when the
  // business model is ORDER_DELIVERY (goods only). While hydrating
  // (`isReady === false`) both stay visible to avoid a hydration flash.
  const groups = useMemo(() => {
    return BUSINESS_NAV_GROUPS.map((group) => {
      if (group.title !== 'Catalog') return group;
      const items = group.items.filter((item) => {
        if (item.href === '/business/dashboard/products') {
          return visibility.showProducts;
        }
        if (item.href === '/business/dashboard/services') {
          return visibility.showServices;
        }
        return true;
      });
      return { ...group, items };
    }).filter((group) => group.items.length > 0);
  }, [visibility.showProducts, visibility.showServices]);

  return (
    <aside aria-label="Business dashboard navigation" className="flex h-full w-16 shrink-0 flex-col border-r border-gray-200 bg-white sm:w-64">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-100 px-2 sm:justify-start sm:px-6">
        <Link href="/business/dashboard" className="flex items-center gap-2" aria-label="Ruby+ Business dashboard">
          <img src="/images/logo.png" alt="Ruby+" className="h-5 w-auto sm:h-6" />
          <span className="hidden text-sm font-bold text-gray-900 sm:inline">Business</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-4">
        {groups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="mb-1 hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 sm:block">
              {group.title}
            </p>
            <ul>
              {group.items.map((item) => {
                const isActive = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm transition sm:justify-start ${
                        isActive
                          ? 'bg-ruby-red/10 text-ruby-red font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
