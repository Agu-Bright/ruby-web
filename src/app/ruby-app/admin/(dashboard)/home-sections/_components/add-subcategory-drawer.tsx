'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Drawer } from '@/components/ui/drawer';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import type {
  Subcategory,
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
  const [title, setTitle] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { data: subs } = useApi<Subcategory[]>(
    () => api.subcategories.list({ isActive: true, limit: 200 }),
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return subs || [];
    return (subs || []).filter((s) => {
      const name = s.name?.toLowerCase() || '';
      const catName =
        typeof s.categoryId === 'object'
          ? s.categoryId.name?.toLowerCase() || ''
          : '';
      return name.includes(term) || catName.includes(term);
    });
  }, [subs, search]);

  const getCategoryIdFromSubcategory = (s: Subcategory): string | null => {
    if (!s.categoryId) return null;
    return typeof s.categoryId === 'object' ? s.categoryId._id : s.categoryId;
  };

  const getCategoryName = (s: Subcategory): string => {
    if (!s.categoryId) return '';
    return typeof s.categoryId === 'object' ? s.categoryId.name : '';
  };

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
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Subcategory *
          </label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subcategories…"
              className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            />
          </div>
          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto divide-y divide-gray-100 bg-white">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                {search ? 'No matches' : 'Loading…'}
              </div>
            ) : (
              filtered.map((s) => {
                const sel = s._id === pickedSubId;
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
                      <div className="text-sm text-gray-900 truncate">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {getCategoryName(s) || '— uncategorised —'}
                      </div>
                    </div>
                    {sel && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
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
