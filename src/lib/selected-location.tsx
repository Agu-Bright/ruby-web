'use client';

/**
 * P128-LAND — Selected-location context for the landing page.
 *
 * One source of truth that drives:
 *   - The location picker in RedStrip (lets the user choose a city)
 *   - The data fetch in FeaturedServices (whats-hot in that city)
 *   - The data fetch in ExploreRuby (Ruby+ Select feed in that city)
 *
 * On first mount the provider fetches the full list of active locations
 * from the public endpoint `/locations/public` and defaults the
 * selection to Lagos (resolved by slug). When the user picks a
 * different city, every consumer re-renders + refetches.
 *
 * Falls back gracefully if the backend is unreachable — selectedLocation
 * stays null and consumer components show their placeholder content.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.rubyplus.net/api';

/**
 * Default city slug used when the page first loads. Matches the
 * Lagos location seeded in the backend. If your deploy renames the
 * slug, change this constant — no env var required.
 */
const DEFAULT_LOCATION_SLUG = 'lagos';

export interface PublicLocation {
  _id: string;
  name: string;
  slug: string;
  type?: string;
  parentId?: string | null;
}

interface SelectedLocationContextValue {
  selectedLocation: PublicLocation | null;
  setSelectedLocation: (loc: PublicLocation) => void;
  allLocations: PublicLocation[];
  loading: boolean;
}

const SelectedLocationContext =
  createContext<SelectedLocationContextValue | null>(null);

export function SelectedLocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [allLocations, setAllLocations] = useState<PublicLocation[]>([]);
  const [selectedLocation, setSelectedLocationState] =
    useState<PublicLocation | null>(null);
  const [loading, setLoading] = useState(true);

  // Stable setter so consumers can put it in a useEffect deps array
  // without retriggering on every render.
  const setSelectedLocation = useCallback((loc: PublicLocation) => {
    setSelectedLocationState(loc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/locations/public`);
        if (!res.ok) return;
        const json = await res.json();
        // Backend response shape varies — accept either `data: [...]`
        // or `data: { items: [...] }`. Empty array on anything unexpected.
        const list: PublicLocation[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.items)
            ? json.data.items
            : Array.isArray(json?.data?.locations)
              ? json.data.locations
              : [];
        if (cancelled) return;
        // Filter to leaf locations (cities) — backend may return a mix
        // of countries/states/cities. Cities are what the user picks.
        // Heuristic: prefer items with type CITY, fall back to all.
        const cities = list.filter(
          (l) => !l.type || l.type === 'CITY' || l.type === 'city',
        );
        const finalList = cities.length > 0 ? cities : list;
        setAllLocations(finalList);
        // Default to Lagos by slug; fall back to first item if Lagos
        // isn't present (e.g. slug was renamed or test data).
        const lagos = finalList.find((l) => l.slug === DEFAULT_LOCATION_SLUG);
        setSelectedLocationState(lagos || finalList[0] || null);
      } catch {
        // Silent — consumers will show placeholders
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SelectedLocationContext.Provider
      value={{
        selectedLocation,
        setSelectedLocation,
        allLocations,
        loading,
      }}
    >
      {children}
    </SelectedLocationContext.Provider>
  );
}

/**
 * Read the currently selected location + the list of available cities.
 * Returns safe defaults if called outside a Provider (e.g. during SSR
 * of a server component shell) so consumers don't crash.
 */
export function useSelectedLocation(): SelectedLocationContextValue {
  const ctx = useContext(SelectedLocationContext);
  if (!ctx) {
    return {
      selectedLocation: null,
      setSelectedLocation: () => {},
      allLocations: [],
      loading: false,
    };
  }
  return ctx;
}

export const RUBY_PLUS_API_BASE = API_BASE;
