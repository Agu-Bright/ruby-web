"use client";

/**
 * P120 — Admin Ad Subscriptions page.
 *
 * Three-tab operational surface:
 *
 *   1. Subscriptions — paginated DataTable of every BusinessAdSubscription
 *      with filters (tier, status, period-end range). Row actions:
 *      cancel, upgrade/downgrade, mark perks done, force-expire.
 *
 *   2. Onboarding queue — flat list of every pending manual perk across
 *      every active sub. Mark-done buttons inline. Drives the daily
 *      admin work board.
 *
 *   3. Stats — revenue by tier, active counts, monthly estimate.
 *
 * Banner moderation lives inside the detail modal triggered from the
 * Subscriptions tab row action.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Filter,
  RefreshCw,
  CheckCircle,
  ChevronRight,
  Calendar,
  TrendingUp,
  Award,
  Zap,
  Image as ImageIcon,
  XCircle,
  Loader2,
  AlertCircle,
  Clock,
  Send,
  Inbox,
  Play,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

type AdTier = "STARTER" | "GROWTH" | "PRIME";
type AdStatus =
  | "PENDING_ONBOARDING_REVIEW"
  | "ACTIVE"
  | "IN_GRACE_PERIOD"
  | "PAUSED"
  | "CANCELLED"
  | "EXPIRED";
type Tab =
  | "subscriptions"
  | "pendingReview"
  | "pushBlastRequests"
  | "onboarding"
  | "stats";

const TIER_COLORS: Record<AdTier, string> = {
  STARTER: "bg-amber-100 text-amber-800 border-amber-300",
  GROWTH: "bg-blue-100 text-blue-800 border-blue-300",
  PRIME: "bg-purple-100 text-purple-800 border-purple-300",
};

const STATUS_COLORS: Record<AdStatus, string> = {
  // P139 — paid but awaiting admin onboarding fulfilment. Distinct
  // colour from ACTIVE so the queue is unmissable.
  PENDING_ONBOARDING_REVIEW:
    "bg-indigo-100 text-indigo-800 border border-indigo-300",
  ACTIVE: "bg-green-100 text-green-800",
  IN_GRACE_PERIOD: "bg-amber-100 text-amber-800",
  // P124 — paused is reversible (the merchant can resume); colour it
  // distinctly from cancelled / expired so admins reading the table can
  // see at a glance which rows are recoverable revenue.
  PAUSED: "bg-amber-50 text-amber-700 border border-amber-200",
  CANCELLED: "bg-gray-100 text-gray-700",
  EXPIRED: "bg-red-100 text-red-700",
};

export default function AdSubscriptionsPage() {
  const [tab, setTab] = useState<Tab>("subscriptions");

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-purple-100">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Ad Subscriptions</h1>
        </div>
        <p className="text-sm text-gray-600">
          Weekly Starter / Growth / Prime subscriptions — review, manage perks,
          moderate banners, and watch tier revenue.
        </p>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {(
            [
              { key: "subscriptions", label: "Subscriptions" },
              { key: "pendingReview", label: "Pending review" },
              { key: "pushBlastRequests", label: "Push blast inbox" },
              { key: "onboarding", label: "Onboarding queue" },
              { key: "stats", label: "Stats" },
            ] as { key: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.key
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "subscriptions" && <SubscriptionsTab />}
      {tab === "pendingReview" && <PendingReviewTab />}
      {tab === "pushBlastRequests" && <PushBlastRequestsTab />}
      {tab === "onboarding" && <OnboardingTab />}
      {tab === "stats" && <StatsTab />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Subscriptions tab
// ──────────────────────────────────────────────────────────────

function SubscriptionsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<AdTier | "">("");
  const [statusFilter, setStatusFilter] = useState<AdStatus | "">("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.adSubscriptions.list({
        page,
        limit: 25,
        tier: tierFilter || undefined,
        status: statusFilter || undefined,
      });
      setRows(res?.data || res || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierFilter, statusFilter, page]);

  const handleCancel = async (id: string) => {
    if (
      !confirm(
        "Force-cancel this subscription? Reserved for chargebacks / TOS / refund-and-close support. Perks stay live until period end then the cron sweep expires the row. The merchant cannot undo this — they'd need to subscribe to a new tier.",
      )
    )
      return;
    try {
      await api.adSubscriptions.cancel(id, { reason: "admin_force_cancel" });
      toast.success("Subscription cancelled");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Cancel failed");
    }
  };

  /**
   * P124 — Admin pause on the merchant's behalf. Same effect as the
   * merchant pause: status → PAUSED, perks dropped immediately, no
   * billing. The merchant (or admin) can resume to restart.
   */
  const handlePause = async (id: string) => {
    if (
      !confirm(
        "Pause this subscription on the merchant's behalf? Perks drop immediately, no further billing until someone resumes.",
      )
    )
      return;
    try {
      await api.adSubscriptions.pause(id, { reason: "admin_action" });
      toast.success("Subscription paused");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Pause failed");
    }
  };

  /**
   * P124 — Admin resume. Wallet debit is SKIPPED (admin courtesy path);
   * the renewal cron picks up billing from the next period boundary.
   */
  const handleResume = async (id: string) => {
    if (
      !confirm(
        "Resume this paused subscription on the merchant's behalf? Wallet will NOT be debited (admin path is free); the renewal cron takes over from the next 7-day boundary.",
      )
    )
      return;
    try {
      await api.adSubscriptions.resume(id);
      toast.success("Subscription resumed");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Resume failed");
    }
  };

  const handleUpgrade = async (id: string, tier: AdTier) => {
    if (
      !confirm(
        `Switch this subscription to ${tier}? The current period ends immediately and a new period starts on the wallet platform.`,
      )
    )
      return;
    try {
      await api.adSubscriptions.upgradeDowngrade(id, { tier });
      toast.success(`Subscription switched to ${tier}`);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Switch failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-lg border border-gray-200">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={tierFilter}
          onChange={(e) => {
            setPage(1);
            setTierFilter(e.target.value as AdTier | "");
          }}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">All tiers</option>
          <option value="STARTER">Starter</option>
          <option value="GROWTH">Growth</option>
          <option value="PRIME">Prime</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as AdStatus | "");
          }}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">All statuses</option>
          <option value="PENDING_ONBOARDING_REVIEW">Pending review</option>
          <option value="ACTIVE">Active</option>
          <option value="IN_GRACE_PERIOD">In grace</option>
          <option value="PAUSED">Paused</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <button
          onClick={load}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No subscriptions match these filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Business</th>
                <th className="px-4 py-3 text-left">Tier</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Weekly</th>
                <th className="px-4 py-3 text-left">Period end</th>
                <th className="px-4 py-3 text-left">Quotas</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((sub) => {
                const biz = sub.businessId || {};
                const tier: AdTier = sub.tier;
                const status: AdStatus = sub.status;
                return (
                  <tr key={sub._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {biz.name || "—"}
                      </div>
                      {biz.slug && (
                        <div className="text-xs text-gray-500">{biz.slug}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-md border ${TIER_COLORS[tier]}`}
                      >
                        {tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-md ${STATUS_COLORS[status]}`}
                      >
                        {status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono">
                      {formatCurrency(sub.weeklyAmountNgn)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {sub.currentPeriodEnd
                        ? formatDate(sub.currentPeriodEnd)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      Push {sub.pushBlastsThisMonth ?? 0} ·{" "}
                      Reels {sub.reelsThisMonth ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowMenu
                        sub={sub}
                        onCancel={() => handleCancel(sub._id)}
                        onPause={() => handlePause(sub._id)}
                        onResume={() => handleResume(sub._id)}
                        onUpgrade={(t) => handleUpgrade(sub._id, t)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Page {page}</span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-100"
          >
            Prev
          </button>
          <button
            disabled={rows.length < 25}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-100"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function RowMenu({
  sub,
  onCancel,
  onPause,
  onResume,
  onUpgrade,
}: {
  sub: any;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onUpgrade: (tier: AdTier) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = sub.status === "ACTIVE" || sub.status === "IN_GRACE_PERIOD";
  const isPaused = sub.status === "PAUSED";
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((s) => !s)}
        className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
      >
        ⋮
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-40">
            {sub.tier !== "STARTER" && isActive && (
              <button
                onClick={() => {
                  setOpen(false);
                  onUpgrade("STARTER");
                }}
                className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
              >
                Switch to Starter
              </button>
            )}
            {sub.tier !== "GROWTH" && isActive && (
              <button
                onClick={() => {
                  setOpen(false);
                  onUpgrade("GROWTH");
                }}
                className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
              >
                Switch to Growth
              </button>
            )}
            {sub.tier !== "PRIME" && isActive && (
              <button
                onClick={() => {
                  setOpen(false);
                  onUpgrade("PRIME");
                }}
                className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
              >
                Switch to Prime
              </button>
            )}
            {/* P124 — Pause (reversible) is the default merchant-style
                action when ACTIVE. Force-cancel is kept below for
                support cases (chargeback, TOS, refund-and-close). */}
            {isActive && (
              <button
                onClick={() => {
                  setOpen(false);
                  onPause();
                }}
                className="block w-full text-left px-3 py-2 text-xs text-amber-700 hover:bg-amber-50 border-t border-gray-100"
              >
                Pause subscription
              </button>
            )}
            {isPaused && (
              <button
                onClick={() => {
                  setOpen(false);
                  onResume();
                }}
                className="block w-full text-left px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50"
              >
                Resume subscription
              </button>
            )}
            {(isActive || isPaused) && (
              <button
                onClick={() => {
                  setOpen(false);
                  onCancel();
                }}
                className="block w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 border-t border-gray-100"
                title="Force-cancel — admin-only escape hatch (chargeback / TOS / refund-and-close)"
              >
                Force cancel (admin)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Onboarding queue tab
// ──────────────────────────────────────────────────────────────

const PERK_LABELS: Record<string, { label: string; icon: any }> = {
  PROFILE_SETUP: { label: "Profile setup", icon: CheckCircle },
  POLISHED_PHOTOS: { label: "Polished photos", icon: ImageIcon },
  CREATIVE_SHOOT_SCHEDULE: { label: "Schedule creative shoot", icon: Calendar },
  CREATIVE_SHOOT_COMPLETE: { label: "Complete creative shoot", icon: Calendar },
  BANNER_MODERATION: { label: "Banner needs moderation", icon: ImageIcon },
};

function OnboardingTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.adSubscriptions.onboardingQueue();
      setItems(res?.data || res || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkDone = async (item: any) => {
    try {
      switch (item.perk) {
        case "PROFILE_SETUP":
          await api.adSubscriptions.markProfileSetup(item.subscriptionId);
          break;
        case "POLISHED_PHOTOS": {
          const n = prompt(
            "Polished photos uploaded so far (number):",
            String(6),
          );
          if (!n) return;
          await api.adSubscriptions.setPolishedPhotos(
            item.subscriptionId,
            Math.max(0, parseInt(n, 10) || 0),
          );
          break;
        }
        case "CREATIVE_SHOOT_SCHEDULE": {
          const date = prompt("Shoot date (YYYY-MM-DD):");
          if (!date) return;
          await api.adSubscriptions.scheduleShoot(
            item.subscriptionId,
            new Date(date).toISOString(),
          );
          break;
        }
        case "CREATIVE_SHOOT_COMPLETE":
          await api.adSubscriptions.completeShoot(item.subscriptionId);
          break;
        case "BANNER_MODERATION": {
          const decision = confirm("Approve banner? OK = approve, Cancel = reject")
            ? "APPROVED"
            : "REJECTED";
          const reason =
            decision === "REJECTED"
              ? prompt("Rejection reason (shown to merchant):") || undefined
              : undefined;
          await api.adSubscriptions.moderateBanner(item.subscriptionId, {
            decision: decision as any,
            rejectionReason: reason,
          });
          break;
        }
      }
      toast.success("Marked done");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
        <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-300" />
        <div className="font-semibold text-gray-700">All caught up!</div>
        <div className="text-sm">No onboarding perks pending.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const meta =
          PERK_LABELS[item.perk] || { label: item.perk, icon: AlertCircle };
        const Icon = meta.icon;
        const biz = item.businessId || {};
        return (
          <div
            key={`${item.subscriptionId}-${item.perk}-${idx}`}
            className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4"
          >
            <div className="p-2 rounded-lg bg-purple-50">
              <Icon className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900">
                  {biz.name || "Business"}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-md border ${TIER_COLORS[item.tier as AdTier]}`}
                >
                  {item.tier}
                </span>
              </div>
              <div className="text-sm text-gray-700">{meta.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.detail}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-2">
                {item.daysWaiting}d waiting
              </div>
              <button
                onClick={() => handleMarkDone(item)}
                className="px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Mark done
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Stats tab
// ──────────────────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.adSubscriptions.stats();
        setStats(res?.data || res);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      </div>
    );
  }

  if (!stats) return null;

  const tierIcon: Record<AdTier, any> = {
    STARTER: Zap,
    GROWTH: TrendingUp,
    PRIME: Award,
  };

  return (
    <div className="space-y-6">
      {/* Top KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Active subscribers"
          value={stats.totalActive.toLocaleString()}
        />
        <StatCard
          label="Weekly revenue"
          value={formatCurrency(stats.weeklyRevenueNgn)}
        />
        <StatCard
          label="Monthly est."
          value={formatCurrency(stats.monthlyRevenueNgnEstimate)}
        />
      </div>

      {/* By tier */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Active subscribers by tier
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["STARTER", "GROWTH", "PRIME"] as AdTier[]).map((tier) => {
            const row = (stats.byTier || []).find((r: any) => r._id === tier);
            const Icon = tierIcon[tier];
            return (
              <div
                key={tier}
                className={`rounded-lg p-4 border ${TIER_COLORS[tier]}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" />
                  <span className="font-bold text-sm">{tier}</span>
                </div>
                <div className="text-2xl font-bold">{row?.count ?? 0}</div>
                <div className="text-xs mt-1 opacity-80">
                  {formatCurrency(row?.weeklyRevenueNgn ?? 0)} / week
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By status */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Subscriptions by status (all-time)
        </h3>
        <div className="flex flex-wrap gap-3">
          {(stats.byStatus || []).map((row: any) => (
            <div
              key={row._id}
              className={`px-3 py-2 rounded-md text-sm ${STATUS_COLORS[row._id as AdStatus] || "bg-gray-100"}`}
            >
              <span className="font-semibold">{row._id}</span>
              <span className="ml-2">{row.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// P139 — Pending review tab
// Lists subscriptions awaiting admin onboarding (paid but not yet
// activated). Each row shows the merchant, tier, paid time, deadline
// countdown, and an "Activate now" button that flips the sub to ACTIVE
// + starts the 7-day billing week from that moment.
// ──────────────────────────────────────────────────────────────

function PendingReviewTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Re-render every 60s so deadline countdowns stay live.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.adSubscriptions.list({
        status: "PENDING_ONBOARDING_REVIEW",
        limit: 100,
      });
      // Newest paid first (most urgent at top).
      const data = (res.data?.items || res.data || []).slice().sort((a: any, b: any) => {
        const ta = new Date(a.paidAt || a.createdAt).getTime();
        const tb = new Date(b.paidAt || b.createdAt).getTime();
        return ta - tb; // oldest first — those approaching deadline
      });
      setRows(data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load pending subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleActivate = async (id: string, businessName: string) => {
    if (
      !confirm(
        `Activate ${businessName}'s subscription now? The 7-day billing week starts from this moment. Make sure you've completed profile setup, polished photos, and the first push blast.`,
      )
    )
      return;
    setActivating(id);
    try {
      await api.adSubscriptions.activate(id);
      toast.success("Subscription activated.");
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Activation failed.";
      toast.error(msg);
    } finally {
      setActivating(null);
    }
  };

  const formatCountdown = (deadlineIso?: string) => {
    if (!deadlineIso) return { text: "—", overdue: false };
    const ms = new Date(deadlineIso).getTime() - Date.now();
    if (ms <= 0) return { text: "Past deadline — auto-activate next cron", overdue: true };
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    if (hours >= 1) return { text: `${hours}h ${minutes}m remaining`, overdue: false };
    return { text: `${Math.max(minutes, 1)}m remaining`, overdue: false };
  };

  // tick is consumed via formatCountdown re-running on render
  void tick;

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Clock className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Pending onboarding review
            </h2>
            <p className="text-xs text-gray-600 max-w-2xl">
              Merchants who&apos;ve paid but are awaiting Ruby+ onboarding
              (profile setup, polished photos, first push blast). Every sub
              auto-activates 48 h after payment unless you finish setup and
              activate manually first.
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-300" />
          <div className="font-semibold text-gray-700">All caught up</div>
          <div className="text-xs text-gray-500 mt-1">
            No subscriptions waiting for onboarding right now.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((sub) => {
            const biz = sub.businessId || {};
            const tier = sub.tier as AdTier;
            const countdown = formatCountdown(sub.reviewDeadlineAt);
            const perks = sub.onboardingPerks || {};
            return (
              <div
                key={sub._id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4"
              >
                {/* Merchant */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {biz.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={biz.logoUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">
                        {biz.name || "Unknown business"}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${TIER_COLORS[tier]}`}
                      >
                        {tier}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Paid {formatDate(sub.paidAt || sub.createdAt)} ·{" "}
                      {formatCurrency(sub.weeklyAmountNgn || 0, "NGN")}/wk
                    </div>
                  </div>
                </div>

                {/* Perk checklist */}
                <div className="flex items-center gap-3 text-xs flex-shrink-0">
                  <PerkPill
                    label="Profile"
                    done={!!perks.profileSetupDoneAt}
                  />
                  <PerkPill
                    label={`Photos ${perks.polishedPhotosUploadedCount || 0}/6`}
                    done={(perks.polishedPhotosUploadedCount || 0) >= 6}
                  />
                  <PerkPill
                    label="Push blast"
                    done={(perks.pushBlastFulfilledCount || 0) >= 1}
                  />
                </div>

                {/* Deadline + Activate */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div
                    className={`text-xs ${countdown.overdue ? "text-amber-700" : "text-gray-600"} text-right`}
                  >
                    <div className="font-medium">{countdown.text}</div>
                    <div className="text-[10px] text-gray-400">
                      Auto by {formatDate(sub.reviewDeadlineAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleActivate(sub._id, biz.name || "this business")}
                    disabled={activating === sub._id}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-lg"
                  >
                    {activating === sub._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Activate now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PerkPill({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded-full ${done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
    >
      {done ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <Clock className="w-3 h-3" />
      )}
      <span>{label}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// P139 — Push blast request inbox tab
// Merchants no longer fire push blasts directly; they submit requests
// here and Ruby+ admins fulfil them. PENDING rows show Fulfil + Reject
// actions; SENT / REJECTED / STALE rows are historical reference.
// ──────────────────────────────────────────────────────────────

function PushBlastRequestsTab() {
  const [statusFilter, setStatusFilter] = useState<
    "PENDING" | "SENT" | "REJECTED" | "STALE" | "ALL"
  >("PENDING");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [fulfilTarget, setFulfilTarget] = useState<any>(null); // composer modal
  const [rejectTarget, setRejectTarget] = useState<any>(null); // reject modal

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.adSubscriptions.listPushBlastRequests(
        statusFilter === "ALL" ? undefined : statusFilter,
      );
      setRows(res.data || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load push blast requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleFulfil = async (finalMessage: string) => {
    if (!fulfilTarget) return;
    setActing(fulfilTarget._id);
    try {
      const res: any = await api.adSubscriptions.fulfilPushBlastRequest(
        fulfilTarget._id,
        { finalMessage: finalMessage.trim() || undefined },
      );
      const recipients = res.data?.recipients ?? 0;
      toast.success(`Blast sent to ${recipients.toLocaleString()} customer(s).`);
      setFulfilTarget(null);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Fulfilment failed.";
      toast.error(msg);
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    if (!reason.trim()) {
      toast.error("Reason is required.");
      return;
    }
    setActing(rejectTarget._id);
    try {
      await api.adSubscriptions.rejectPushBlastRequest(rejectTarget._id, reason.trim());
      toast.success("Request rejected. Merchant will see your reason.");
      setRejectTarget(null);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Reject failed.";
      toast.error(msg);
    } finally {
      setActing(null);
    }
  };

  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    SENT: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-700",
    STALE: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Inbox className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Push blast inbox
            </h2>
            <p className="text-xs text-gray-600 max-w-2xl">
              Merchant-submitted push blast requests. Fulfil within 48 h or
              reject with a reason. Fulfilling consumes 1 push quota slot
              from the merchant&apos;s tier allowance.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="REJECTED">Rejected</option>
            <option value="STALE">Stale</option>
            <option value="ALL">All</option>
          </select>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <div className="font-semibold text-gray-700">No requests</div>
          <div className="text-xs text-gray-500 mt-1">
            {statusFilter === "PENDING"
              ? "No pending requests right now."
              : `No ${statusFilter.toLowerCase()} requests.`}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((req) => {
            const biz = req.businessId || {};
            return (
              <div
                key={req._id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start gap-3 flex-wrap">
                  {/* Merchant + status */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {biz.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={biz.logoUrl}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 truncate">
                          {biz.name || "Unknown business"}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[req.status] || statusColor.STALE}`}
                        >
                          {req.status}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatDate(req.createdAt)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Radius: {req.radiusKm} km
                        {req.recipientCount != null
                          ? ` · Delivered to ${req.recipientCount.toLocaleString()}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {req.status === "PENDING" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setFulfilTarget(req)}
                        disabled={acting === req._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 rounded-lg"
                      >
                        <Send className="w-3 h-3" /> Fulfil
                      </button>
                      <button
                        onClick={() => setRejectTarget(req)}
                        disabled={acting === req._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Message body */}
                <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                  {req.message}
                </div>

                {req.finalMessage && req.finalMessage !== req.message && (
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="font-semibold">Sent as:</span>{" "}
                    {req.finalMessage}
                  </div>
                )}
                {req.rejectionReason && (
                  <div className="mt-2 text-xs text-red-700">
                    <span className="font-semibold">Reason:</span>{" "}
                    {req.rejectionReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fulfil composer */}
      {fulfilTarget && (
        <FulfilComposer
          request={fulfilTarget}
          onClose={() => setFulfilTarget(null)}
          onSubmit={handleFulfil}
          submitting={acting === fulfilTarget._id}
        />
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSubmit={handleReject}
          submitting={acting === rejectTarget._id}
        />
      )}
    </div>
  );
}

function FulfilComposer({
  request,
  onClose,
  onSubmit,
  submitting,
}: {
  request: any;
  onClose: () => void;
  onSubmit: (finalMessage: string) => void;
  submitting: boolean;
}) {
  const [text, setText] = useState<string>(request.message || "");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">
            Fulfil push blast
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Review and tweak the merchant&apos;s message, then send. This
            consumes 1 of their monthly push quota slots and goes to every
            customer within {request.radiusKm} km.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <label className="block text-xs font-semibold text-gray-700">
            Message (max 180 chars)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 180))}
            rows={4}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm"
            placeholder="Push notification body…"
          />
          <div className="text-right text-[11px] text-gray-400">
            {text.length} / 180
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(text)}
            disabled={submitting || text.trim().length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 rounded-lg"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Send blast
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  request,
  onClose,
  onSubmit,
  submitting,
}: {
  request: any;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting: boolean;
}) {
  const [reason, setReason] = useState<string>("");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">
            Reject push blast
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            The merchant will see this reason in their request list. No
            quota is consumed.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <label className="block text-xs font-semibold text-gray-700">
            Reason (required, shown to merchant)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            rows={3}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm"
            placeholder="e.g. Message contains promo claims we can't verify. Please revise + resubmit."
          />
          <div className="text-right text-[11px] text-gray-400">
            {reason.length} / 300
          </div>
          <div className="text-xs text-gray-500">
            Request: <span className="font-mono">{request._id}</span>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(reason)}
            disabled={submitting || reason.trim().length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
