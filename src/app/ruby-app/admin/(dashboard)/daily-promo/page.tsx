"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle, Image as ImageIcon, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ImageUpload } from "@/components/ui/image-upload";
import { PageHeader } from "@/components/ui";
import { SearchableSelect, type SelectOption } from "@/components/ui/searchable-select";
import type { DailyBusinessPromo, DailyBusinessPromoItem } from "@/lib/types";

const empty = (displayOrder: number): DailyBusinessPromoItem => ({ isActive: false, displayOrder, title: "", subtitle: "", ctaLabel: "" });
const normalize = (config: DailyBusinessPromo): DailyBusinessPromoItem[] => config.items?.length
  ? [...config.items].sort((a, b) => a.displayOrder - b.displayOrder)
  : (config.businessId || config.heroImageUrl || config.title ? [{ _id: config._id, isActive: !!config.isActive, businessId: config.businessId, heroImageUrl: config.heroImageUrl, title: config.title || "", subtitle: config.subtitle || "", ctaLabel: config.ctaLabel || "", displayOrder: 0 }] : []);

export default function DailyPromoPage() {
  const [items, setItems] = useState<DailyBusinessPromoItem[]>([]);
  const [selected, setSelected] = useState(0);
  const [businesses, setBusinesses] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await api.dailyBusinessPromo.get(); setItems(normalize((response.data || response) as DailyBusinessPromo)); setSelected(0); }
    catch (error: any) { toast.error(error?.message || "Could not load daily promos"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    load();
    api.businesses.list({ limit: 200, status: "LIVE" as any }).then((response) => setBusinesses(((response.data as any[]) || []).map((business) => ({ value: business._id, label: business.name || "(unnamed business)", description: business.categoryName || business.address?.city })).sort((a, b) => a.label.localeCompare(b.label)))).catch(() => undefined);
  }, [load]);
  const current = items[selected];
  const ready = useMemo(() => items.filter((item) => item.isActive && item.businessId && item.heroImageUrl).length, [items]);
  const update = (patch: Partial<DailyBusinessPromoItem>) => setItems((all) => all.map((item, index) => index === selected ? { ...item, ...patch } : item));
  const add = () => { setItems((all) => [...all, empty(all.length)]); setSelected(items.length); };
  const remove = () => { setItems((all) => all.filter((_, index) => index !== selected).map((item, index) => ({ ...item, displayOrder: index }))); setSelected((index) => Math.max(0, index - 1)); };
  const save = async () => {
    if (items.some((item) => item.isActive && (!item.businessId || !item.heroImageUrl))) { toast.error("Every active promo needs a business and marketing creative."); return; }
    setSaving(true);
    try {
      await api.dailyBusinessPromo.update({ items: items.map((item, index) => ({ ...item, businessId: typeof item.businessId === "object" ? item.businessId._id : item.businessId, displayOrder: index })) });
      toast.success("Daily promo carousel saved"); await load();
    } catch (error: any) { toast.error(error?.message || "Could not save daily promos"); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  return <div className="mx-auto max-w-6xl space-y-6">
    <PageHeader title="Daily Promo" description="Create several full-screen promos. Active promos appear as a swipeable carousel when customers first open the app each day." />
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>{ready} promo{ready === 1 ? "" : "s"} ready to display.</strong> Customers can swipe through every active card. Incomplete or switched-off cards are never sent to the customer app.</div></div>
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-xl border bg-white p-3"><div className="mb-3 flex items-center justify-between px-1"><h2 className="font-semibold">Carousel cards</h2><button onClick={add} className="rounded-lg bg-ruby-500 p-2 text-white" aria-label="Add daily promo"><Plus className="h-4 w-4" /></button></div><div className="space-y-2">{items.length === 0 ? <p className="px-2 py-5 text-sm text-gray-500">No daily promos yet.</p> : items.map((item, index) => { const businessId = typeof item.businessId === "object" ? item.businessId._id : item.businessId; const businessName = typeof item.businessId === "object" ? item.businessId.name : businesses.find((b) => b.value === businessId)?.label; return <button key={item._id || index} onClick={() => setSelected(index)} className={`w-full rounded-lg border p-3 text-left ${index === selected ? "border-ruby-400 bg-ruby-50" : "border-gray-200 hover:bg-gray-50"}`}><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-gray-300"}`} /><span className="truncate text-sm font-semibold">{item.title || `Promo ${index + 1}`}</span></div><p className="mt-1 truncate text-xs text-gray-500">{businessName || "Choose a business"}</p></button>; })}</div></aside>
      {current ? <section className="space-y-5 rounded-xl border bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4 border-b pb-4"><div><h2 className="font-semibold">Promo {selected + 1}</h2><p className="mt-1 text-sm text-gray-500">Changes apply when you save the carousel.</p></div><button onClick={remove} className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600"><Trash2 className="h-4 w-4" />Remove</button></div><label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-50 p-4"><span><strong className="block text-sm">Show on customer app</strong><span className="text-xs text-gray-500">Active cards require a business and image.</span></span><input type="checkbox" checked={current.isActive} onChange={(event) => update({ isActive: event.target.checked })} className="h-5 w-5 accent-[#FD362F]" /></label><div><label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500"><Building2 className="h-3.5 w-3.5" />Featured business</label><SearchableSelect options={businesses} value={typeof current.businessId === "object" ? current.businessId._id : current.businessId || ""} onChange={(businessId) => update({ businessId })} placeholder="Pick a live business…" /></div><ImageUpload value={current.heroImageUrl} onChange={(heroImageUrl) => update({ heroImageUrl })} folder="daily-promo" label="Marketing creative" helpText="One flyer per carousel card. 4:5 or square works best." maxSizeMB={5} /><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Title<input value={current.title || ""} onChange={(event) => update({ title: event.target.value })} maxLength={120} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal" placeholder="Campaign headline" /></label><label className="text-sm font-medium">CTA label<input value={current.ctaLabel || ""} onChange={(event) => update({ ctaLabel: event.target.value })} maxLength={40} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal" placeholder="Visit" /></label></div><label className="block text-sm font-medium">Subtitle <span className="font-normal text-gray-400">(optional)</span><input value={current.subtitle || ""} onChange={(event) => update({ subtitle: event.target.value })} maxLength={200} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal" placeholder="Short supporting message" /></label><div className="flex justify-end border-t pt-5"><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-ruby-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Saving…" : "Save carousel"}</button></div></section> : <section className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-white text-center"><ImageIcon className="h-8 w-8 text-gray-300" /><p className="mt-3 text-sm text-gray-500">Create the first card for today&apos;s daily promo carousel.</p><button onClick={add} className="mt-4 text-sm font-semibold text-ruby-600">Add daily promo</button></section>}
    </div>
  </div>;
}
