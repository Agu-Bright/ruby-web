"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  AlertTriangle,
  Banknote,
  CheckCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import api from "@/lib/api/client";
import type { AdminNotification, AdminNotificationType } from "@/lib/types";

const TYPE_CONFIG: Record<
  AdminNotificationType,
  { icon: typeof Bell; color: string; bg: string; route: string }
> = {
  ADMIN_BUSINESS_PENDING: {
    icon: Building2,
    color: "text-amber-600",
    bg: "bg-amber-50",
    route: "/ruby-app/admin/businesses",
  },
  ADMIN_DISPUTE_FILED: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    route: "/ruby-app/admin/disputes",
  },
  ADMIN_PAYOUT_REQUESTED: {
    icon: Banknote,
    color: "text-blue-600",
    bg: "bg-blue-50",
    route: "/ruby-app/admin/finance",
  },
  ADMIN_EMERGENCY_SOS: {
    icon: ShieldAlert,
    color: "text-red-700",
    bg: "bg-red-100",
    route: "/ruby-app/admin/emergency",
  },
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await api.notifications.unreadCount();
      setUnreadCount((data as any)?.count ?? 0);
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.notifications.list({ limit: 10 });
      setNotifications((data as any)?.items ?? []);
    } catch {}
    setLoading(false);
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNotificationClick = async (notification: AdminNotification) => {
    if (!notification.isRead) {
      try {
        await api.notifications.markRead([notification._id]);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
      } catch {}
    }

    const config = TYPE_CONFIG[notification.type];
    if (config?.route) {
      router.push(config.route);
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 flex items-center justify-center bg-ruby-600 text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-ruby-600 hover:text-ruby-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <CheckCircle className="w-8 h-8 mb-2" />
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const config = TYPE_CONFIG[notification.type] || {
                  icon: Bell,
                  color: "text-gray-500",
                  bg: "bg-gray-50",
                  route: "#",
                };
                const Icon = config.icon;
                return (
                  <button
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                      !notification.isRead ? "bg-ruby-50/30" : ""
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${config.bg}`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 bg-ruby-600 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <button
              onClick={() => {
                router.push("/ruby-app/admin/notifications");
                setOpen(false);
              }}
              className="w-full text-center text-xs font-medium text-ruby-600 hover:text-ruby-700"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
