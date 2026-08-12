"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Megaphone,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Building2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui";
import { ImageUpload } from "@/components/ui/image-upload";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import type {
  DailyBusinessPromo,
  UpdateDailyBusinessPromoPayload,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

/**
 * Daily Business Promo — admin editor.
 *
 * Edits the singleton config that powers the customer app's once-per-
 * day full-screen interstitial. SUPER_ADMIN only on the backend
 * (@Roles guard on the controller). When `isActive` is false OR the
 * required fields (businessId + heroImageUrl) are missing, the mobile
 * skips the modal entirely.
 */
export default function DailyPromoPage() {
  const [config, setConfig] = useState<DailyBusinessPromo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businesses, setBusinesses] = useState<SelectOption[]>([]);

  // Form state — separate from loaded config so admin can edit + cancel
  // without refetch.
  const [isActive, setIsActive] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.dailyBusinessPromo.get();
      const data = (res.data || res) as DailyBusinessPromo;
      setConfig(data);
      setIsActive(!!data.isActive);
      const bizId =
        typeof data.businessId === "object" && data.businessId !== null
          ? data.businessId._id
          : (data.businessId as string) || "";
      setBusinessId(bizId);
      setHeroImageUrl(data.heroImageUrl || undefined);
      setTitle(data.title || "");
      setSubtitle(data.subtitle || "");
      setCtaLabel(data.ctaLabel || "");
    } catch (err: any) {
      toast.error(err?.message || "Failed to load daily promo config");
    } finally {
      setLoading(false);
    }
  }, []);

  // Business list for the SearchableSelect. Pull LIVE businesses only
  // (approved + published) so the admin doesn't pick a draft that
  // customers can't visit. Limit 200 covers current platform scale;
  // if the list grows beyond that we'll switch to server-side search.
  const loadBusinesses = useCallback(async () => {
    try {
      const res = await api.businesses.list({ limit: 200, status: "LIVE" as any });
      const items = (res.data?.items || res.items || []) as any[];
      const options: SelectOption[] = items
        .map((b) => ({
          value: b._id,
          label: b.name || "(unnamed)",
          description: b.categoryName || b.address?.city || undefined,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setBusinesses(options);
    } catch (err) {
      // Silent — the picker just stays empty. Admin can still save by
      // pasting a businessId if they had one from a URL.
    }
  }, []);

  useEffect(() => {
    load();
    loadBusinesses();
  }, [load, loadBusinesses]);

  // ── Validation ────────────────────────────────────────────────────
  // The mobile requires businessId AND heroImageUrl AND isActive to
  // actually show the modal. If admin flips isActive on without those,
  // warn — the row saves fine but the modal will silently no-op.
  const readyToDisplay = isActive && !!businessId && !!heroImageUrl;
  const activeWithoutReqs = isActive && (!businessId || !heroImageUrl);

  const currentBusinessName = useMemo(() => {
    const match = businesses.find((b) => b.value === businessId);
    return match?.label;
  }, [businesses, businessId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: UpdateDailyBusinessPromoPayload = {
        isActive,
        businessId: businessId || "",
        heroImageUrl: heroImageUrl || "",
        title: title.trim(),
        subtitle: subtitle.trim(),
        ctaLabel: ctaLabel.trim(),
      };
      const res = await api.dailyBusinessPromo.update(payload);
      const data = (res.data || res) as DailyBusinessPromo;
      setConfig(data);
      toast.success("Daily promo config saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save daily promo config");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={Megaphone}
        title="Daily Promo"
        description="Full-screen interstitial shown on the customer app once per day. Pick a business + upload the marketing creative."
      />

      {/* Status banner */}
      <div
        className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${
          readyToDisplay
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : activeWithoutReqs
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-gray-50 border-gray-200 text-gray-700"
        }`}
      >
        {readyToDisplay ? (
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        )}
        <div className="text-sm">
          {readyToDisplay ? (
            <>
              <strong>Live.</strong> Customers who open the app for the first time today will see this promo.
              {currentBusinessName ? ` Featuring: ${currentBusinessName}.` : ""}
            </>
          ) : activeWithoutReqs ? (
            <>
              <strong>Not shown.</strong> Toggle is on, but the promo needs BOTH a business AND a hero image before it displays. Add them below.
            </>
          ) : (
            <>
              <strong>Off.</strong> No promo will show on the customer app. Fill in the fields below and toggle On to enable.
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Form column ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
            {/* Active toggle */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <label className="text-sm font-semibold text-gray-900">
                  Show on customer app
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Master switch. Off → no modal displays regardless of other fields.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                  isActive ? "bg-ruby-500" : "bg-gray-300"
                }`}
                aria-pressed={isActive}
                aria-label="Toggle daily promo active"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition ${
                    isActive ? "translate-x-[22px]" : "translate-x-[2px]"
                  } mt-[2px]`}
                />
              </button>
            </div>

            {/* Business picker */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5" />
                Featured business
              </label>
              <SearchableSelect
                options={businesses}
                value={businessId}
                onChange={(v) => setBusinessId(v)}
                placeholder={
                  businesses.length === 0
                    ? "Loading businesses…"
                    : "Pick a business…"
                }
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Only LIVE businesses. Tapping the modal CTA opens this business's detail screen.
              </p>
            </div>

            {/* Hero image */}
            <div>
              <ImageUpload
                value={heroImageUrl}
                onChange={setHeroImageUrl}
                folder="daily-promo"
                label="Marketing creative"
                helpText="The flyer image shown in the middle of the modal. 4:5 or square works best. Max 5 MB."
                maxSizeMB={5}
              />
            </div>

            {/* Text fields */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="e.g. Stock Up & Save Big Today"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ruby-400 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Shown at the top of the modal. Keep it short — ~40 chars fits without wrap.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Subtitle (optional)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                maxLength={140}
                placeholder="e.g. Free Delivery on SPAR"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ruby-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                CTA button label (optional)
              </label>
              <input
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                maxLength={40}
                placeholder='Defaults to "Visit"'
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ruby-400 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Match the campaign — "Shop now", "Order now", "Book now"…
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {config?.updatedAt
                  ? `Last saved ${formatDate(config.updatedAt)}`
                  : "Not saved yet"}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-ruby-500 text-white rounded-md text-sm font-semibold hover:bg-ruby-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Preview column ──────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Live preview
            </div>
            <div className="bg-gray-100 rounded-3xl p-3 border border-gray-200 shadow-sm">
              <div className="bg-[#B8DBDA] rounded-2xl overflow-hidden relative aspect-[9/16]">
                {/* Close X */}
                <div className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </div>

                <div className="p-4 pt-6 flex flex-col h-full">
                  {/* Title + subtitle */}
                  <h3 className="text-[15px] font-bold text-gray-900 leading-tight mb-1">
                    {title || "Your headline here"}
                  </h3>
                  {subtitle && (
                    <p className="text-[11px] text-gray-700 mb-3">{subtitle}</p>
                  )}

                  {/* Hero image */}
                  <div className="flex-1 bg-white/30 rounded-lg overflow-hidden mt-2 flex items-center justify-center">
                    {heroImageUrl ? (
                      <img
                        src={heroImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400 p-4">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-[10px] text-center">
                          Marketing creative appears here
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-3">
                    <div className="w-full py-2.5 bg-black rounded-md text-center text-white text-[11px] font-semibold">
                      {ctaLabel.trim() || "Visit"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
              Preview approximates the customer app modal. Actual colors + fonts render in the app's theme.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
