'use client';

/**
 * Admin: Customer-app home sections.
 *
 * Each row corresponds to a band on the customer's home screen.
 * "System" rows (REVIEWS / WHATS_HOT / CATEGORY) are seeded at boot and
 * stay auto-populated — admins only toggle visibility, edit labels, or
 * change order. "Curated" rows are admin-created and the admin manually
 * picks the businesses inside.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  MapPin,
  Check,
  X as XIcon,
  Loader2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, Modal, ImageUpload } from '@/components/ui';
import type {
  HomeSection,
  HomeSectionType,
  CreateHomeSectionRequest,
  UpdateHomeSectionRequest,
  Business,
  Category,
  Subcategory,
  Location,
} from '@/lib/types';

const TYPE_STYLES: Record<HomeSectionType, string> = {
  REVIEWS: 'bg-purple-50 text-purple-700 border-purple-200',
  WHATS_HOT: 'bg-amber-50 text-amber-700 border-amber-200',
  CATEGORY: 'bg-blue-50 text-blue-700 border-blue-200',
  CURATED: 'bg-green-50 text-green-700 border-green-200',
};

const TYPE_LABELS: Record<HomeSectionType, string> = {
  REVIEWS: 'Reviews',
  WHATS_HOT: "What's Hot",
  CATEGORY: 'Category',
  CURATED: 'Curated',
};

const isSystemType = (t: HomeSectionType) => t !== 'CURATED';

export default function HomeSectionsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [addSubcatOpen, setAddSubcatOpen] = useState(false);
  const [editing, setEditing] = useState<HomeSection | null>(null);
  const [locationFilter, setLocationFilter] = useState('');

  const {
    data: sections,
    isLoading,
    refetch,
  } = useApi<HomeSection[]>(
    () =>
      api.homeSections.list({
        locationId: locationFilter || undefined,
      }),
    [locationFilter],
  );

  const { data: locations } = useApi<Location[]>(
    () => api.locations.list({ limit: 100 }),
    [],
  );

  const { mutate: updateSection } = useMutation<
    HomeSection,
    { id: string; data: UpdateHomeSectionRequest }
  >(({ id, data }) => api.homeSections.update(id, data));

  const { mutate: deleteSection } = useMutation<{ deleted: true }, string>(
    (id) => api.homeSections.delete(id),
  );

  const { mutate: reorder } = useMutation<
    { updated: number },
    { items: Array<{ id: string; displayOrder: number }> }
  >((data) => api.homeSections.reorder(data));

  const toggleActive = async (s: HomeSection) => {
    const r = await updateSection({
      id: s._id,
      data: { isActive: !s.isActive },
    });
    if (r !== null) {
      toast.success(`"${s.title}" ${!s.isActive ? 'enabled' : 'disabled'}`);
      refetch();
    }
  };

  const handleDelete = async (s: HomeSection) => {
    if (!confirm(`Delete "${s.title}"? This is permanent.`)) return;
    const r = await deleteSection(s._id);
    if (r !== null) {
      toast.success('Section deleted');
      refetch();
    }
  };

  const moveUp = async (idx: number) => {
    if (!sections || idx === 0) return;
    const a = sections[idx];
    const b = sections[idx - 1];
    const r = await reorder({
      items: [
        { id: a._id, displayOrder: b.displayOrder },
        { id: b._id, displayOrder: a.displayOrder },
      ],
    });
    if (r !== null) refetch();
  };

  const moveDown = async (idx: number) => {
    if (!sections || idx >= sections.length - 1) return;
    const a = sections[idx];
    const b = sections[idx + 1];
    const r = await reorder({
      items: [
        { id: a._id, displayOrder: b.displayOrder },
        { id: b._id, displayOrder: a.displayOrder },
      ],
    });
    if (r !== null) refetch();
  };

  const getLocationLabel = (locationId: HomeSection['locationId']) => {
    if (!locationId) return 'Global';
    if (typeof locationId === 'object') return locationId.name;
    return 'Location';
  };

  const getCategoryLabel = (s: HomeSection) => {
    if (!s.categoryId) return null;
    const catName =
      typeof s.categoryId === 'object' ? s.categoryId.name : null;
    if (!catName) return null;
    const subName =
      s.subcategoryId && typeof s.subcategoryId === 'object'
        ? s.subcategoryId.name
        : null;
    return subName ? `${catName} → ${subName}` : catName;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Home sections"
        description="Customer-app home screen layout. Toggle, reorder, or add subcategory and curated sections."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddSubcatOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700"
              title="Add a row pinned to one subcategory (e.g. Plumbers, Cleaners)"
            >
              <Plus className="w-4 h-4" />
              Add subcategory
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              title="Hand-pick the businesses that appear in this row"
            >
              <Plus className="w-4 h-4" />
              Curated section
            </button>
          </div>
        }
      />

      {/* Location filter — preview what users in a given location see */}
      <div className="card p-4">
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Preview as user in location
        </label>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="w-full sm:w-64 mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
        >
          <option value="">All sections (admin view)</option>
          {(locations || []).map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-400 mt-1.5">
          Filter narrows the list to sections that would appear for a user in
          this location (location-scoped + global).
        </p>
      </div>

      {/* Sections table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10"></th>
                {['Title', 'Type', 'Location', 'Items', 'Active', ''].map(
                  (h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Loading…
                  </td>
                </tr>
              ) : !sections || sections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No sections yet. The default ones should auto-seed on backend boot.
                  </td>
                </tr>
              ) : (
                sections.map((s, idx) => (
                  <tr key={s._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-2">
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveDown(idx)}
                          disabled={idx === sections.length - 1}
                          className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {s.bannerUrl && (
                          <img
                            src={s.bannerUrl}
                            alt=""
                            className="w-8 h-8 rounded object-cover ring-1 ring-gray-200 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {s.title}
                          </div>
                          {s.subtitle && (
                            <div className="text-xs text-gray-500 truncate">
                              {s.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded border ${TYPE_STYLES[s.type]}`}
                      >
                        {TYPE_LABELS[s.type]}
                      </span>
                      {getCategoryLabel(s) && (
                        <div className="text-[10px] text-gray-500 mt-1">
                          → {getCategoryLabel(s)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {getLocationLabel(s.locationId)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {s.type === 'CURATED' ? (
                        <span className="text-sm">
                          {s.businessIds?.length ?? 0}
                          <span className="text-gray-400 text-xs ml-1">
                            businesses
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Auto-populated</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(s)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                          s.isActive
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {s.isActive ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Hidden
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditing(s)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 mr-1"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {s.type === 'CURATED' && (
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1.5 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit / Add Subcategory modals */}
      {addSubcatOpen && (
        <AddSubcategoryModal
          onClose={() => setAddSubcatOpen(false)}
          onSuccess={() => {
            setAddSubcatOpen(false);
            refetch();
          }}
        />
      )}
      {createOpen && (
        <HomeSectionModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            refetch();
          }}
        />
      )}
      {editing && (
        <HomeSectionModal
          mode="edit"
          section={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

// ─── Create / Edit Modal ───────────────────────────────────────────────

function HomeSectionModal({
  mode,
  section,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  section?: HomeSection;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = mode === 'edit' && !!section;
  const isSystem = isEdit && isSystemType(section!.type);
  const isCategory = isEdit && section?.type === 'CATEGORY';
  const allowsBusinessIds = isEdit ? section?.type === 'CURATED' : true;
  const allowsBanner = isEdit ? section?.type === 'CURATED' : true;
  const allowsCategoryEdit = isCategory;

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

  const { data: locations } = useApi<Location[]>(
    () => api.locations.list({ limit: 100 }),
    [],
  );
  const { data: categories } = useApi<Category[]>(
    () => api.categories.list(),
    [],
  );
  // Subcategories of the currently-picked category — refetches when the
  // admin changes the category dropdown so the drill-down list stays in
  // sync. CATEGORY-type sections only.
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
      if (mode === 'create') {
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
      } else {
        const payload: UpdateHomeSectionRequest = {
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          locationId: locationId || (null as any),
          isActive,
        };
        if (allowsBusinessIds) payload.businessIds = businessIds;
        if (allowsBanner) payload.bannerUrl = bannerUrl || undefined;
        if (allowsCategoryEdit && categoryIdState) {
          payload.categoryId = categoryIdState;
          // Empty string clears the drill-down on the backend.
          payload.subcategoryId = subcategoryIdState || '';
        }
        await api.homeSections.update(section!._id, payload);
        toast.success('Section updated');
      }
      onSuccess();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to save section');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === 'create' ? 'New curated section' : `Edit: ${section?.title}`}
      subtitle={
        isSystem
          ? 'System section — only label, location, and visibility are editable.'
          : 'Curated sections appear on the customer-app home screen.'
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Title *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            placeholder='e.g. "Curated Lagos Experiences"'
          />
          {section?.type === 'WHATS_HOT' && (
            <p className="text-[11px] text-gray-400 mt-1">
              Use {'{locationName}'} to substitute the user's current location at render time.
            </p>
          )}
        </div>

        {/* Subtitle */}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Subtitle (optional)
          </label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            placeholder="Short helper line"
          />
        </div>

        {/* Location scope */}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Location scope
          </label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
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

        {/* Category — CATEGORY-type sections only */}
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
                  // Reset subcategory whenever category changes — picking
                  // a subcategory from the previous category would be invalid.
                  setSubcategoryIdState('');
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
                onChange={(e) => setSubcategoryIdState(e.target.value)}
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
                Pick a subcategory to drill down (e.g. "Plumbing" within Home Services). Leave blank to show all businesses in the category.
              </p>
            </div>
          </>
        )}

        {/* Banner image — CURATED only */}
        {allowsBanner && (
          <ImageUpload
            value={bannerUrl}
            onChange={(url) => setBannerUrl(url || '')}
            folder="home-sections/banners"
            label="Banner image (optional)"
            helpText="Landscape image, shown above the row. JPEG/PNG, max 5MB."
            maxSizeMB={5}
          />
        )}

        {/* Business multi-select — CURATED only */}
        {allowsBusinessIds && (
          <BusinessMultiSelect
            value={businessIds}
            onChange={setBusinessIds}
            locationFilter={locationId}
          />
        )}

        {/* Active */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500"
          />
          <span className="text-sm text-gray-700">
            Section is active (visible on the home screen)
          </span>
        </label>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ruby-600 text-white text-sm font-medium rounded-lg hover:bg-ruby-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {submitting ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Inline business multi-select ─────────────────────────────────────

function BusinessMultiSelect({
  value,
  onChange,
  locationFilter,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  locationFilter?: string;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: candidates } = useApi<Business[]>(
    () =>
      api.businesses.list({
        search: debouncedSearch || undefined,
        locationId: locationFilter || undefined,
        status: 'LIVE',
        limit: 25,
      }),
    [debouncedSearch, locationFilter],
  );

  // Resolve selected businesses' display data — separate fetch so the row
  // shows even when the search box is filtered to something else.
  const { data: selectedBusinesses } = useApi<Business[]>(
    () =>
      value.length > 0
        ? api.businesses.list({ ids: value.join(','), limit: 50 } as any)
        : Promise.resolve({ success: true, data: [] }),
    [value.join(',')],
  );

  const isSelected = (id: string) => value.includes(id);

  const add = (id: string) => {
    if (!value.includes(id)) onChange([...value, id]);
  };
  const remove = (id: string) => onChange(value.filter((x) => x !== id));
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...value];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };
  const moveDown = (idx: number) => {
    if (idx === value.length - 1) return;
    const next = [...value];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  // Compose ordered selected list using selectedBusinesses for display data.
  const ordered = useMemo(() => {
    const lookup = new Map<string, Business>();
    (selectedBusinesses || []).forEach((b) => lookup.set(b._id, b));
    (candidates || []).forEach((b) => {
      if (!lookup.has(b._id)) lookup.set(b._id, b);
    });
    return value
      .map((id) => lookup.get(id))
      .filter(Boolean) as Business[];
  }, [value, selectedBusinesses, candidates]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Businesses in this section
        </label>
        <span className="text-[11px] text-gray-400">
          {value.length} selected · max 50
        </span>
      </div>

      {/* Selected — ordered + reorderable */}
      {ordered.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-3 divide-y divide-gray-100">
          {ordered.map((b, idx) => (
            <div
              key={b._id}
              className="flex items-center gap-2 px-3 py-2 bg-white"
            >
              <span className="text-xs font-mono text-gray-400 w-6 text-center shrink-0">
                {idx + 1}
              </span>
              {b.logoUrl && (
                <img
                  src={b.logoUrl}
                  alt=""
                  className="w-7 h-7 rounded object-cover ring-1 ring-gray-200 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {b.name}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {typeof b.locationId === 'object'
                    ? b.locationId.name
                    : 'Location'}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === ordered.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => remove(b._id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Remove"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + add */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search live businesses…"
          className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
        />
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden mt-2 max-h-64 overflow-y-auto divide-y divide-gray-100">
        {(candidates || []).length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-gray-400">
            {debouncedSearch ? 'No matches' : 'Start typing to search'}
          </div>
        ) : (
          (candidates || []).map((b) => {
            const sel = isSelected(b._id);
            return (
              <button
                key={b._id}
                onClick={() => (sel ? remove(b._id) : add(b._id))}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  sel ? 'bg-green-50' : 'hover:bg-gray-50'
                }`}
              >
                {b.logoUrl ? (
                  <img
                    src={b.logoUrl}
                    alt=""
                    className="w-7 h-7 rounded object-cover ring-1 ring-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded bg-gray-100 ring-1 ring-gray-200 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-900 truncate">
                    {b.name}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {typeof b.locationId === 'object'
                      ? b.locationId.name
                      : 'Location'}
                  </div>
                </div>
                {sel && (
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Add Subcategory Modal ─────────────────────────────────────────────
//
// Focused single-purpose modal for the most common admin task: pin one
// subcategory as a home-screen row. The admin picks a subcategory from
// a flat searchable list (cross-category) — title autofills from the
// subcategory name, parent category is derived automatically.

function AddSubcategoryModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState('');
  const [pickedSubId, setPickedSubId] = useState('');
  const [title, setTitle] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  // When admin picks a subcategory, autofill the title with its name.
  // They can override before saving.
  useEffect(() => {
    if (picked && !title) {
      setTitle(picked.name);
    }
    // Don't overwrite a manually-edited title on subsequent pick changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?._id]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return subs || [];
    return (subs || []).filter((s) => {
      const name = s.name?.toLowerCase() || '';
      const catName =
        typeof s.categoryId === 'object' ? s.categoryId.name?.toLowerCase() || '' : '';
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
      onSuccess();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to create section');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Add subcategory section"
      subtitle="Pin one subcategory as a row on the customer-app home screen."
      size="lg"
    >
      <div className="space-y-4">
        {/* Subcategory picker */}
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
          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                {search ? 'No matches' : 'Loading…'}
              </div>
            ) : (
              filtered.map((s) => {
                const sel = s._id === pickedSubId;
                return (
                  <button
                    key={s._id}
                    onClick={() => setPickedSubId(s._id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                      sel ? 'bg-green-50' : 'hover:bg-gray-50'
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
                      <Check className="w-4 h-4 text-green-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Title — autofills from subcategory, editable */}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Section title *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
            placeholder='e.g. "Top Plumbers in Lagos"'
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Auto-fills from the subcategory name. Edit to add flair (e.g. "Top
            Plumbers in {`{locationName}`}" — supports location substitution).
          </p>
        </div>

        {/* Location scope */}
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Location scope
          </label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
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

        {/* Active */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500"
          />
          <span className="text-sm text-gray-700">
            Section is active (visible on the home screen)
          </span>
        </label>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
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
      </div>
    </Modal>
  );
}
