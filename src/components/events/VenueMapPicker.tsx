'use client';

import React, { useCallback } from 'react';

/**
 * Phase 42 — admin-web venue pin picker. Pragmatic V1: latitude +
 * longitude number inputs + a "Find on Google Maps" helper button that
 * opens Google Maps in a new tab seeded with the venue address. The
 * admin right-clicks → copies coords → pastes back here.
 *
 * Why no embedded interactive map: the admin-web package doesn't
 * currently include `@react-google-maps/api` (or a comparable Mapbox/
 * Leaflet stack). Adding one is a bigger lift requiring a publishable
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` + bundle-size review. V1.1 candidate.
 *
 * V1 ergonomics are still solid because:
 *   - The business-side mobile picker is the primary entry point (most
 *     events come from merchants there, who get a proper interactive
 *     map).
 *   - The admin's job in this drawer is usually QA / corrections, where
 *     paste-from-Google is faster than navigating an embedded map anyway.
 *
 * Returns/accepts the GeoJSON convention: tuple `[longitude, latitude]`.
 */
interface Props {
  value: [number, number] | null;
  onChange: (coords: [number, number] | null) => void;
  /** Optional venue address — seeds the Google Maps helper link. */
  venueAddress?: string;
  /** Optional venue name — appended to the Google search. */
  venueName?: string;
}

export const VenueMapPicker: React.FC<Props> = ({
  value,
  onChange,
  venueAddress,
  venueName,
}) => {
  const lng = value?.[0] ?? '';
  const lat = value?.[1] ?? '';

  const handleLat = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === '') {
        // Allow clearing; null when both fields empty
        onChange(typeof lng === 'number' ? [lng as number, 0] : null);
        return;
      }
      const num = parseFloat(v);
      if (!Number.isFinite(num) || num < -90 || num > 90) return;
      onChange([typeof lng === 'number' ? (lng as number) : 0, num]);
    },
    [onChange, lng],
  );

  const handleLng = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === '') {
        onChange(typeof lat === 'number' ? [0, lat as number] : null);
        return;
      }
      const num = parseFloat(v);
      if (!Number.isFinite(num) || num < -180 || num > 180) return;
      onChange([num, typeof lat === 'number' ? (lat as number) : 0]);
    },
    [onChange, lat],
  );

  const googleMapsUrl = (() => {
    if (value) {
      // Already-pinned: open Google Maps zoomed to those coords
      return `https://www.google.com/maps?q=${value[1]},${value[0]}&z=17`;
    }
    // No coords yet: search by venue address + name to help admin find it
    const q = encodeURIComponent(
      [venueName, venueAddress].filter(Boolean).join(' ') || 'Lagos',
    );
    return `https://www.google.com/maps/search/${q}`;
  })();

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-700">
          Venue coordinates <span className="text-red-600">*</span>
        </label>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-ruby-red hover:underline"
        >
          {value ? 'View pin on Google Maps' : 'Find on Google Maps →'}
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="0.000001"
            min="-90"
            max="90"
            value={lat as any}
            onChange={handleLat}
            placeholder="6.524400"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="0.000001"
            min="-180"
            max="180"
            value={lng as any}
            onChange={handleLng}
            placeholder="3.379200"
            className="input text-sm"
          />
        </div>
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed">
        Click <span className="font-semibold text-gray-700">Find on Google Maps</span>{' '}
        → right-click the exact venue spot → copy the coords → paste here.
        Lagos is roughly <code className="text-[10px]">6.52, 3.38</code>; Abuja{' '}
        <code className="text-[10px]">9.07, 7.40</code>.
      </p>
    </div>
  );
};
