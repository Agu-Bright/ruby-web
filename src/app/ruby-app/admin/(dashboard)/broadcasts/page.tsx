"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Film,
  Trash2,
  AlertCircle,
  Smartphone,
  CalendarClock,
  Link2,
  TestTube2,
  Ban,
  Eye,
  History,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, Modal, DataTable, type Column } from "@/components/ui";
import type {
  BroadcastTargetAudience,
  BroadcastStatus,
  BroadcastNotification,
  BroadcastAttachment,
  BroadcastPreviewResponse,
  BroadcastPlatform,
  BroadcastDeepLink,
  Location,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

/**
 * Audience picker. CUSTOMER_APP / BUSINESS_APP are the canonical values
 * (clear about which mobile app receives the push). The legacy
 * USERS / BUSINESS_OWNERS aliases are accepted by the backend but no
 * longer surfaced as picker options — history rows that carry them
 * still render with the matching friendly label via `getAudienceLabel`.
 */
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
    description: "Customer app + Business app users",
  },
  {
    value: "CUSTOMER_APP",
    label: "Customer App",
    icon: Users,
    description: "Only Ruby+ customer mobile devices",
  },
  {
    value: "BUSINESS_APP",
    label: "Business App",
    icon: Store,
    description: "Only Ruby+ business owner mobile devices",
  },
];

/** Deep-link kinds the admin picker exposes. Mobile route handlers
 *  switch on `kind` to navigate. Keep `NONE` as the default. */
const deepLinkKinds: {
  value: string;
  label: string;
  hint: string;
  needsTargetId?: boolean;
  needsUrl?: boolean;
  audienceHint?: "customer" | "business" | "both";
}[] = [
  { value: "NONE", label: "No deep link", hint: "Tap just opens the app." },
  {
    value: "BUSINESS",
    label: "Business profile",
    hint: "Opens /business/<id> in the app",
    needsTargetId: true,
    audienceHint: "both",
  },
  {
    value: "EVENT",
    label: "Event detail",
    hint: "Opens /event/<id> in the customer app",
    needsTargetId: true,
    audienceHint: "customer",
  },
  {
    value: "CATEGORY",
    label: "Category",
    hint: "Opens /category/<id> in the customer app",
    needsTargetId: true,
    audienceHint: "customer",
  },
  {
    value: "PROMO",
    label: "Promo / In-app screen",
    hint: "Opens /promo/<id> in the customer app",
    needsTargetId: true,
    audienceHint: "customer",
  },
  {
    value: "REWARDS",
    label: "Rewards screen",
    hint: "Opens the Rewards screen (customer app)",
    audienceHint: "customer",
  },
  {
    value: "WALLET",
    label: "Wallet",
    hint: "Opens the wallet screen",
    audienceHint: "both",
  },
  {
    value: "EXTERNAL_URL",
    label: "External URL",
    hint: "Opens the URL in the system browser",
    needsUrl: true,
  },
];

const platformOptions: { value: BroadcastPlatform; label: string }[] = [
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
];

type Tab = "compose" | "scheduled" | "history";

export default function BroadcastsPage() {
  const { admin } = useAuth();
  const isGlobalScope = admin?.scope === "GLOBAL";

  // ── Tab state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("compose");

  // ── Compose form state ──────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetAudience, setTargetAudience] =
    useState<BroadcastTargetAudience>("ALL");
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<BroadcastPlatform[]>(
    [],
  );
  // Deep-link composer state — kept separate from the final BroadcastDeepLink
  // shape so the user can switch between kinds without losing every field.
  const [deepLinkKind, setDeepLinkKind] = useState<string>("NONE");
  const [deepLinkTargetId, setDeepLinkTargetId] = useState("");
  const [deepLinkUrl, setDeepLinkUrl] = useState("");
  // Schedule state — schedule toggle on → datetime input shown.
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  // Attachment + uploading
  const [attachment, setAttachment] = useState<BroadcastAttachment | null>(null);
  const [uploading, setUploading] = useState(false);

  // ── Action state ────────────────────────────────────────────────────────
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testRecipientId, setTestRecipientId] = useState("");
  const [isTestSending, setIsTestSending] = useState(false);

  // ── Audience preview ────────────────────────────────────────────────────
  const [preview, setPreview] = useState<BroadcastPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Last send result panel ──────────────────────────────────────────────
  const [lastResult, setLastResult] = useState<BroadcastNotification | null>(null);

  // ── Locations ───────────────────────────────────────────────────────────
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // ── History + scheduled lists ───────────────────────────────────────────
  const [history, setHistory] = useState<BroadcastNotification[]>([]);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [includeTest, setIncludeTest] = useState(false);

  const [scheduled, setScheduled] = useState<BroadcastNotification[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  // ── Detail modal ────────────────────────────────────────────────────────
  const [detailBroadcast, setDetailBroadcast] =
    useState<BroadcastNotification | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load locations once
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

  // LOCATION admins inherit their location scope
  useEffect(() => {
    if (!isGlobalScope && admin?.locationIds) {
      const ids = admin.locationIds.map((loc: string | { _id: string }) =>
        typeof loc === "object" ? loc._id : loc,
      );
      setSelectedLocationIds(ids);
    }
  }, [isGlobalScope, admin]);

  // ── Data loaders ────────────────────────────────────────────────────────
  const fetchHistory = useCallback(
    async (page = 1, withTest = includeTest) => {
      setLoadingHistory(true);
      try {
        const res = await api.notifications.broadcastHistory({
          page,
          limit: 10,
          includeTest: withTest,
        });
        const items = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || [];
        setHistory(items);
        const pg = (res as any).meta?.pagination;
        setHistoryPagination(
          pg || { page: 1, limit: 10, total: 0, totalPages: 0 },
        );
      } catch {
        // silent
      } finally {
        setLoadingHistory(false);
      }
    },
    [includeTest],
  );

  const fetchScheduled = useCallback(async () => {
    setLoadingScheduled(true);
    try {
      const res = await api.notifications.broadcastHistory({
        page: 1,
        limit: 50,
        status: "SCHEDULED",
      });
      const items = Array.isArray(res.data)
        ? res.data
        : (res.data as any)?.items || [];
      setScheduled(items);
    } catch {
      // silent
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (activeTab === "scheduled") fetchScheduled();
  }, [activeTab, fetchScheduled]);

  // ── Audience preview — debounced on every targeting change ──────────────
  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await api.notifications.broadcastPreview({
          targetAudience,
          locationIds:
            isGlobalScope && selectedLocationIds.length === 0
              ? undefined
              : selectedLocationIds,
          platforms:
            selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
        });
        if (cancelled) return;
        setPreview((res.data || res) as BroadcastPreviewResponse);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [targetAudience, selectedLocationIds, selectedPlatforms, isGlobalScope]);

  // ── Compose helpers ─────────────────────────────────────────────────────

  /**
   * Build the BroadcastDeepLink object the API expects from the composer
   * fields. Returns undefined when "No deep link" is selected so the
   * payload omits the field entirely (cleaner than serialising a NONE).
   */
  const buildDeepLink = (): BroadcastDeepLink | undefined => {
    const kindMeta = deepLinkKinds.find((k) => k.value === deepLinkKind);
    if (!kindMeta || deepLinkKind === "NONE") return undefined;
    const dl: BroadcastDeepLink = { kind: deepLinkKind };
    if (kindMeta.needsTargetId) {
      if (!deepLinkTargetId.trim()) return undefined;
      dl.targetId = deepLinkTargetId.trim();
    }
    if (kindMeta.needsUrl) {
      if (!deepLinkUrl.trim()) return undefined;
      dl.url = deepLinkUrl.trim();
    }
    return dl;
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setTargetAudience("ALL");
    setSelectedPlatforms([]);
    setAttachment(null);
    setDeepLinkKind("NONE");
    setDeepLinkTargetId("");
    setDeepLinkUrl("");
    setScheduleEnabled(false);
    setScheduledAt("");
    if (isGlobalScope) setSelectedLocationIds([]);
  };

  const handleFileSelected = async (file: File) => {
    if (!file) return;
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("File too large — maximum 100 MB.");
      return;
    }
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Only photos and videos are supported.");
      return;
    }
    setUploading(true);
    try {
      const res = await api.media.upload(file, "broadcasts");
      const url = (res?.data?.url || (res as any)?.data?.publicUrl) as
        | string
        | undefined;
      if (!url) throw new Error("Upload succeeded but no URL was returned");
      setAttachment({
        url,
        type: file.type.startsWith("video/") ? "video" : "image",
        mimeType: file.type,
        fileName: file.name,
        sizeBytes: file.size,
      });
      toast.success("Attachment uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const isScheduled = scheduleEnabled && scheduledAt;
      const res = await api.notifications.broadcast({
        title,
        body,
        targetAudience,
        locationIds:
          isGlobalScope && selectedLocationIds.length === 0
            ? undefined
            : selectedLocationIds,
        platforms:
          selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
        deepLink: buildDeepLink(),
        scheduledAt: isScheduled
          ? new Date(scheduledAt).toISOString()
          : undefined,
        attachment: attachment || undefined,
      });

      const result = (res?.data || res) as BroadcastNotification;
      setLastResult(result);

      if (result.status === "SCHEDULED") {
        const when = result.scheduledAt
          ? new Date(result.scheduledAt).toLocaleString()
          : "later";
        toast.success(`Broadcast scheduled for ${when}.`);
      } else if (result.status === "FAILED") {
        toast.error(
          result.errorMessage ||
            (result.totalRecipients === 0
              ? "Broadcast failed — no users in the audience received it."
              : `Broadcast failed — ${result.totalFailed} of ${result.totalRecipients} push deliveries failed.`),
        );
      } else if (result.totalFailed > 0) {
        toast.warning(
          `Broadcast partially delivered — ${result.totalPushSent} sent, ${result.totalFailed} failed.`,
        );
      } else {
        toast.success(
          `Broadcast sent to ${result.totalPushSent} recipient${result.totalPushSent === 1 ? "" : "s"}.`,
        );
      }

      resetForm();
      setShowConfirm(false);
      fetchHistory();
      if (activeTab === "scheduled") fetchScheduled();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send broadcast");
    } finally {
      setIsSending(false);
    }
  };

  const handleTestSend = async () => {
    if (!testRecipientId.trim()) {
      toast.error("Enter a recipient user ID first");
      return;
    }
    setIsTestSending(true);
    try {
      const res = await api.notifications.broadcastTest({
        title,
        body,
        testRecipientId: testRecipientId.trim(),
        deepLink: buildDeepLink(),
        attachment: attachment || undefined,
      });
      const result = (res?.data || res) as BroadcastNotification;
      if (result.status === "TEST" && result.totalPushSent > 0) {
        toast.success(
          `Test sent — ${result.totalPushSent} push(es) delivered to that user's device(s).`,
        );
      } else {
        toast.error(
          result.errorMessage ||
            "Test send didn't deliver. The user may not have a registered device.",
        );
      }
      setShowTestModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Test send failed");
    } finally {
      setIsTestSending(false);
    }
  };

  const handleResend = (broadcast: BroadcastNotification) => {
    setTitle(broadcast.title);
    setBody(broadcast.body);
    setTargetAudience(broadcast.targetAudience);
    setSelectedPlatforms(broadcast.platforms || []);
    setAttachment(broadcast.attachment || null);
    if (broadcast.deepLink) {
      setDeepLinkKind(broadcast.deepLink.kind);
      setDeepLinkTargetId(broadcast.deepLink.targetId || "");
      setDeepLinkUrl(broadcast.deepLink.url || "");
    } else {
      setDeepLinkKind("NONE");
      setDeepLinkTargetId("");
      setDeepLinkUrl("");
    }
    setScheduleEnabled(false);
    setScheduledAt("");
    if (isGlobalScope && broadcast.locationIds?.length) {
      setSelectedLocationIds(
        broadcast.locationIds.map((id: any) =>
          typeof id === "object" ? id._id : id,
        ),
      );
    }
    setDetailBroadcast(null);
    setActiveTab("compose");
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("Broadcast loaded — review and send");
  };

  const handleCancelScheduled = async (broadcast: BroadcastNotification) => {
    if (
      !window.confirm(
        `Cancel scheduled broadcast "${broadcast.title}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await api.notifications.broadcastCancel(broadcast._id);
      toast.success("Scheduled broadcast cancelled.");
      fetchScheduled();
      fetchHistory();
      setDetailBroadcast(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel broadcast");
    }
  };

  const handleOpenDetail = async (broadcast: BroadcastNotification) => {
    // Optimistic open — show what we have from the list row right away,
    // then fetch the full doc for fields the list query elides.
    setDetailBroadcast(broadcast);
    setDetailLoading(true);
    try {
      const res = await api.notifications.broadcastDetail(broadcast._id);
      const full = (res?.data || res) as BroadcastNotification;
      setDetailBroadcast(full);
    } catch {
      // Keep the row we already had — non-fatal.
    } finally {
      setDetailLoading(false);
    }
  };

  const getLocationName = (id: string) => {
    const loc = locations.find((l) => l._id === id || (l as any).id === id);
    return loc?.name || id;
  };

  const getAudienceLabel = (audience: BroadcastTargetAudience): string => {
    // Map legacy aliases to friendlier labels so old history rows render
    // as "Customer App" / "Business App" instead of the raw enum.
    const aliasMap: Record<BroadcastTargetAudience, string> = {
      ALL: "Everyone",
      CUSTOMER_APP: "Customer App",
      BUSINESS_APP: "Business App",
      USERS: "Customer App",
      BUSINESS_OWNERS: "Business App",
    };
    return aliasMap[audience] || audience;
  };

  const audienceIcon = (audience: BroadcastTargetAudience) => {
    if (audience === "ALL") return Globe;
    if (audience === "BUSINESS_APP" || audience === "BUSINESS_OWNERS") return Store;
    return Users;
  };

  const togglePlatform = (p: BroadcastPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const canSend = title.trim().length > 0 && body.trim().length > 0;
  const scheduleIsValid =
    !scheduleEnabled ||
    (scheduledAt.length > 0 && new Date(scheduledAt).getTime() > Date.now());
  const canSubmit = canSend && scheduleIsValid;

  // ── Table columns ───────────────────────────────────────────────────────
  const broadcastColumns: Column<BroadcastNotification>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        render: (b) => (
          <span className="whitespace-nowrap text-sm text-gray-700">
            {formatDate(b.createdAt)}
          </span>
        ),
      },
      {
        key: "broadcast",
        header: "Broadcast",
        render: (b) => (
          <div>
            <p className="text-sm font-medium text-gray-900 truncate max-w-[240px]">
              {b.title}
            </p>
            <p className="text-xs text-gray-500 max-w-[240px] truncate">
              {b.body}
            </p>
          </div>
        ),
      },
      {
        key: "audience",
        header: "Audience",
        render: (b) => {
          const Icon = audienceIcon(b.targetAudience);
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              <Icon className="w-3 h-3" />
              {getAudienceLabel(b.targetAudience)}
            </span>
          );
        },
      },
      {
        key: "platforms",
        header: "Platform",
        render: (b) => {
          if (!b.platforms || b.platforms.length === 0) {
            return <span className="text-xs text-gray-400">All</span>;
          }
          return (
            <div className="flex gap-1">
              {b.platforms.map((p) => (
                <span
                  key={p}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 uppercase"
                >
                  {p}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        key: "delivery",
        header: "Delivery",
        render: (b) => {
          const deliveryRate =
            b.totalRecipients > 0
              ? Math.round((b.totalPushSent / b.totalRecipients) * 100)
              : 0;
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-gray-700">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium">{b.totalRecipients}</span>
                <span className="text-xs text-gray-500">recipients</span>
              </div>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="text-green-600 flex items-center gap-0.5">
                  <CheckCircle className="w-3 h-3" />
                  {b.totalPushSent}
                </span>
                {b.totalFailed > 0 && (
                  <span className="text-red-500 flex items-center gap-0.5">
                    <XCircle className="w-3 h-3" />
                    {b.totalFailed}
                  </span>
                )}
                {b.totalOpened ? (
                  <span className="text-blue-600 flex items-center gap-0.5">
                    <Eye className="w-3 h-3" />
                    {b.totalOpened}
                  </span>
                ) : null}
                {b.totalRecipients > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      deliveryRate >= 90
                        ? "bg-green-50 text-green-700"
                        : deliveryRate >= 50
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {deliveryRate}%
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        render: (b) => <StatusPill status={b.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (b) => (
          <div className="flex gap-1 justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetail(b);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              title="View detail"
            >
              <Eye className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResend(b);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-ruby-600 border border-gray-200 hover:border-ruby-200 rounded-lg hover:bg-ruby-50 transition-colors"
              title="Use as template"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Scheduled tab uses a leaner columns set + a Cancel CTA.
  const scheduledColumns: Column<BroadcastNotification>[] = useMemo(
    () => [
      {
        key: "scheduledAt",
        header: "Fires At",
        render: (b) => (
          <div className="whitespace-nowrap">
            <p className="text-sm font-medium text-gray-900">
              {b.scheduledAt ? formatDate(b.scheduledAt) : "—"}
            </p>
            <p className="text-xs text-gray-500">
              {b.scheduledAt && new Date(b.scheduledAt).toLocaleTimeString()}
            </p>
          </div>
        ),
      },
      {
        key: "broadcast",
        header: "Broadcast",
        render: (b) => (
          <div>
            <p className="text-sm font-medium text-gray-900 truncate max-w-[260px]">
              {b.title}
            </p>
            <p className="text-xs text-gray-500 max-w-[260px] truncate">
              {b.body}
            </p>
          </div>
        ),
      },
      {
        key: "audience",
        header: "Audience",
        render: (b) => {
          const Icon = audienceIcon(b.targetAudience);
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              <Icon className="w-3 h-3" />
              {getAudienceLabel(b.targetAudience)}
            </span>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (b) => (
          <div className="flex gap-1 justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetail(b);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 rounded-lg hover:bg-blue-50"
              title="View detail"
            >
              <Eye className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelScheduled(b);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg hover:bg-red-50"
              title="Cancel scheduled broadcast"
            >
              <Ban className="w-3 h-3" />
              Cancel
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const activeDeepLinkMeta = deepLinkKinds.find((k) => k.value === deepLinkKind);

  return (
    <div>
      <PageHeader
        title="Broadcasts"
        description="Send push notifications to customer or business app users"
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {([
            { id: "compose", label: "Compose", icon: Radio },
            { id: "scheduled", label: "Scheduled", icon: CalendarClock },
            { id: "history", label: "History", icon: History },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(
            (t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? "border-ruby-500 text-ruby-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {t.id === "scheduled" && scheduled.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-ruby-100 text-ruby-700 text-[10px] font-semibold">
                      {scheduled.length}
                    </span>
                  )}
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          COMPOSE TAB
          ────────────────────────────────────────────────────────────────── */}
      {activeTab === "compose" && (
        <>
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

              {/* Attachment */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Attachment (optional)
                </label>
                {attachment ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                    {attachment.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachment.url}
                        alt={attachment.fileName || "attachment"}
                        className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <video
                        src={attachment.url}
                        className="w-20 h-20 rounded-lg object-cover border border-gray-200 bg-gray-900"
                        muted
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-900">
                        {attachment.type === "image" ? (
                          <ImagePlus className="w-3.5 h-3.5 text-gray-500" />
                        ) : (
                          <Film className="w-3.5 h-3.5 text-gray-500" />
                        )}
                        <span className="truncate">
                          {attachment.fileName || attachment.url}
                        </span>
                      </div>
                      {attachment.sizeBytes ? (
                        <p className="text-xs text-gray-500 mt-1">
                          {(attachment.sizeBytes / 1024 / 1024).toFixed(2)} MB ·{" "}
                          {attachment.mimeType}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-gray-500 mt-1">
                        Will appear in the in-app feed
                        {attachment.type === "image" ? " + Android push" : ""}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border border-dashed cursor-pointer transition-colors ${
                      uploading
                        ? "border-gray-200 bg-gray-50 cursor-wait"
                        : "border-gray-300 hover:border-ruby-300 hover:bg-ruby-50/30"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelected(file);
                        e.target.value = "";
                      }}
                    />
                    {uploading ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : (
                      <ImagePlus className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">
                        {uploading ? "Uploading…" : "Add photo or video"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        One attachment per broadcast · 100 MB max · JPG / PNG /
                        MP4 / MOV
                      </p>
                    </div>
                  </label>
                )}
              </div>

              {/* Target Audience — Customer App / Business App / Everyone */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Target App
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {audienceOptions.map((opt) => {
                    const Icon = opt.icon;
                    const selected = targetAudience === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setTargetAudience(opt.value)}
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                          selected
                            ? "border-ruby-500 bg-ruby-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selected ? "text-ruby-600" : "text-gray-400"}`}
                        />
                        <div>
                          <p
                            className={`text-sm font-medium ${selected ? "text-ruby-700" : "text-gray-700"}`}
                          >
                            {opt.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {opt.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Platform filter (iOS / Android) */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {platformOptions.map((p) => {
                    const checked = selectedPlatforms.includes(p.value);
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => togglePlatform(p.value)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                          checked
                            ? "border-ruby-500 bg-ruby-50 text-ruby-700"
                            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        {p.label}
                      </button>
                    );
                  })}
                  {selectedPlatforms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedPlatforms([])}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-3 h-3" />
                      Clear (all platforms)
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Leave empty to send to every platform. Pick one to ship an
                  iOS-only or Android-only rollout (e.g. before the other
                  store has approved the matching build).
                </p>
              </div>

              {/* Deep Link */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Tap Action (deep link)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={deepLinkKind}
                    onChange={(e) => {
                      setDeepLinkKind(e.target.value);
                      setDeepLinkTargetId("");
                      setDeepLinkUrl("");
                    }}
                    className="input-field sm:w-64"
                  >
                    {deepLinkKinds.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                  {activeDeepLinkMeta?.needsTargetId && (
                    <input
                      type="text"
                      value={deepLinkTargetId}
                      onChange={(e) => setDeepLinkTargetId(e.target.value)}
                      placeholder="Target ID (Mongo _id)"
                      className="input-field flex-1"
                    />
                  )}
                  {activeDeepLinkMeta?.needsUrl && (
                    <input
                      type="url"
                      value={deepLinkUrl}
                      onChange={(e) => setDeepLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="input-field flex-1"
                    />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                  <Link2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{activeDeepLinkMeta?.hint}</span>
                </p>
              </div>

              {/* Locations */}
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
                                  prev.filter((l) => l !== id),
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

              {/* Schedule for later */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Delivery time
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setScheduleEnabled(false)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
                      !scheduleEnabled
                        ? "border-ruby-500 bg-ruby-50 text-ruby-700"
                        : "border-gray-300 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send now
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleEnabled(true)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
                      scheduleEnabled
                        ? "border-ruby-500 bg-ruby-50 text-ruby-700"
                        : "border-gray-300 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    Schedule for later
                  </button>
                </div>
                {scheduleEnabled && (
                  <div>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={new Date(Date.now() + 60 * 1000)
                        .toISOString()
                        .slice(0, 16)}
                      className="input-field"
                    />
                    {scheduledAt &&
                      new Date(scheduledAt).getTime() <= Date.now() && (
                        <p className="text-xs text-red-600 mt-1">
                          Scheduled time must be in the future.
                        </p>
                      )}
                  </div>
                )}
              </div>

              {/* Send + Test buttons + audience preview */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {previewLoading ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Calculating audience…
                    </span>
                  ) : preview ? (
                    preview.activeDeviceTokenCount === 0 ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200"
                        title="No users in this audience have registered for push notifications. The broadcast won't be delivered."
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Will reach 0 devices
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200"
                        title={`Recipients: ${preview.recipientCount} users · ${preview.activeDeviceTokenCount} devices`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        Will reach {preview.activeDeviceTokenCount} device
                        {preview.activeDeviceTokenCount === 1 ? "" : "s"}
                        {preview.recipientCount !==
                          preview.activeDeviceTokenCount &&
                          ` · ${preview.recipientCount} user${preview.recipientCount === 1 ? "" : "s"}`}
                      </span>
                    )
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTestModal(true)}
                    disabled={!canSend}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send to one specific user as a dry run"
                  >
                    <TestTube2 className="w-4 h-4" />
                    Test Send
                  </button>
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!canSubmit}
                    className="btn-primary px-6 py-2.5 flex items-center gap-2"
                  >
                    {scheduleEnabled ? (
                      <>
                        <CalendarClock className="w-4 h-4" />
                        Schedule Broadcast
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Broadcast
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Last delivery result */}
          {lastResult && lastResult.status !== "SCHEDULED" && (
            <LastResultPanel
              result={lastResult}
              onDismiss={() => setLastResult(null)}
            />
          )}
        </>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          SCHEDULED TAB
          ────────────────────────────────────────────────────────────────── */}
      {activeTab === "scheduled" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Scheduled Broadcasts
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Future-dated broadcasts waiting to fire. Cancel any that you
                no longer want delivered.
              </p>
            </div>
            <button
              onClick={fetchScheduled}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-ruby-600 border border-gray-200 hover:border-ruby-200 rounded-lg hover:bg-ruby-50"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
          <div className="p-4">
            {loadingScheduled ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
                <p className="text-sm text-gray-500 mt-2">
                  Loading scheduled broadcasts…
                </p>
              </div>
            ) : scheduled.length === 0 ? (
              <div className="py-12 text-center">
                <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No broadcasts scheduled. Compose a new one and pick
                  &quot;Schedule for later&quot;.
                </p>
              </div>
            ) : (
              <DataTable<BroadcastNotification>
                columns={scheduledColumns}
                data={scheduled}
                isLoading={false}
                emptyMessage="No scheduled broadcasts"
              />
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          HISTORY TAB
          ────────────────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Broadcast History
            </h2>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTest}
                onChange={(e) => {
                  setIncludeTest(e.target.checked);
                  // Trigger refetch with new flag
                  setTimeout(() => fetchHistory(1, e.target.checked), 0);
                }}
                className="rounded border-gray-300"
              />
              Show test sends
            </label>
          </div>
          <div className="p-4">
            <DataTable<BroadcastNotification>
              columns={broadcastColumns}
              data={history}
              meta={{
                page: historyPagination.page,
                limit: historyPagination.limit,
                total: historyPagination.total,
                totalPages: historyPagination.totalPages,
              }}
              isLoading={loadingHistory}
              onPageChange={(p) => fetchHistory(p)}
              currentPage={historyPagination.page}
              emptyMessage="No broadcasts sent yet"
            />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          CONFIRM SEND MODAL
          ────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showConfirm}
        onClose={() => !isSending && setShowConfirm(false)}
        title={scheduleEnabled ? "Confirm Schedule" : "Confirm Broadcast"}
        subtitle={
          scheduleEnabled
            ? "This will queue the broadcast to fire at the scheduled time."
            : "This will send a push notification to all targeted users."
        }
        size="sm"
      >
        <div className="space-y-4">
          <div
            className={`p-3 rounded-lg border ${
              scheduleEnabled
                ? "bg-amber-50 border-amber-200"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                scheduleEnabled ? "text-amber-800" : "text-blue-800"
              }`}
            >
              {scheduleEnabled
                ? `Will fire at ${scheduledAt ? new Date(scheduledAt).toLocaleString() : "—"}`
                : "You are about to send a broadcast notification:"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Title
              </p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{title}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Message
              </p>
              <p className="text-sm text-gray-700 mt-0.5">{body}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Audience
                </p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {getAudienceLabel(targetAudience)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Platforms
                </p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {selectedPlatforms.length === 0
                    ? "All"
                    : selectedPlatforms
                        .map((p) => p.toUpperCase())
                        .join(" · ")}
                </p>
              </div>
            </div>
            {buildDeepLink() && (
              <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                <Link2 className="w-4 h-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Tap action
                  </p>
                  <p className="text-sm text-gray-900 mt-0.5">
                    {activeDeepLinkMeta?.label}
                    {deepLinkTargetId ? ` · ${deepLinkTargetId}` : ""}
                    {deepLinkUrl ? ` · ${deepLinkUrl}` : ""}
                  </p>
                </div>
              </div>
            )}
            {attachment && (
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                {attachment.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attachment.url}
                    alt=""
                    className="w-14 h-14 rounded-md object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-gray-900 flex items-center justify-center">
                    <Film className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Attachment
                  </p>
                  <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
                    {attachment.fileName || attachment.url}
                  </p>
                </div>
              </div>
            )}
            {preview && !scheduleEnabled && (
              <div
                className={`rounded-lg p-3 text-xs ${
                  preview.activeDeviceTokenCount === 0
                    ? "bg-red-50 border border-red-200 text-red-800"
                    : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                }`}
              >
                {preview.activeDeviceTokenCount === 0 ? (
                  <span>
                    ⚠️ <strong>Heads up:</strong> No active devices match this
                    audience. The broadcast will be marked as failed because no
                    one will actually receive it.
                  </span>
                ) : (
                  <span>
                    Will reach{" "}
                    <strong>{preview.activeDeviceTokenCount}</strong> device
                    {preview.activeDeviceTokenCount === 1 ? "" : "s"} (
                    {preview.recipientCount} user
                    {preview.recipientCount === 1 ? "" : "s"}).
                  </span>
                )}
              </div>
            )}
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
                  {scheduleEnabled ? "Scheduling..." : "Sending..."}
                </>
              ) : (
                <>
                  {scheduleEnabled ? (
                    <CalendarClock className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {scheduleEnabled ? "Confirm & Schedule" : "Confirm & Send"}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ──────────────────────────────────────────────────────────────────
          TEST SEND MODAL
          ────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showTestModal}
        onClose={() => !isTestSending && setShowTestModal(false)}
        title="Test Send"
        subtitle="Deliver this broadcast to one user only — for previewing how the push looks before mass-blasting."
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              Recipient User ID
            </label>
            <input
              type="text"
              value={testRecipientId}
              onChange={(e) => setTestRecipientId(e.target.value)}
              placeholder="Mongo _id of a customer or business owner"
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-2">
              Paste your own user ID (or any teammate&apos;s) to receive the
              test push on your device. The user must have logged into the
              relevant mobile app at least once so their device token is
              registered. The send is recorded in history with a TEST badge.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowTestModal(false)}
              disabled={isTestSending}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleTestSend}
              disabled={isTestSending || !testRecipientId.trim()}
              className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              {isTestSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube2 className="w-4 h-4" />
              )}
              {isTestSending ? "Sending..." : "Send Test"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ──────────────────────────────────────────────────────────────────
          DETAIL MODAL
          ────────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!detailBroadcast}
        onClose={() => setDetailBroadcast(null)}
        title="Broadcast Detail"
        subtitle={
          detailBroadcast
            ? `${getAudienceLabel(detailBroadcast.targetAudience)} · ${formatDate(detailBroadcast.createdAt)}`
            : undefined
        }
        size="md"
      >
        {detailBroadcast && (
          <BroadcastDetail
            broadcast={detailBroadcast}
            isLoading={detailLoading}
            onResend={() => handleResend(detailBroadcast)}
            onCancel={
              detailBroadcast.status === "SCHEDULED"
                ? () => handleCancelScheduled(detailBroadcast)
                : undefined
            }
            getAudienceLabel={getAudienceLabel}
            getLocationName={getLocationName}
          />
        )}
      </Modal>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: BroadcastStatus }) {
  const map: Record<
    BroadcastStatus,
    { label: string; icon: React.ElementType; classes: string }
  > = {
    COMPLETED: {
      label: "Completed",
      icon: CheckCircle,
      classes: "bg-green-50 text-green-700",
    },
    SENDING: {
      label: "Sending",
      icon: Loader2,
      classes: "bg-blue-50 text-blue-700",
    },
    FAILED: {
      label: "Failed",
      icon: XCircle,
      classes: "bg-red-50 text-red-700",
    },
    PENDING: {
      label: "Pending",
      icon: Clock,
      classes: "bg-gray-50 text-gray-600",
    },
    SCHEDULED: {
      label: "Scheduled",
      icon: CalendarClock,
      classes: "bg-amber-50 text-amber-700",
    },
    CANCELLED: {
      label: "Cancelled",
      icon: Ban,
      classes: "bg-gray-50 text-gray-600",
    },
    TEST: {
      label: "Test",
      icon: TestTube2,
      classes: "bg-purple-50 text-purple-700",
    },
  };
  const m = map[status] || map.PENDING;
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.classes}`}
    >
      <Icon
        className={`w-3 h-3 ${status === "SENDING" ? "animate-spin" : ""}`}
      />
      {m.label}
    </span>
  );
}

function LastResultPanel({
  result,
  onDismiss,
}: {
  result: BroadcastNotification;
  onDismiss: () => void;
}) {
  const failed = result.status === "FAILED";
  const partial = !failed && result.totalFailed > 0;
  return (
    <div
      className={`rounded-xl border shadow-sm p-4 mb-6 ${
        failed
          ? "bg-red-50 border-red-200"
          : partial
            ? "bg-amber-50 border-amber-200"
            : "bg-emerald-50 border-emerald-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {failed ? (
          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
        ) : partial ? (
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
        ) : (
          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
        )}
        <div className="flex-1">
          <p
            className={`text-sm font-semibold ${
              failed
                ? "text-red-900"
                : partial
                  ? "text-amber-900"
                  : "text-emerald-900"
            }`}
          >
            {failed
              ? "Broadcast failed"
              : partial
                ? "Broadcast partially delivered"
                : "Broadcast delivered"}
          </p>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-700">
            <span>
              <strong className="text-gray-900">{result.totalRecipients}</strong>{" "}
              recipients
            </span>
            <span className="text-emerald-700">
              ✓ <strong>{result.totalPushSent}</strong> sent
            </span>
            {result.totalFailed > 0 && (
              <span className="text-red-700">
                ✗ <strong>{result.totalFailed}</strong> failed
              </span>
            )}
          </div>
          {result.errorMessage && (
            <p className="text-xs text-red-700 mt-2">{result.errorMessage}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-md hover:bg-white/50 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function BroadcastDetail({
  broadcast,
  isLoading,
  onResend,
  onCancel,
  getAudienceLabel,
  getLocationName,
}: {
  broadcast: BroadcastNotification;
  isLoading: boolean;
  onResend: () => void;
  onCancel?: () => void;
  getAudienceLabel: (a: BroadcastTargetAudience) => string;
  getLocationName: (id: string) => string;
}) {
  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading full detail…
        </div>
      )}

      <div className="flex items-center gap-2">
        <StatusPill status={broadcast.status} />
        {broadcast.totalOpened ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            <Eye className="w-3 h-3" />
            {broadcast.totalOpened} opened
          </span>
        ) : null}
      </div>

      {broadcast.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
          <p className="font-semibold mb-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Why this broadcast didn&apos;t deliver
          </p>
          <p>{broadcast.errorMessage}</p>
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Title
        </p>
        <p className="text-sm font-medium text-gray-900">{broadcast.title}</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Message
        </p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {broadcast.body}
        </p>
      </div>

      {broadcast.attachment && (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Attachment
          </p>
          <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
            {broadcast.attachment.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={broadcast.attachment.url}
                alt=""
                className="w-16 h-16 rounded-md object-cover border border-gray-200"
              />
            ) : (
              <video
                src={broadcast.attachment.url}
                className="w-16 h-16 rounded-md object-cover bg-gray-900"
                muted
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {broadcast.attachment.fileName || broadcast.attachment.url}
              </p>
              {broadcast.attachment.sizeBytes ? (
                <p className="text-xs text-gray-500 mt-0.5">
                  {(broadcast.attachment.sizeBytes / 1024 / 1024).toFixed(2)} MB
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Audience
          </p>
          <p className="text-sm text-gray-900">
            {getAudienceLabel(broadcast.targetAudience)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Platforms
          </p>
          <p className="text-sm text-gray-900">
            {!broadcast.platforms || broadcast.platforms.length === 0
              ? "All"
              : broadcast.platforms.map((p) => p.toUpperCase()).join(" · ")}
          </p>
        </div>
      </div>

      {broadcast.locationIds && broadcast.locationIds.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Locations
          </p>
          <div className="flex flex-wrap gap-1.5">
            {broadcast.locationIds.map((id: any) => (
              <span
                key={typeof id === "object" ? id._id : id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs"
              >
                <MapPin className="w-3 h-3" />
                {getLocationName(typeof id === "object" ? id._id : id)}
              </span>
            ))}
          </div>
        </div>
      )}

      {broadcast.deepLink && (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Tap action
          </p>
          <div className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono text-gray-700">
            <p>
              <span className="font-semibold">kind:</span>{" "}
              {broadcast.deepLink.kind}
            </p>
            {broadcast.deepLink.targetId && (
              <p>
                <span className="font-semibold">targetId:</span>{" "}
                {broadcast.deepLink.targetId}
              </p>
            )}
            {broadcast.deepLink.url && (
              <p className="break-all">
                <span className="font-semibold">url:</span>{" "}
                {broadcast.deepLink.url}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Sent
          </p>
          <p className="text-sm text-gray-900">{broadcast.totalPushSent}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Failed
          </p>
          <p className="text-sm text-gray-900">{broadcast.totalFailed}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Recipients
          </p>
          <p className="text-sm text-gray-900">{broadcast.totalRecipients}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Opened
          </p>
          <p className="text-sm text-gray-900">{broadcast.totalOpened || 0}</p>
        </div>
        {broadcast.scheduledAt && (
          <div className="col-span-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Scheduled for
            </p>
            <p className="text-sm text-gray-900">
              {new Date(broadcast.scheduledAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={onResend}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Resend / Use as template
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Ban className="w-4 h-4" />
            Cancel scheduled
          </button>
        )}
      </div>
    </div>
  );
}
