"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radio,
  Send,
  Users,
  Store,
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, Modal, StatusBadge } from "@/components/ui";
import type {
  BroadcastTargetAudience,
  BroadcastNotification,
  BroadcastHistoryResponse,
  Location,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

const audienceOptions: {
  value: BroadcastTargetAudience;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: "ALL",
    label: "Everyone",
    icon: Globe,
    description: "All customers and business owners",
  },
  {
    value: "USERS",
    label: "Customers",
    icon: Users,
    description: "Customer app users only",
  },
  {
    value: "BUSINESS_OWNERS",
    label: "Business Owners",
    icon: Store,
    description: "Business app users only",
  },
];

export default function BroadcastsPage() {
  const { admin, isSuperAdmin } = useAuth();
  const isGlobalScope = admin?.scope === "GLOBAL";

  // Compose form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetAudience, setTargetAudience] =
    useState<BroadcastTargetAudience>("ALL");
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Locations for selector
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // History state
  const [history, setHistory] = useState<BroadcastNotification[]>([]);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load locations
  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      try {
        const res = await api.locations.list();
        const data = res.data || res;
        setLocations(Array.isArray(data) ? data : []);
      } catch {
        // silent
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  // For LOCATION admins, pre-set their location IDs
  useEffect(() => {
    if (!isGlobalScope && admin?.locationIds) {
      const ids = admin.locationIds.map((loc: string | { _id: string }) =>
        typeof loc === "object" ? loc._id : loc
      );
      setSelectedLocationIds(ids);
    }
  }, [isGlobalScope, admin]);

  // Load broadcast history
  const fetchHistory = useCallback(async (page = 1) => {
    setLoadingHistory(true);
    try {
      const res = await api.notifications.broadcastHistory({ page, limit: 10 });
      const data = res.data || res;
      setHistory((data as BroadcastHistoryResponse).items || []);
      setHistoryPagination(
        (data as BroadcastHistoryResponse).pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        }
      );
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await api.notifications.broadcast({
        title,
        body,
        targetAudience,
        locationIds:
          isGlobalScope && selectedLocationIds.length === 0
            ? undefined
            : selectedLocationIds,
      });
      toast.success("Broadcast sent successfully");
      setTitle("");
      setBody("");
      setTargetAudience("ALL");
      if (isGlobalScope) setSelectedLocationIds([]);
      setShowConfirm(false);
      fetchHistory();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send broadcast");
    } finally {
      setIsSending(false);
    }
  };

  const getLocationName = (id: string) => {
    const loc = locations.find(
      (l) => l._id === id || (l as any).id === id
    );
    return loc?.name || id;
  };

  const getAudienceLabel = (audience: string) => {
    const opt = audienceOptions.find((o) => o.value === audience);
    return opt?.label || audience;
  };

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  return (
    <div>
      <PageHeader
        title="Broadcasts"
        description="Send push notifications to users and businesses"
      />

      {/* Compose Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Radio className="w-5 h-5 text-ruby-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Compose Broadcast
          </h2>
        </div>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              placeholder="Notification title"
              className="input-field mt-1"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {title.length}/100
            </p>
          </div>

          {/* Body */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 500))}
              placeholder="Notification message body"
              rows={4}
              className="input-field mt-1 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {body.length}/500
            </p>
          </div>

          {/* Target Audience */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Target Audience
            </label>
            <div className="flex gap-3">
              {audienceOptions.map((opt) => {
                const Icon = opt.icon;
                const selected = targetAudience === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTargetAudience(opt.value)}
                    className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      selected
                        ? "border-ruby-500 bg-ruby-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${selected ? "text-ruby-600" : "text-gray-400"}`}
                    />
                    <div className="text-left">
                      <p
                        className={`text-sm font-medium ${selected ? "text-ruby-700" : "text-gray-700"}`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Selector */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Locations
            </label>
            {isGlobalScope ? (
              <div>
                {selectedLocationIds.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-2">
                    All locations (global broadcast)
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedLocationIds.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ruby-50 text-ruby-700 text-xs font-medium"
                      >
                        <MapPin className="w-3 h-3" />
                        {getLocationName(id)}
                        <button
                          onClick={() =>
                            setSelectedLocationIds((prev) =>
                              prev.filter((l) => l !== id)
                            )
                          }
                          className="ml-0.5 hover:text-ruby-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <select
                  value=""
                  onChange={(e) => {
                    if (
                      e.target.value &&
                      !selectedLocationIds.includes(e.target.value)
                    ) {
                      setSelectedLocationIds((prev) => [
                        ...prev,
                        e.target.value,
                      ]);
                    }
                  }}
                  className="input-field"
                  disabled={loadingLocations}
                >
                  <option value="">
                    {loadingLocations
                      ? "Loading locations..."
                      : "Add location filter (optional)"}
                  </option>
                  {locations
                    .filter((l) => !selectedLocationIds.includes(l._id))
                    .map((loc) => (
                      <option key={loc._id} value={loc._id}>
                        {loc.name}
                        {loc.type ? ` (${loc.type})` : ""}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedLocationIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium"
                  >
                    <MapPin className="w-3 h-3" />
                    {getLocationName(id)}
                  </span>
                ))}
                {selectedLocationIds.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No locations assigned to your account
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Send Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!canSend}
              className="btn-primary px-6 py-2.5 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Broadcast
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => !isSending && setShowConfirm(false)}
        title="Confirm Broadcast"
        subtitle="This will send a push notification to all targeted users"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800 font-medium">
              You are about to send a broadcast notification:
            </p>
          </div>

          <div className="space-y-2">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Title
              </p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {title}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Message
              </p>
              <p className="text-sm text-gray-700 mt-0.5">{body}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Audience
                </p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {getAudienceLabel(targetAudience)}
                </p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Scope
                </p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {selectedLocationIds.length === 0
                    ? "All locations"
                    : `${selectedLocationIds.length} location${selectedLocationIds.length > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isSending}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending}
              className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Confirm & Send
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Broadcast History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Broadcast History
          </h2>
        </div>

        {loadingHistory ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center">
            <Radio className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No broadcasts sent yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                      Date
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                      Title
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                      Audience
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                      Recipients
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                      Delivered
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((b) => (
                    <tr
                      key={b._id}
                      className="border-b border-gray-50 hover:bg-gray-50/50"
                    >
                      <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(b.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                          {b.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">
                          {b.body}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {b.targetAudience === "ALL" && (
                            <Globe className="w-3 h-3" />
                          )}
                          {b.targetAudience === "USERS" && (
                            <Users className="w-3 h-3" />
                          )}
                          {b.targetAudience === "BUSINESS_OWNERS" && (
                            <Store className="w-3 h-3" />
                          )}
                          {getAudienceLabel(b.targetAudience)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">
                        {b.totalRecipients}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-600 flex items-center gap-0.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {b.totalPushSent}
                          </span>
                          {b.totalFailed > 0 && (
                            <span className="text-red-500 flex items-center gap-0.5">
                              <XCircle className="w-3.5 h-3.5" />
                              {b.totalFailed}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {b.status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            <CheckCircle className="w-3 h-3" />
                            Completed
                          </span>
                        ) : b.status === "SENDING" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Sending
                          </span>
                        ) : b.status === "FAILED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {historyPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Page {historyPagination.page} of{" "}
                  {historyPagination.totalPages} ({historyPagination.total}{" "}
                  total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      fetchHistory(historyPagination.page - 1)
                    }
                    disabled={historyPagination.page <= 1}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      fetchHistory(historyPagination.page + 1)
                    }
                    disabled={
                      historyPagination.page >= historyPagination.totalPages
                    }
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
