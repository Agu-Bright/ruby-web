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
} from "lucide-react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

type AdTier = "STARTER" | "GROWTH" | "PRIME";
type AdStatus = "ACTIVE" | "IN_GRACE_PERIOD" | "PAUSED" | "CANCELLED" | "EXPIRED";
type Tab = "subscriptions" | "onboarding" | "stats";

const TIER_COLORS: Record<AdTier, string> = {
  STARTER: "bg-amber-100 text-amber-800 border-amber-300",
  GROWTH: "bg-blue-100 text-blue-800 border-blue-300",
  PRIME: "bg-purple-100 text-purple-800 border-purple-300",
};

const STATUS_COLORS: Record<AdStatus, string> = {
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
