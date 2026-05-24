'use client';

/**
 * Admin: Customer-app Home Sections.
 *
 * Every row below is a band on the customer's mobile home screen.
 * Admins drag to reorder, toggle the eye to hide, click to edit.
 * Real-time socket: changes go live in the customer app within a
 * second of save — no publish step.
 *
 * Two-pane layout on desktop: section list on the left, live iPhone-
 * frame preview on the right. Stacked on tablet/mobile.
 *
 * This file is the composition root. All the heavy lifting lives in
 * the sibling _components/ folder:
 *   - section-list / section-card → DnD-kit drag + drop, accessible
 *   - section-edit-drawer         → right-side editor (URL-routable)
 *   - add-subcategory-drawer      → focused subcategory pin flow
 *   - type-picker-modal           → 2×2 grid that funnels "Add"
 *   - intro-hero / empty-state    → onboarding + recovery surfaces
 *   - live-preview                → faux iPhone home screen
 *   - business-multi-select       → DnD-ordered curated picker
 */

import { useCallback, useMemo, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { useHomeSectionsAdminSocket } from '@/lib/hooks/useHomeSectionsAdminSocket';
import type {
  HomeSection,
  HomeSectionType,
  Location,
  UpdateHomeSectionRequest,
} from '@/lib/types';

import { IntroHero } from './_components/intro-hero';
import { EmptyState } from './_components/empty-state';
import { SectionList } from './_components/section-list';
import { TypePickerModal } from './_components/type-picker-modal';
import { SectionEditDrawer } from './_components/section-edit-drawer';
import { AddSubcategoryDrawer } from './_components/add-subcategory-drawer';
import { LivePreview } from './_components/live-preview';

type DrawerState =
  | { kind: 'closed' }
  | { kind: 'pick-type' }
  | { kind: 'add-subcategory' }
  | { kind: 'create-curated' }
  | { kind: 'edit'; section: HomeSection };

export default function HomeSectionsPage() {
  const [drawer, setDrawer] = useState<DrawerState>({ kind: 'closed' });
  // Preview/filter location — drives both the list filter (which
  // sections an admin sees) and the live-preview render.
  const [previewLocationId, setPreviewLocationId] = useState('');
  // Local "optimistic" copy of the section list. We mutate this
  // immediately on drag-end / toggle-active so the UI feels instant;
  // the server confirmation reconciles us on socket event.
  const [localSections, setLocalSections] = useState<HomeSection[] | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const {
    data: sections,
    isLoading,
    refetch,
  } = useApi<HomeSection[]>(
    () =>
      api.homeSections.list({
        locationId: previewLocationId || undefined,
      }),
    [previewLocationId],
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

  // Realtime: any admin (this tab or another) makes a change, the
  // gateway broadcasts and we refetch. The mobile customers receive
  // the same event in parallel via their own socket subscription.
  useHomeSectionsAdminSocket(() => {
    // Drop the optimistic copy so the server's truth wins.
    setLocalSections(null);
    refetch();
  });

  // The list we actually render — local optimistic copy if present,
  // server data otherwise. Recompute when either changes.
  const displaySections = useMemo(
    () => localSections ?? sections ?? [],
    [localSections, sections],
  );

  // Set of types already present, used by the type-picker to grey out
  // single-row types (REVIEWS / WHATS_HOT) that already exist.
  const existingTypes: HomeSectionType[] = useMemo(
    () =>
      Array.from(new Set((sections ?? []).map((s) => s.type))) as HomeSectionType[],
    [sections],
  );

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleToggleActive = useCallback(
    async (s: HomeSection) => {
      setTogglingId(s._id);
      // Optimistic: flip the local row immediately.
      const next = (localSections ?? sections ?? []).map((row) =>
        row._id === s._id ? { ...row, isActive: !row.isActive } : row,
      );
      setLocalSections(next);

      const result = await updateSection({
        id: s._id,
        data: { isActive: !s.isActive },
      });
      setTogglingId(null);
      if (result !== null) {
        toast.success(
          `"${s.title}" ${!s.isActive ? 'shown on home' : 'hidden'}`,
        );
        // Socket will reconcile us. If for some reason it doesn't,
        // the next user-driven action will refetch.
      } else {
        // Revert on failure.
        setLocalSections(null);
        refetch();
      }
    },
    [localSections, sections, updateSection, refetch],
  );

  const handleDelete = useCallback(
    async (s: HomeSection) => {
      if (!confirm(`Delete "${s.title}"? This is permanent.`)) return;
      // Optimistic remove
      const next = (localSections ?? sections ?? []).filter(
        (row) => row._id !== s._id,
      );
      setLocalSections(next);

      const result = await deleteSection(s._id);
      if (result !== null) {
        toast.success('Section deleted');
        // Socket reconcile arrives shortly.
      } else {
        setLocalSections(null);
        refetch();
      }
    },
    [localSections, sections, deleteSection, refetch],
  );

  const handleReorder = useCallback(
    async (next: HomeSection[]) => {
      // Optimistic UI — show the new order instantly. We reassign
      // displayOrder based on array position so the server-side numbers
      // stay tight (no integer gaps).
      const withOrder = next.map((s, idx) => ({ ...s, displayOrder: idx }));
      setLocalSections(withOrder);
      setReordering(true);

      const result = await reorder({
        items: withOrder.map((s) => ({
          id: s._id,
          displayOrder: s.displayOrder,
        })),
      });
      setReordering(false);
      if (result !== null) {
        // Socket reconcile is on its way. Toast lightly so the admin
        // knows the persist landed without spamming on every drag.
        toast.success('Order saved', { duration: 1500 });
      } else {
        setLocalSections(null);
        refetch();
      }
    },
    [reorder, refetch],
  );

  const handleEdit = useCallback((s: HomeSection) => {
    setDrawer({ kind: 'edit', section: s });
  }, []);

  const handleAddClick = () => setDrawer({ kind: 'pick-type' });

  const handleTypePicked = async (kind: 'subcategory' | 'curated' | 'events') => {
    if (kind === 'events') {
      // Phase 40 — EVENTS sections have no per-section config; create
      // directly via API with sensible defaults.
      try {
        await api.homeSections.create({
          type: 'EVENTS' as any,
          title: 'Events in {locationName}',
          displayOrder: 100,
          isActive: true,
        } as any);
        afterSaved();
      } catch (e: any) {
        alert(e?.message || 'Failed to create Events section');
      }
      return;
    }
    setDrawer(kind === 'subcategory' ? { kind: 'add-subcategory' } : { kind: 'create-curated' });
  };

  const closeDrawer = () => setDrawer({ kind: 'closed' });

  const afterSaved = () => {
    closeDrawer();
    setLocalSections(null);
    refetch();
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <PageHeader
        title="Home sections"
        description="The customer-app home screen. Drag to reorder, toggle to hide, click a row to edit. Changes go live instantly."
        action={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                Preview as user in
              </label>
              <select
                value={previewLocationId}
                onChange={(e) => setPreviewLocationId(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
              >
                <option value="">All locations</option>
                {(locations || []).map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700"
            >
              <Plus className="w-4 h-4" />
              Add section
            </button>
          </div>
        }
      />

      <IntroHero />

      {/* Mobile location selector (visible <sm where it's not in the header) */}
      <div className="sm:hidden card p-3">
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Preview as user in
        </label>
        <select
          value={previewLocationId}
          onChange={(e) => setPreviewLocationId(e.target.value)}
          className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
        >
          <option value="">All locations</option>
          {(locations || []).map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* List pane */}
        <div className="min-w-0">
          {isLoading && !sections ? (
            <div className="card p-8 flex items-center justify-center text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading sections…
            </div>
          ) : displaySections.length === 0 ? (
            <EmptyState
              onAdd={handleAddClick}
              onAfterSeed={() => {
                setLocalSections(null);
                refetch();
              }}
            />
          ) : (
            <>
              <SectionList
                sections={displaySections}
                onReorder={handleReorder}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                togglingId={togglingId}
              />
              {reordering && (
                <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving new order…
                </div>
              )}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleAddClick}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-sm text-ruby-700 bg-ruby-50/60 hover:bg-ruby-50 border border-dashed border-ruby-200 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  Add another section
                </button>
              </div>
            </>
          )}
        </div>

        {/* Live preview pane */}
        <LivePreview
          sections={displaySections}
          previewLocationId={previewLocationId}
          locations={locations}
        />
      </div>

      {/* Type picker — first step of any add flow */}
      <TypePickerModal
        isOpen={drawer.kind === 'pick-type'}
        onClose={closeDrawer}
        existingTypes={existingTypes}
        onPick={handleTypePicked}
      />

      {/* Add Subcategory drawer */}
      <AddSubcategoryDrawer
        isOpen={drawer.kind === 'add-subcategory'}
        onClose={closeDrawer}
        onSaved={afterSaved}
      />

      {/* Create CURATED / Edit any drawer.
          `key` ensures the form state re-initialises whenever we switch
          between modes (create→edit or edit→another section) without
          manually resetting every useState. */}
      <SectionEditDrawer
        key={
          drawer.kind === 'edit'
            ? `edit-${drawer.section._id}`
            : drawer.kind === 'create-curated'
              ? 'create-curated'
              : 'closed'
        }
        isOpen={drawer.kind === 'edit' || drawer.kind === 'create-curated'}
        mode={drawer.kind === 'edit' ? 'edit' : 'create-curated'}
        section={drawer.kind === 'edit' ? drawer.section : null}
        onClose={closeDrawer}
        onSaved={afterSaved}
      />
    </div>
  );
}
