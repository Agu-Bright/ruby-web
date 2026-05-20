'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Drawer } from '@/components/ui/drawer';
import { ImageUpload } from '@/components/ui';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import type {
  HomeSection,
  HomeSectionType,
  CreateHomeSectionRequest,
  UpdateHomeSectionRequest,
  Location,
  Category,
} from '@/lib/types';
import { BusinessMultiSelect } from './business-multi-select';

interface SectionEditDrawerProps {
  isOpen: boolean;
  mode: 'create-curated' | 'edit';
  section: HomeSection | null;
  onClose: () => void;
  onSaved: () => void;
}

const isSystemType = (t: HomeSectionType) => t !== 'CURATED';

/**
 * Right-side drawer used for both creating CURATED sections and
 * editing any section. Replaces the previous Modal-based form so
 * the section list stays visible behind the editor — the admin can
 * see surrounding rows for context without losing scroll position.
 *
 * Type-aware field visibility:
 *  - title / subtitle / location / isActive: always editable
 *  - bannerUrl + businessIds: CURATED only
 *  - categoryId + subcategoryId: CATEGORY only
 *  - REVIEWS / WHATS_HOT: text + location + active only
 */
export function SectionEditDrawer({
  isOpen,
  mode,
  section,
  onClose,
  onSaved,
}: SectionEditDrawerProps) {
  const isEdit = mode === 'edit' && !!section;
  const isCreatingCurated = mode === 'create-curated';
  const sectionType = isEdit ? section!.type : 'CURATED';
  const isSystem = isEdit && isSystemType(sectionType);
  const isCategory = isEdit && sectionType === 'CATEGORY';
  const allowsBusinessIds = isCreatingCurated || sectionType === 'CURATED';
  const allowsBanner = isCreatingCurated || sectionType === 'CURATED';
  const allowsCategoryEdit = isCategory;

  // Form state. Re-initialised whenever the drawer (re)opens via the
  // `key` prop on the parent — keeps state local to one editing
  // session without manual reset.
  const [title, setTitle] = useState(section?.title ?? '');
  const [subtitle, setSubtitle] = useState(section?.subtitle ?? '');
  const [locationId, setLocationId] = useState(
    section?.locationId
      ? typeof section.locationId === 'object'
        ? section.locationId._id
        : section.locationId
      : '',
  );
  const [categoryIdState, setCategoryIdState] = useState(
    section?.categoryId
      ? typeof section.categoryId === 'object'
        ? section.categoryId._id
        : section.categoryId
      : '',
  );
  const [subcategoryIdState, setSubcategoryIdState] = useState(
    section?.subcategoryId
      ? typeof section.subcategoryId === 'object'
        ? section.subcategoryId._id
        : section.subcategoryId
      : '',
  );
  const [bannerUrl, setBannerUrl] = useState(section?.bannerUrl ?? '');
  const [isActive, setIsActive] = useState(section?.isActive ?? true);
  const [businessIds, setBusinessIds] = useState<string[]>(
    section?.businessIds ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Touch-tracking — drives the "unsaved changes?" confirm on close.
  const markDirty = () => {
    if (!dirty) setDirty(true);
  };

  const { data: locations } = useApi<Location[]>(
    () => api.locations.list({ limit: 100 }),
    [],
  );
  const { data: categories } = useApi<Category[]>(
    () => api.categories.list(),
    [],
  );
  const { data: subcategories } = useApi<any[]>(
    () =>
      categoryIdState
        ? api.subcategories.list({
            categoryId: categoryIdState,
            isActive: true,
            limit: 100,
          })
        : Promise.resolve({ success: true, data: [] }),
    [categoryIdState],
  );

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      if (isCreatingCurated) {
        if (businessIds.length === 0) {
          toast.error('Pick at least one business for a curated section');
          setSubmitting(false);
          return;
        }
        const payload: CreateHomeSectionRequest = {
          type: 'CURATED',
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          businessIds,
          locationId: locationId || undefined,
          isActive,
          bannerUrl: bannerUrl || undefined,
        };
        await api.homeSections.create(payload);
        toast.success('Section created');
      } else if (isEdit) {
        const payload: UpdateHomeSectionRequest = {
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          locationId: locationId || null,
          isActive,
        };
        if (allowsBusinessIds) payload.businessIds = businessIds;
        if (allowsBanner) payload.bannerUrl = bannerUrl || undefined;
        if (allowsCategoryEdit && categoryIdState) {
          payload.categoryId = categoryIdState;
          payload.subcategoryId = subcategoryIdState || '';
        }
        await api.homeSections.update(section!._id, payload);
        toast.success('Section updated');
      }
      setDirty(false);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to save section');
    } finally {
      setSubmitting(false);
    }
  };

  const subtitleText = isSystem
    ? 'System section — only label, location, and visibility are editable.'
    : isCreatingCurated
      ? 'Hand-pick which businesses appear in this row.'
      : sectionType === 'CATEGORY'
        ? 'Auto-populated from the chosen category. Edit which one it points at.'
        : 'Adjust the curated row contents.';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        isCreatingCurated
          ? 'New curated section'
          : `Edit: ${section?.title ?? 'section'}`
      }
      subtitle={subtitleText}
      confirmCloseMessage={
        dirty
          ? 'You have unsaved changes. Discard them and close?'
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
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {submitting ? 'Saving…' : isCreatingCurated ? 'Create' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Title *
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
          {(sectionType === 'WHATS_HOT' || isCategory) && (
            <p className="text-[11px] text-gray-400 mt-1">
              Use <code className="text-[10px] bg-gray-100 px-1 rounded">{'{locationName}'}</code>{' '}
              to substitute the user&rsquo;s current city at render time.
            </p>
          )}
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Subtitle (optional)
          </label>
          <input
            value={subtitle}
            onChange={(e) => {
              setSubtitle(e.target.value);
              markDirty();
            }}
            className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            placeholder="Short helper line"
          />
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
          <p className="text-[11px] text-gray-400 mt-1">
            Pick a city to limit this row to users there. Global sections
            appear for every customer.
          </p>
        </div>

        {allowsCategoryEdit && (
          <>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Category
              </label>
              <select
                value={categoryIdState}
                onChange={(e) => {
                  setCategoryIdState(e.target.value);
                  setSubcategoryIdState('');
                  markDirty();
                }}
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
              >
                <option value="">Select category</option>
                {(categories || []).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Subcategory (optional)
              </label>
              <select
                value={subcategoryIdState}
                onChange={(e) => {
                  setSubcategoryIdState(e.target.value);
                  markDirty();
                }}
                disabled={!categoryIdState}
                className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400 disabled:opacity-50"
              >
                <option value="">All in category</option>
                {(subcategories || []).map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Drill down to one subcategory, or leave blank to show all
                businesses in the category.
              </p>
            </div>
          </>
        )}

        {allowsBanner && (
          <div onChange={markDirty}>
            <ImageUpload
              value={bannerUrl}
              onChange={(url) => {
                setBannerUrl(url || '');
                markDirty();
              }}
              folder="home-sections/banners"
              label="Banner image (optional)"
              helpText="Landscape image, shown above the row. JPEG/PNG, max 5MB."
              maxSizeMB={5}
            />
          </div>
        )}

        {allowsBusinessIds && (
          <BusinessMultiSelect
            value={businessIds}
            onChange={(ids) => {
              setBusinessIds(ids);
              markDirty();
            }}
            locationFilter={locationId}
          />
        )}

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
