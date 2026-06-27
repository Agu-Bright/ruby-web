"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageCircle,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui";
import type {
  MerchantSupportConfig,
  UpdateMerchantSupportConfigPayload,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

/**
 * P135 — Merchant Support Contact admin page.
 *
 * Edits the singleton config that powers the business mobile app's
 * "Talk to Ruby+" card. SUPER_ADMIN-only (enforced server-side via
 * the @Roles guard on the controller). When `isActive` is false, the
 * business app hides the card entirely — useful for ops blackouts.
 */
export default function MerchantSupportPage() {
  const [config, setConfig] = useState<MerchantSupportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state — separate from the loaded config so the admin can
  // edit + cancel without re-fetching.
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappIntroMessage, setWhatsappIntroMessage] = useState("");
  const [voicePhone, setVoicePhone] = useState("");
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.merchantSupport.get();
      const data = (res.data || res) as MerchantSupportConfig;
      setConfig(data);
      setWhatsappPhone(data.whatsappPhone || "");
      setWhatsappIntroMessage(data.whatsappIntroMessage || "");
      setVoicePhone(data.voicePhone || "");
      setIsActive(data.isActive);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load merchant support config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Validation ──────────────────────────────────────────────────────────
  // E.164 digits-only — same regex the backend DTO enforces. Surfaced
  // inline so the admin knows BEFORE submitting that the input is bad.
  const phoneIsValid = /^\d{7,15}$/.test(whatsappPhone);
  const introTooLong = whatsappIntroMessage.length > 280;
  const introIsEmpty = whatsappIntroMessage.trim().length === 0;
  const canSave =
    !saving &&
    phoneIsValid &&
    !introTooLong &&
    !introIsEmpty &&
    (whatsappPhone !== (config?.whatsappPhone || "") ||
      whatsappIntroMessage !== (config?.whatsappIntroMessage || "") ||
      voicePhone !== (config?.voicePhone || "") ||
      isActive !== (config?.isActive ?? true));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: UpdateMerchantSupportConfigPayload = {
        whatsappPhone,
        whatsappIntroMessage,
        // Empty voicePhone → backend treats as "clear". Sending undefined
        // would leave the existing value untouched; empty string is what
        // the admin means when they clear the field.
        voicePhone: voicePhone.trim() === "" ? "" : voicePhone.trim(),
        isActive,
      };
      const res = await api.merchantSupport.update(payload);
      const data = (res.data || res) as MerchantSupportConfig;
      setConfig(data);
      toast.success("Merchant support config saved.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Build a live preview of the wa.me link so the admin can manually
  // click through and verify the WhatsApp chat opens correctly.
  const previewUrl = phoneIsValid
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappIntroMessage)}`
    : null;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Merchant Support"
        description="WhatsApp + voice contact the business mobile app's 'Talk to Ruby+' card uses. Edit once — every merchant device picks up the change within 24h."
      />

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Live status banner ────────────────────────────────── */}
          <div
            className={`rounded-xl border p-4 flex items-start gap-3 ${
              isActive
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            {isActive ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm font-semibold ${
                  isActive ? "text-emerald-900" : "text-amber-900"
                }`}
              >
                {isActive
                  ? "Support card is live"
                  : "Support card is hidden"}
              </p>
              <p className="text-xs text-gray-700 mt-0.5">
                {isActive
                  ? "Merchants see the 'Talk to Ruby+' card on their business app home tab."
                  : "Merchants don't see any support CTA right now. Toggle Active back on when the team is ready to handle inbound messages."}
              </p>
            </div>
          </div>

          {/* ── Form ──────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Support Contact
              </h2>
            </div>

            {/* WhatsApp Phone */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value.replace(/\s/g, ""))}
                placeholder="2348012345678"
                className={`input-field mt-1 font-mono ${
                  whatsappPhone && !phoneIsValid
                    ? "border-red-300 focus:ring-red-500/20"
                    : ""
                }`}
              />
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                E.164 digits only — no spaces, dashes, or leading{" "}
                <code className="bg-gray-100 px-1 rounded">+</code>. Example:{" "}
                <code className="bg-gray-100 px-1 rounded">2348012345678</code>{" "}
                for Nigeria.
              </p>
              {whatsappPhone && !phoneIsValid && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Must be 7–15 digits, no formatting characters.
                </p>
              )}
            </div>

            {/* Intro Message */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Opening Message
              </label>
              <textarea
                value={whatsappIntroMessage}
                onChange={(e) =>
                  setWhatsappIntroMessage(e.target.value.slice(0, 280))
                }
                placeholder="Hi Ruby+ team 👋 I'd like some help getting more customers..."
                rows={3}
                className="input-field mt-1 resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  Pre-filled in the merchant&apos;s WhatsApp composer.
                </p>
                <p
                  className={`text-xs ${
                    introTooLong ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {whatsappIntroMessage.length}/280
                </p>
              </div>
            </div>

            {/* Voice Phone */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                Voice Phone (optional)
              </label>
              <input
                type="text"
                value={voicePhone}
                onChange={(e) => setVoicePhone(e.target.value)}
                placeholder="+2348012345678"
                className="input-field mt-1 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Optional voice-call fallback. Leave blank to omit the voice CTA.
                Use the leading <code className="bg-gray-100 px-1 rounded">+</code>{" "}
                (e.g. <code className="bg-gray-100 px-1 rounded">+2348012345678</code>).
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                id="merchant-support-active"
                className="mt-1 rounded border-gray-300"
              />
              <label
                htmlFor="merchant-support-active"
                className="flex-1 cursor-pointer"
              >
                <p className="text-sm font-medium text-gray-900">Active</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  When off, the &quot;Talk to Ruby+&quot; card is hidden from
                  every business app. Use during support team blackouts so
                  merchants don&apos;t message into the void.
                </p>
              </label>
            </div>

            {/* Preview + Save */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-gray-100">
              <div>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Preview WhatsApp chat in new tab
                  </a>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Last-updated footer for accountability */}
            {config?.updatedAt && (
              <p className="text-[11px] text-gray-400 pt-1">
                Last updated {formatDate(config.updatedAt)}
                {config.updatedBy ? ` · by admin ${config.updatedBy.slice(-8)}` : ""}
              </p>
            )}
          </div>

          {/* Help card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed">
            <p className="font-semibold mb-1">How this works</p>
            <p>
              The business mobile app caches this config for 24 hours per
              device. After saving, existing devices pick up the new number
              within the day; new app opens see it immediately. If you change
              the number during an emergency, force-quit the app on test
              devices to verify the change propagated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
