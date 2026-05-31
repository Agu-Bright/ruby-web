'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search } from 'lucide-react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

/**
 * Phase 60 — admin-web venue pin picker. Real interactive map (react-
 * leaflet + OpenStreetMap tiles, no API key required) where the admin
 * clicks anywhere to drop a pin, drags the pin to refine, and can
 * search a venue by address to recenter.
 *
 * Returns/accepts the GeoJSON convention: tuple `[longitude, latitude]`
 * — same contract the prior stub used, so callers don't need to change.
 *
 * Implementation notes:
 *   - Loaded via next/dynamic with `ssr: false` because Leaflet touches
 *     `window` at module-eval time and would otherwise crash SSR.
 *   - We import Leaflet's CSS at runtime (side-effect import inside the
 *     dynamic module) so consumers don't need to add a global stylesheet.
 *   - Default marker icons in Leaflet break under bundlers (the icon URLs
 *     are relative to leaflet's own dist). We pin a CDN icon explicitly.
 */
interface Props {
  /** GeoJSON tuple [lng, lat] or null when nothing picked yet. */
  value: [number, number] | null;
  onChange: (coords: [number, number] | null) => void;
  /** Address to geocode + recenter on when the admin clicks "Find". */
  venueAddress?: string;
  /** Venue name — appended to the geocode query for better match accuracy. */
  venueName?: string;
  /** Optional initial centre (e.g. the selected city's centerPoint) when no pin yet. */
  initialCenter?: { lat: number; lng: number } | null;
}

// Lazy load the actual map so Next.js doesn't try to SSR Leaflet (which
// would touch `window` and crash on build).
const MapInner = dynamic(() => import('./VenueMapPickerInner'), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-500">
      Loading map…
    </div>
  ),
});

export const VenueMapPicker: React.FC<Props> = ({
  value,
  onChange,
  venueAddress,
  venueName,
  initialCenter,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Free-text geocoder via OpenStreetMap's Nominatim — same backend
  // Leaflet uses. No API key. Polite-use: 1 req/sec recommended; the
  // admin manually triggers, so we're well under.
  const handleGeocode = async () => {
    const q = (searchValue || `${venueName ?? ''} ${venueAddress ?? ''}`).trim();
    if (!q) {
      setSearchError('Type a venue address (or fill the address field).');
      return;
    }
    setSearchError(null);
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        q,
      )}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });
      const json = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!json[0]) {
        setSearchError('No match found. Drop the pin manually on the map.');
        return;
      }
      const lat = parseFloat(json[0].lat);
      const lng = parseFloat(json[0].lon);
      onChange([lng, lat]);
    } catch (err: any) {
      setSearchError(
        'Geocoder unreachable. Drop the pin manually on the map.',
      );
    } finally {
      setSearching(false);
    }
  };

  // Compute the initial centre passed down to the map. Priority:
  // 1) the existing pin (so re-opening an event shows where it is)
  // 2) initialCenter from caller (e.g. city centerPoint after dropdown change)
  // 3) Lagos as a sensible Nigeria-wide default
  const center = useMemo<{ lat: number; lng: number }>(() => {
    if (value) return { lat: value[1], lng: value[0] };
    if (initialCenter) return initialCenter;
    return { lat: 6.5244, lng: 3.3792 }; // Lagos
  }, [value, initialCenter]);

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-700">
          Venue pin <span className="text-red-600">*</span>
        </label>
        {value && (
          <span className="text-[11px] text-gray-500 font-mono">
            {value[1].toFixed(5)}, {value[0].toFixed(5)}
          </span>
        )}
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed">
        Click the map to drop a pin, or drag the pin to fine-tune. Use the
        search box to jump to a venue by address.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleGeocode();
            }
          }}
          placeholder={
            venueAddress
              ? `Search… (e.g. "${venueAddress.slice(0, 40)}")`
              : 'Search venue by address'
          }
          className="input text-sm flex-1"
        />
        <button
          type="button"
          onClick={handleGeocode}
          disabled={searching}
          className="px-3 py-2 text-xs font-semibold bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60 flex items-center gap-1"
        >
          <Search className="w-3.5 h-3.5" />
          {searching ? 'Searching…' : 'Find'}
        </button>
      </div>

      {searchError && (
        <p className="text-[11px] text-red-600">{searchError}</p>
      )}

      <MapInner
        value={value}
        onChange={onChange}
        center={center}
      />
    </div>
  );
};

export default VenueMapPicker;
