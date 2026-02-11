'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================
// OpenStreetMap Nominatim geocoding (free, no API key)
// ============================================================

export interface GeocodingResult {
  displayName: string;
  lat: number;
  lng: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  type: string;
}

export async function geocodeSearch(
  query: string,
  countryCode?: string
): Promise<GeocodingResult[]> {
  if (!query.trim() || query.trim().length < 2) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    addressdetails: '1',
  });

  if (countryCode) {
    params.set('countrycodes', countryCode.toLowerCase());
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RubyPlusAdmin/1.0',
      },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();

  return data.map((item: {
    display_name: string;
    lat: string;
    lon: string;
    boundingbox?: string[];
    type?: string;
  }) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    bounds: item.boundingbox
      ? {
          south: parseFloat(item.boundingbox[0]),
          north: parseFloat(item.boundingbox[1]),
          west: parseFloat(item.boundingbox[2]),
          east: parseFloat(item.boundingbox[3]),
        }
      : undefined,
    type: item.type || 'place',
  }));
}

// ─── React Hook ──────────────────────────────────────────────

export function useGeocoding(debounceMs = 500) {
  const [query, setQuery] = useState('');
  const [countryCode, setCountryCode] = useState<string | undefined>();
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (q: string, cc?: string) => {
      if (!q.trim() || q.trim().length < 2) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsSearching(true);
      try {
        const r = await geocodeSearch(q, cc);
        setResults(r);
      } catch {
        // Silently fail on abort/network errors
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    timerRef.current = setTimeout(() => {
      search(query, countryCode);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, countryCode, debounceMs, search]);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    countryCode,
    setCountryCode,
    clearResults,
  };
}
