"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  ChevronRight,
  ExternalLink,
  Bell,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ToastProvider } from "@/components/ui";
import { getInitials } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  superOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/ruby-app/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Locations", href: "/ruby-app/admin/locations", icon: MapPin },
      { label: "Admin Users", href: "/ruby-app/admin/users", icon: Users, superOnly: true },
      { label: "Taxonomy", href: "/ruby-app/admin/taxonomy", icon: FolderTree },
      { label: "Templates", href: "/ruby-app/admin/templates", icon: FileText },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Businesses", href: "/ruby-app/admin/businesses", icon: Store },
      { label: "Orders", href: "/ruby-app/admin/orders", icon: ShoppingCart },
      { label: "Bookings", href: "/ruby-app/admin/bookings", icon: CalendarCheck },
      { label: "Disputes", href: "/ruby-app/admin/disputes", icon: AlertTriangle },
    ],
  },
  {
    title: "Finance & Logs",
    items: [
      { label: "Finance", href: "/ruby-app/admin/finance", icon: Wallet },
      { label: "Audit Logs", href: "/ruby-app/admin/audit-logs", icon: ScrollText },
    ],
  },
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-ruby-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !admin) return null;

  const filteredGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !(item.superOnly && !isSuperAdmin)),
  })).filter((group) => group.items.length > 0);

  const isActive = (href: string) => {
    if (href === "/ruby-app/admin") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[270px] z-50 animate-slide-in-left">
            <SidebarContent
              groups={filteredGroups}
              isActive={isActive}
              admin={admin}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-[260px] lg:flex lg:flex-col z-30">
        <SidebarContent
          groups={filteredGroups}
          isActive={isActive}
          admin={admin}
        />
      </aside>

      {/* Main content */}
      <div className="lg:ml-[260px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-gray-200/80 h-[60px] flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <div className="hidden lg:block">
              <Breadcrumb pathname={pathname} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-ruby-600 rounded-full ring-2 ring-white" />
            </button>

            <div className="w-px h-8 bg-gray-200 mx-1" />

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-ruby-500 to-ruby-700 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm">
                  {getInitials(admin.firstName, admin.lastName)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-semibold text-gray-900 leading-tight">
                    {admin.firstName} {admin.lastName}
                  </div>
                  <div className="text-[11px] text-gray-500 leading-tight capitalize">
                    {admin.roles?.[0]?.replace(/_/g, " ") || "Admin"}
                  </div>
                </div>
              </button>

              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 top-12 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-20 animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="text-sm font-semibold text-gray-900">{admin.firstName} {admin.lastName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{admin.email}</div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-ruby-50 text-ruby-700 border border-ruby-200 uppercase">
                          {admin.roles?.[0]?.replace(/_/g, " ") || "ADMIN"}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-600">
                          {admin.scope}
                        </span>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  groups,
  isActive,
  admin,
  onClose,
}: {
  groups: NavGroup[];
  isActive: (href: string) => boolean;
  admin: { firstName: string; lastName: string; email: string; roles?: string[]; scope: string };
  onClose?: () => void;
}) {
  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{
        background: "linear-gradient(175deg, #B71C1C 0%, #FD362F 50%, #97201C 100%)",
      }}
    >
      {/* Pattern overlay — same as RedStrip */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Diamond 1 — left, smaller, shifted down (same as RedStrip) */}
      <div
        className="absolute left-0 bottom-0 -translate-x-[8%] translate-y-[10%] w-36 h-36 bg-contain bg-no-repeat bg-center brightness-[0.4] pointer-events-none"
        style={{ backgroundImage: "url(/images/diamond1.png)" }}
        aria-hidden="true"
      />

      {/* Diamond 2 — right, bigger, mid-section (same as RedStrip) */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[35%] w-60 h-60 bg-contain bg-no-repeat bg-center brightness-[0.4] pointer-events-none"
        style={{ backgroundImage: "url(/images/diamond2.png)" }}
        aria-hidden="true"
      />

      {/* Logo area */}
      <div className="relative z-10 h-[60px] flex items-center justify-between px-4 border-b border-white/10">
        <Link href="/ruby-app/admin" className="block w-full" onClick={onClose}>
          <Image
            src="/images/logo-w.png"
            alt="Ruby+"
            width={167}
            height={54}
            className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            priority
          />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/70 transition-colors shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 py-4 px-3 overflow-y-auto scrollbar-hide">
        {groups.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? "mt-6" : ""}>
            <div className="px-3 mb-2">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">
                {group.title}
              </span>
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-white text-ruby-700 shadow-lg shadow-black/10"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon
                      className={`w-[18px] h-[18px] transition-colors ${
                        active ? "text-ruby-600" : "text-white/60 group-hover:text-white/90"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {active && (
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-ruby-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="relative z-10 p-3 border-t border-white/10">
        {/* Mini profile card */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm mb-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white text-xs font-bold">
            {getInitials(admin.firstName, admin.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {admin.firstName} {admin.lastName}
            </div>
            <div className="text-[10px] text-white/50 truncate capitalize">
              {admin.roles?.[0]?.replace(/_/g, " ") || "Admin"}
            </div>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 text-xs text-white/50 hover:text-white/80 transition-colors rounded-lg hover:bg-white/5"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Back to website
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
    <div className="flex items-center gap-1.5 text-sm">
      <Link
        href="/ruby-app/admin"
        className="text-gray-500 hover:text-ruby-600 transition-colors font-medium"
      >
        Dashboard
      </Link>
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span
            className={
              i === segments.length - 1
                ? "text-gray-900 font-semibold"
                : "text-gray-500"
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
