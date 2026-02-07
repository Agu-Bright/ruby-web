"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  MapPin,
  Users,
  FolderTree,
  FileText,
  Store,
  ShoppingCart,
  CalendarCheck,
  AlertTriangle,
  Wallet,
  ScrollText,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ToastProvider } from "@/components/ui";
import { getInitials } from "@/lib/utils";
import Image from "next/image";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  superOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/ruby-app/admin", icon: LayoutDashboard },
  { label: "Locations", href: "/ruby-app/admin/locations", icon: MapPin },
  {
    label: "Admin Users",
    href: "/ruby-app/admin/users",
    icon: Users,
    superOnly: true,
  },
  { label: "Taxonomy", href: "/ruby-app/admin/taxonomy", icon: FolderTree },
  { label: "Templates", href: "/ruby-app/admin/templates", icon: FileText },
  { label: "Businesses", href: "/ruby-app/admin/businesses", icon: Store },
  { label: "Orders", href: "/ruby-app/admin/orders", icon: ShoppingCart },
  { label: "Bookings", href: "/ruby-app/admin/bookings", icon: CalendarCheck },
  { label: "Disputes", href: "/ruby-app/admin/disputes", icon: AlertTriangle },
  { label: "Finance", href: "/ruby-app/admin/finance", icon: Wallet },
  { label: "Audit Logs", href: "/ruby-app/admin/audit-logs", icon: ScrollText },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { admin, isLoading, isAuthenticated, logout, isSuperAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/ruby-app/admin/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-ruby-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !admin) return null;

  const filteredNav = navItems.filter((item) => {
    if (item.superOnly && !isSuperAdmin) return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === "/ruby-app/admin") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50">
            <SidebarContent
              items={filteredNav}
              isActive={isActive}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:flex lg:flex-col bg-white border-r border-gray-200 z-30">
        <SidebarContent items={filteredNav} isActive={isActive} />
      </aside>

      {/* Main content */}
      <div className="lg:ml-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-200 h-14 flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:block">
            <Breadcrumb pathname={pathname} />
          </div>

          <div className="flex items-center gap-3 relative">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">
                {admin.firstName} {admin.lastName}
              </div>
              <div className="text-xs text-gray-500">
                {admin.roles?.[0]?.replace(/_/g, " ") || "Admin"}
              </div>{" "}
            </div>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-8 h-8 bg-ruby-600 text-white rounded-lg flex items-center justify-center text-xs font-bold hover:bg-ruby-700 transition-colors"
            >
              {getInitials(admin.firstName, admin.lastName)}
            </button>

            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-20 animate-slide-down">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="text-sm font-medium">{admin.email}</div>
                    <div className="text-xs text-gray-500">
                      {admin.scope} scope
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  items,
  isActive,
  onClose,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
        <Link href="/ruby-app/admin" className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="Ruby+"
            width={100}
            height={32}
            className="h-7 w-auto object-contain"
          />
          <span className="text-gray-400 font-normal text-sm">Admin</span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-ruby-50 text-ruby-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <item.icon
                className={`w-4 h-4 ${active ? "text-ruby-600" : "text-gray-400"}`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to website
        </Link>
      </div>
    </div>
  );
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname
    .replace("/ruby-app/admin", "")
    .split("/")
    .filter(Boolean);

  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500">
      <Link
        href="/ruby-app/admin"
        className="hover:text-gray-900 transition-colors"
      >
        Dashboard
      </Link>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronDown className="w-3 h-3 -rotate-90" />
          <span
            className={
              i === segments.length - 1 ? "text-gray-900 font-medium" : ""
            }
          >
            {seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ")}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ToastProvider />
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
