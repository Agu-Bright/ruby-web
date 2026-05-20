'use client';

import { useMemo } from 'react';
import { Wifi, BatteryFull, Smartphone, Star, MapPin } from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import type {
  HomeSection,
  HomeSectionFeedItem,
  Location,
} from '@/lib/types';
import { TYPE_INFO } from './type-badge';

interface LivePreviewProps {
  /** All admin sections, in their current (possibly unsaved) drag order. */
  sections: HomeSection[];
  /** The preview audience — drives `{locationName}` substitution + filter. */
  previewLocationId: string;
  /** Resolved location list so we can render its display name.
   *  `useApi` returns `null` while loading; we accept it here so callers
   *  can pass the hook output directly without coercing. */
  locations: Location[] | null | undefined;
}

/**
 * Faux iPhone frame on the right side of the page that re-renders as
 * the admin drags / toggles / edits sections. Uses the same public
 * feed endpoint the customer mobile app calls, so what the admin sees
 * here matches what the customer would actually see (modulo a small
 * cache gap when the admin makes a change that hasn't been persisted
 * yet — we use the LOCAL section list for ordering + visibility, but
 * the backend for item hydration).
 *
 * Item hydration (the businesses + reviews inside each row) is fetched
 * via `GET /public/home-sections` — the realtime socket invalidates
 * this query as part of every admin mutation, so the preview is
 * always near-live.
 */
export function LivePreview({
  sections,
  previewLocationId,
  locations,
}: LivePreviewProps) {
  const { data: feed } = useApi<HomeSectionFeedItem[]>(
    () => api.homeSections.publicFeed(previewLocationId || undefined),
    [previewLocationId],
  );

  const locationName = useMemo(() => {
    if (!previewLocationId) return 'Your Area';
    const loc = (locations || []).find((l) => l._id === previewLocationId);
    return loc?.name || 'Your Area';
  }, [previewLocationId, locations]);

  // Merge: use the admin's local section order + visibility (so drag /
  // toggle previews instantly), but the public feed's hydrated items
  // (which the admin can't synthesise client-side without re-running
  // the trust-score query). Sections without a feed match (just-created)
  // render as empty rows in the preview.
  const merged = useMemo(() => {
    const feedById = new Map<string, HomeSectionFeedItem>();
    (feed || []).forEach((f) => feedById.set(f._id, f));

    return sections
      .filter((s) => s.isActive)
      .filter((s) => {
        // Match the same global-vs-location rule the backend applies:
        // - global (no locationId) shows everywhere
        // - location-scoped shows only when matching the preview city
        if (!s.locationId) return true;
        const sLoc =
          typeof s.locationId === 'object' ? s.locationId._id : s.locationId;
        return sLoc === previewLocationId;
      })
      .map((s) => ({
        section: s,
        hydrated: feedById.get(s._id),
      }));
  }, [sections, feed, previewLocationId]);

  const renderTitle = (title: string) =>
    title.replace(/\{locationName\}/g, locationName);

  return (
    <div className="sticky top-4 hidden lg:block">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5 mb-2 pl-2">
        <Smartphone className="w-3.5 h-3.5" />
        Customer app preview — {locationName}
      </div>

      {/* Phone frame */}
      <div className="relative mx-auto w-[340px] h-[640px] bg-gray-900 rounded-[44px] p-3 shadow-2xl shadow-gray-300/60">
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-gray-700 ml-12"></span>
        </div>

        {/* Screen */}
        <div className="relative w-full h-full bg-gray-50 rounded-[34px] overflow-hidden flex flex-col">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] text-gray-700 font-semibold">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              <BatteryFull className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Mobile content */}
          <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4 scrollbar-hide">
            {/* App header */}
            <div className="mb-3">
              <div className="text-[10px] text-gray-500">Hi, Guest</div>
              <div className="text-base font-bold text-gray-900 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-ruby-500" />
                {locationName}
              </div>
            </div>

            {/* Search pill */}
            <div className="bg-white border border-gray-200 rounded-full px-3 py-2 text-[11px] text-gray-400 mb-3">
              Search Ruby+…
            </div>

            {merged.length === 0 ? (
              <div className="text-center py-8 text-[11px] text-gray-400">
                Your customer app&rsquo;s home screen is empty for this city.
                Activate a row to preview it here.
              </div>
            ) : (
              <div className="space-y-4">
                {merged.map(({ section, hydrated }) => (
                  <PreviewSection
                    key={section._id}
                    section={section}
                    hydrated={hydrated}
                    locationName={locationName}
                    renderTitle={renderTitle}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-2 max-w-[340px] mx-auto">
        Drag &amp; toggle changes show here instantly. The actual businesses
        update once you save and the feed re-hydrates.
      </p>
    </div>
  );
}

function PreviewSection({
  section,
  hydrated,
  locationName,
  renderTitle,
}: {
  section: HomeSection;
  hydrated: HomeSectionFeedItem | undefined;
  locationName: string;
  renderTitle: (t: string) => string;
}) {
  const info = TYPE_INFO[section.type];
  const Icon = info.icon;
  const items = hydrated?.items || [];

  return (
    <div>
      {/* Banner — CURATED only */}
      {section.type === 'CURATED' && section.bannerUrl && (
        <div className="rounded-lg overflow-hidden mb-1.5">
          <img
            src={section.bannerUrl}
            alt=""
            className="w-full h-16 object-cover"
          />
        </div>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-gray-900 truncate flex items-center gap-1">
            <Icon className={`w-2.5 h-2.5 ${info.iconColor}`} />
            {renderTitle(section.title)}
          </div>
          {section.subtitle && (
            <div className="text-[9px] text-gray-500 truncate">
              {renderTitle(section.subtitle)}
            </div>
          )}
        </div>
        <span className="text-[9px] text-ruby-600 font-semibold shrink-0 ml-2">
          See more
        </span>
      </div>

      {/* Items */}
      {section.type === 'REVIEWS' ? (
        <PreviewReviewsRow items={items} />
      ) : (
        <PreviewBusinessRow items={items} placeholderType={section.type} />
      )}
    </div>
  );
}

function PreviewBusinessRow({
  items,
  placeholderType,
}: {
  items: any[];
  placeholderType: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-20 h-24 rounded-lg bg-white border border-dashed border-gray-200 flex items-center justify-center text-[9px] text-gray-300 shrink-0"
          >
            empty
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
      {items.slice(0, 6).map((b: any) => (
        <div
          key={b._id}
          className="w-20 h-24 rounded-lg bg-white border border-gray-200 overflow-hidden shrink-0"
        >
          {b.logoUrl || b.coverImageUrl ? (
            <img
              src={b.coverImageUrl || b.logoUrl}
              alt=""
              className="w-full h-12 object-cover"
            />
          ) : (
            <div className="w-full h-12 bg-gray-100" />
          )}
          <div className="p-1">
            <div className="text-[8.5px] font-semibold text-gray-900 truncate leading-tight">
              {b.name}
            </div>
            <div className="text-[8px] text-gray-500 truncate">
              {typeof b.locationId === 'object' && b.locationId?.name
                ? b.locationId.name
                : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewReviewsRow({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <div className="text-[9px] text-gray-300 italic py-2">
        Live reviews populate here from your customers.
      </div>
    );
  }
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
      {items.slice(0, 5).map((r: any) => (
        <div
          key={r._id}
          className="w-32 p-1.5 rounded-lg bg-white border border-gray-200 shrink-0"
        >
          <div className="flex items-center gap-1 mb-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-2 h-2 ${
                  i < (r.rating || 0)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="text-[8.5px] text-gray-700 line-clamp-2 leading-tight">
            {r.comment || r.review || '“Great experience.”'}
          </div>
        </div>
      ))}
    </div>
  );
}
