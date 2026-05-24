'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Check, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Drawer } from '@/components/ui/drawer';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import type {
  Subcategory,
  Category,
  Location,
  CreateHomeSectionRequest,
} from '@/lib/types';

/**
 * Focused single-purpose drawer for the most common admin task: pin
 * one subcategory as a row on the customer-app home screen. Replaces
 * the previous modal version. Same logic, drawer shell, dirty-state
 * confirm-close.
 */
export function AddSubcategoryDrawer({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [search, setSearch] = useState('');
  const [pickedSubId, setPickedSubId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [title, setTitle] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Fetch EVERY subcategory in the system (active and inactive). The
  // earlier version sent `isActive: true` which silently dropped any
  // subcategory that ops had toggled off — admins reported seeing
  // only a few options here. Inactive ones are shown with a muted
  // badge so the admin can still see them but knows they're disabled.
  // Backend default limit is 500; we pass it explicitly for clarity.
  const { data: subs } = useApi<Subcategory[]>(
    () => api.subcategories.list({ limit: 500 }),
    [],
  );
  // Categories (active + inactive) for the chip filter at the top.
  // No filter param → returns everything; admin can group/narrow by
  // category to make a 100+-row list scannable.
  const { data: categories } = useApi<Category[]>(
    () => api.categories.list(),
    [],
  );
  const { data: locations } = useApi<Location[]>(
    () => api.locations.list({ limit: 100 }),
    [],
  );

  const picked = useMemo(
    () => (subs || []).find((s) => s._id === pickedSubId) || null,
    [subs, pickedSubId],
  );

  useEffect(() => {
    if (picked && !title) setTitle(picked.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?._id]);

  const getCategoryIdFromSubcategory = (s: Subcategory): string | null => {
    if (!s.categoryId) return null;
    return typeof s.categoryId === 'object' ? s.categoryId._id : s.categoryId;
  };

  const getCategoryName = (s: Subcategory): string => {
    if (!s.categoryId) return '';
    return typeof s.categoryId === 'object' ? s.categoryId.name : '';
  };

  // Apply search + category-chip filter together. Search matches the
  // subcategory name, slug, OR parent category name — admin's gut-
  // typing of either should surface the row.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = subs || [];
    return all.filter((s) => {
      if (categoryFilter) {
        const parentId = getCategoryIdFromSubcategory(s);
        if (parentId !== categoryFilter) return false;
      }
      if (!term) return true;
      const name = s.name?.toLowerCase() || '';
      const slug = s.slug?.toLowerCase() || '';
      const catName = getCategoryName(s).toLowerCase();
      return (
        name.includes(term) || slug.includes(term) || catName.includes(term)
      );
    });
  }, [subs, search, categoryFilter]);

  // Group the filtered list by parent category so the admin gets a
  // browseable structure instead of a flat 100-row scroll. Sort
  // categories by name (matches the rest of the admin), and within a
  // category sort by displayOrder then name (the canonical order
  // used everywhere the taxonomy is rendered).
  const grouped = useMemo(() => {
    const buckets = new Map<
      string,
      { categoryId: string; categoryName: string; items: Subcategory[] }
    >();
    filtered.forEach((s) => {
      const parentId = getCategoryIdFromSubcategory(s) || '__uncategorised__';
      const parentName = getCategoryName(s) || '— Uncategorised —';
      if (!buckets.has(parentId)) {
        buckets.set(parentId, {
          categoryId: parentId,
          categoryName: parentName,
          items: [],
        });
      }
      buckets.get(parentId)!.items.push(s);
    });
    return Array.from(buckets.values()).sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName),
    );
  }, [filtered]);

  // Subcategories-per-category map for the chip count badges. Counted
  // against the FULL (unfiltered) list so admins see "Restaurants (3)"
  // even when their search has narrowed the visible rows to zero.
  const countsByCategory = useMemo(() => {
    const m = new Map<string, number>();
    (subs || []).forEach((s) => {
      const id = getCategoryIdFromSubcategory(s);
      if (!id) return;
      m.set(id, (m.get(id) || 0) + 1);
    });
    return m;
  }, [subs]);

  const markDirty = () => {
    if (!dirty) setDirty(true);
  };

  const handleSave = async () => {
    if (!picked) {
      toast.error('Pick a subcategory');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    const categoryId = getCategoryIdFromSubcategory(picked);
    if (!categoryId) {
      toast.error('This subcategory is missing its parent category');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateHomeSectionRequest = {
        type: 'CATEGORY',
        title: title.trim(),
        categoryId,
        subcategoryId: picked._id,
        locationId: locationId || undefined,
        isActive,
      };
      await api.homeSections.create(payload);
      toast.success(`Section "${title.trim()}" created`);
      setDirty(false);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to create section');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add subcategory section"
      subtitle="Pin one subcategory as a row on the customer-app home screen."
      confirmCloseMessage={
        dirty
          ? 'Discard the new section and close?'
          : undefined
      }
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting || !pickedSubId}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {submitting ? 'Saving…' : 'Add to home'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Subcategory *
            </label>
            <span className="text-[11px] text-gray-400">
              {filtered.length} of {subs?.length ?? 0}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subcategory or category name…"
              className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            />
          </div>

          {/* Category chip filter — horizontal scrolling so it works on
              narrow drawers + maps cleanly to ~10 categories. The
              "All" chip clears the filter. */}
          {(categories?.length ?? 0) > 0 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1">
              <CategoryChip
                label="All"
                count={subs?.length ?? 0}
                active={!categoryFilter}
                onClick={() => setCategoryFilter('')}
              />
              {(categories || []).map((c) => (
                <CategoryChip
                  key={c._id}
                  label={c.name}
                  count={countsByCategory.get(c._id) ?? 0}
                  active={categoryFilter === c._id}
                  onClick={() =>
                    setCategoryFilter(categoryFilter === c._id ? '' : c._id)
                  }
                />
              ))}
            </div>
          )}

          {/* Grouped subcategory list */}
          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-[420px] overflow-y-auto bg-white">
            {!subs ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400">
                Loading subcategories…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400">
                {search || categoryFilter
                  ? 'No matches. Clear filters to see everything.'
                  : 'No subcategories in the system yet.'}
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.categoryId}>
                  <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 px-3 py-1.5 flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      {group.categoryName}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.items.map((s) => {
                      const sel = s._id === pickedSubId;
                      const isInactive = s.isActive === false;
                      return (
                        <button
                          type="button"
                          key={s._id}
                          onClick={() => {
                            setPickedSubId(s._id);
                            markDirty();
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                            sel ? 'bg-emerald-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm truncate ${
                                  isInactive ? 'text-gray-400' : 'text-gray-900'
                                }`}
                              >
                                {s.name}
                              </span>
                              {isInactive && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold shrink-0">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {s.slug && (
                              <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                {s.slug}
                              </div>
                            )}
                          </div>
                          {sel && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          {picked?.isActive === false && (
            <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1">
              <span className="font-semibold">Heads up:</span> this
              subcategory is currently inactive. The home-screen row
              will exist but won&rsquo;t show businesses until the
              subcategory is reactivated.
            </p>
          )}
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Section title *
          </label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            placeholder='e.g. "Top Plumbers in Lagos"'
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Auto-fills from the subcategory name. Edit to add flair (e.g. &ldquo;Top
            Plumbers in {`{locationName}`}&rdquo; — supports location substitution).
          </p>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Location scope
          </label>
          <select
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              markDirty();
            }}
            className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
          >
            <option value="">Global (shown everywhere)</option>
            {(locations || []).map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-gray-100">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => {
              setIsActive(e.target.checked);
              markDirty();
            }}
            className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500"
          />
          <span className="text-sm text-gray-700">
            Section is active (visible on the home screen)
          </span>
        </label>
      </div>
    </Drawer>
  );
}

/**
 * Small filter chip used to narrow the subcategory list by parent
 * category. Always shows a count badge so the admin can see how many
 * subcategories live in each category at a glance — critical when the
 * full list spans 100+ rows.
 */
function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
        active
          ? 'bg-ruby-50 border-ruby-300 text-ruby-700'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
      <span
        className={`text-[10px] ${
          active ? 'text-ruby-500' : 'text-gray-400'
        }`}
      >
        {count}
      </span>
    </button>
  );
}
