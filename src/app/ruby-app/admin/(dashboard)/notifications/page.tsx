"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  AlertTriangle,
  Banknote,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import api from "@/lib/api/client";
import type {
  AdminNotification,
  AdminNotificationType,
  AdminNotificationListResponse,
} from "@/lib/types";

const TYPE_CONFIG: Record<
  AdminNotificationType,
  { icon: typeof Bell; color: string; bg: string; route: string; label: string }
> = {
  ADMIN_BUSINESS_PENDING: {
    icon: Building2,
    color: "text-amber-600",
    bg: "bg-amber-50",
    route: "/ruby-app/admin/businesses",
    label: "Business Review",
  },
  ADMIN_DISPUTE_FILED: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    route: "/ruby-app/admin/disputes",
    label: "Dispute Filed",
  },
  ADMIN_PAYOUT_REQUESTED: {
    icon: Banknote,
    color: "text-blue-600",
    bg: "bg-blue-50",
    route: "/ruby-app/admin/finance",
    label: "Payout Request",
  },
};

type FilterTab = "all" | "unread" | "businesses" | "disputes" | "finance";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "businesses", label: "Businesses" },
  { key: "disputes", label: "Disputes" },
  { key: "finance", label: "Finance" },
];

function getFilterParams(tab: FilterTab): { type?: string; isRead?: boolean } {
  switch (tab) {
    case "unread":
      return { isRead: false };
    case "businesses":
      return { type: "ADMIN_BUSINESS_PENDING" };
    case "disputes":
      return { type: "ADMIN_DISPUTE_FILED" };
    case "finance":
      return { type: "ADMIN_PAYOUT_REQUESTED" };
    default:
      return {};
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const filterParams = getFilterParams(activeTab);

  const {
    data: response,
    loading,
    refetch,
  } = useApi<AdminNotificationListResponse>(
    () =>
      api.notifications.list({
        page,
        limit,
        ...filterParams,
      }),
    [activeTab, page]
  );

  const notifications = (response as any)?.items ?? [];
  const pagination = (response as any)?.pagination ?? {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  };

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleNotificationClick = useCallback(
    async (notification: AdminNotification) => {
      if (!notification.isRead) {
        try {
          await api.notifications.markRead([notification._id]);
          refetch();
        } catch {}
      }

      const config = TYPE_CONFIG[notification.type];
      if (config?.route) {
        router.push(config.route);
      }
    },
    [router, refetch]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.notifications.markAllRead();
      refetch();
    } catch {}
  }, [refetch]);

  const unreadCount = notifications.filter(
    (n: AdminNotification) => !n.isRead
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated on platform activity"
      />

      {/* Filter Tabs + Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-ruby-50 text-ruby-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-ruby-600 hover:text-ruby-700 px-3 py-1.5 rounded-lg hover:bg-ruby-50 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="divide-y divide-gray-50">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-ruby-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <CheckCircle className="w-12 h-12 mb-3" />
              <p className="text-base font-medium">All caught up!</p>
              <p className="text-sm mt-1">No notifications to show.</p>
            </div>
          ) : (
            notifications.map((notification: AdminNotification) => {
              const config = TYPE_CONFIG[notification.type] || {
                icon: Bell,
                color: "text-gray-500",
                bg: "bg-gray-50",
                route: "#",
                label: "Notification",
              };
              const Icon = config.icon;

              return (
                <button
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left ${
                    !notification.isRead ? "bg-ruby-50/20" : ""
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.bg}`}
                  >
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider ${config.color}`}
                      >
                        {config.label}
                      </span>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-ruby-600 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
