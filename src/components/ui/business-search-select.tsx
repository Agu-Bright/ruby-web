'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Check, Store } from 'lucide-react';
import { api } from '@/lib/api';
import type { Business } from '@/lib/types';

const BIZ_LINK = /\/\(tabs\)\/business\/([a-fA-F0-9]{24})/;

/** Extract the businessId from a Ruby+ Select CTA deep link, if it is one. */
export function businessIdFromCta(value?: string): string | null {
  const match = value?.match(BIZ_LINK);
  return match ? match[1] : null;
}

/**
 * Server-side business search picker.
 *
 * Typing debounces a query to `GET /admin/businesses?search=` (backend does a
 * fuzzy name match) — no client-side preload / row cap, so it scales to any
 * number of businesses. Selecting a result sets the value to the app deep link
 * `/(tabs)/business/<id>`; the current value (when it is a business link) is
 * resolved back to the business name for display.
 */
export function BusinessSearchSelect({
  value,
  onChange,
  placeholder = 'Search a live business by name…',
}: {
  value: string;
  onChange: (ctaUrl: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  const selectedId = businessIdFromCta(value);

  // Resolve the selected business id → name for the closed-state label.
  useEffect(() => {
    let cancelled = false;
    if (!selectedId) {
      setSelectedLabel('');
      return;
    }
    const known = results.find((b) => b._id === selectedId);
    if (known) {
      setSelectedLabel(known.name);
      return;
    }
    api.businesses
      .get(selectedId)
      .then((res: any) => {
        // request() returns the { success, data, meta } envelope — the
        // business is at `.data`.
        const biz = res?.data ?? res;
        if (!cancelled) setSelectedLabel(biz?.name || 'Selected business');
      })
      .catch(() => {
        if (!cancelled) setSelectedLabel('Selected business');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Debounced server-side search with out-of-order response guarding.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const myReq = ++reqIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.businesses.list({ search: q, status: 'LIVE' as any, limit: 20 });
        // request() returns the { success, data, meta } envelope; the business
        // array is at `.data`. (Kept array/items fallbacks for safety.)
        const items = Array.isArray(res)
          ? res
          : ((res as any)?.data ?? (res as any)?.items ?? []);
        if (myReq === reqIdRef.current) setResults(items);
      } catch {
        if (myReq === reqIdRef.current) setResults([]);
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) {
      document.addEventListener('mousedown', onDown);
      return () => document.removeEventListener('mousedown', onDown);
    }
  }, [open]);

  const openMenu = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const select = useCallback(
    (biz: Business) => {
      onChange(`/(tabs)/business/${biz._id}`);
      setSelectedLabel(biz.name);
      setOpen(false);
      setQuery('');
    },
    [onChange],
  );

  const clear = () => {
    onChange('');
    setSelectedLabel('');
  };

  const cityOf = (biz: Business): string =>
    typeof (biz as any).locationId === 'object'
      ? (biz as any).locationId?.name
      : (biz as any).categoryName || (biz as any).subcategoryName || 'Live business';

  return (
    <div ref={containerRef} className="relative">
      <div className="input-field flex items-center gap-2">
        {selectedId ? <Store className="w-3.5 h-3.5 shrink-0 text-ruby-red" /> : <Search className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
        <button
          type="button"
          onClick={openMenu}
          className={`flex-1 truncate text-left ${selectedId ? 'text-gray-900' : 'text-gray-400'}`}
        >
          {selectedId ? selectedLabel || 'Resolving…' : placeholder}
        </button>
        {selectedId && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear selected business"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-[1000] left-0 right-0 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg animate-fade-in">
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a business name…"
                className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-8 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {loading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {query.trim() === '' ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">Start typing to search live businesses</div>
            ) : loading && results.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">Searching…</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">No live businesses match “{query.trim()}”</div>
            ) : (
              results.map((biz) => (
                <button
                  key={biz._id}
                  type="button"
                  onClick={() => select(biz)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                    biz._id === selectedId ? 'font-medium text-red-700' : 'text-gray-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{biz.name}</div>
                    <div className="mt-0.5 truncate text-[11px] text-gray-400">{cityOf(biz)}</div>
                  </div>
                  {biz._id === selectedId && <Check className="w-3.5 h-3.5 shrink-0 text-red-500" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
