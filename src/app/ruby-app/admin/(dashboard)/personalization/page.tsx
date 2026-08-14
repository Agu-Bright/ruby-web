'use client';

import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Layers, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApi, useMutation } from '@/lib/hooks';
import { Modal, PageHeader } from '@/components/ui';
import type {
  PersonalizationTile,
  CreatePersonalizationTilePayload,
  Subcategory,
} from '@/lib/types';

/**
 * P158 — Personalization Tiles admin page.
 *
 * Manages the catalogue of tiles rendered in the customer app's
 * onboarding "What do you use Ruby for?" picker. Each tile carries a
 * marketing label + one or more taxonomy subcategory slugs; when a
 * user picks a tile, the customer home tab reorders admin-managed
 * home sections so the sections whose category slug intersects the
 * picked subcategorySlugs float to the top (Ruby Select + Reviews
 * stay pinned above).
 *
 * SUPER_ADMIN only on the backend — this catalogue affects every
 * customer on the platform.
 */

type FormState = {
  title: string;
  iconKey: string;
  subcategorySlugs: string[];
  displayOrder: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  title: '',
  iconKey: '',
  subcategorySlugs: [],
  displayOrder: '0',
  isActive: true,
};

export default function PersonalizationTilesPage() {
  const {
    data: tiles,
    isLoading,
    refetch,
  } = useApi(() => api.personalizationTiles.list(), []);
  // Subcategories power the multi-select on the form. `limit: 500`
  // matches the admin taxonomy screen — we don't paginate here because
  // the picker needs the whole catalogue in a searchable UI.
  const { data: subcategoriesResp } = useApi(
    () => api.subcategories.list({ isActive: true, limit: 500 }),
    [],
  );
  const subcategoryOptions = useMemo<Subcategory[]>(() => {
    const raw: any = subcategoriesResp;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Subcategory[];
    if (Array.isArray(raw?.items)) return raw.items as Subcategory[];
    return [];
  }, [subcategoriesResp]);

  const create = useMutation(api.personalizationTiles.create);
  const update = useMutation((input: {
    id: string;
    data: CreatePersonalizationTilePayload;
  }) => api.personalizationTiles.update(input.id, input.data));
  const remove = useMutation(api.personalizationTiles.remove);

  const [editing, setEditing] = useState<PersonalizationTile | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [open, setOpen] = useState(false);
  const [subcatSearch, setSubcatSearch] = useState('');

  const filteredSubcats = useMemo(() => {
    const needle = subcatSearch.trim().toLowerCase();
    if (!needle) return subcategoryOptions;
    return subcategoryOptions.filter((s) =>
      `${s.name} ${s.slug}`.toLowerCase().includes(needle),
    );
  }, [subcategoryOptions, subcatSearch]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSubcatSearch('');
    setOpen(true);
  };

  const openEdit = (tile: PersonalizationTile) => {
    setEditing(tile);
    setForm({
      title: tile.title,
      iconKey: tile.iconKey,
      subcategorySlugs: tile.subcategorySlugs,
      displayOrder: String(tile.displayOrder),
      isActive: tile.isActive,
    });
    setSubcatSearch('');
    setOpen(true);
  };

  const toggleSubcat = (slug: string) => {
    setForm((prev) => {
      const has = prev.subcategorySlugs.includes(slug);
      return {
        ...prev,
        subcategorySlugs: has
          ? prev.subcategorySlugs.filter((s) => s !== slug)
          : [...prev.subcategorySlugs, slug],
      };
    });
  };

  const save = async () => {
    if (!form.title.trim() || !form.iconKey.trim()) {
      return toast.error('Title and icon are required');
    }
    const payload: CreatePersonalizationTilePayload = {
      title: form.title.trim(),
      iconKey: form.iconKey.trim(),
      subcategorySlugs: form.subcategorySlugs,
      displayOrder: Number(form.displayOrder) || 0,
      isActive: form.isActive,
    };
    const result = editing
      ? await update.mutate({ id: editing._id, data: payload })
      : await create.mutate(payload);
    if (result) {
      toast.success(editing ? 'Tile updated' : 'Tile created');
      setOpen(false);
      refetch();
    }
  };

  const del = async (tile: PersonalizationTile) => {
    if (!confirm(`Delete "${tile.title}"?`)) return;
    const result = await remove.mutate(tile._id);
    if (result) {
      toast.success('Tile deleted');
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personalization"
        description='Curate the tiles shown in the customer onboarding "What do you use Ruby for?" picker. Each tile bundles one or more taxonomy subcategories; a user pick reorders home-tab sections that match.'
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> New tile
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="p-4 w-12">
                  <GripVertical className="h-4 w-4" />
                </th>
                <th className="p-4">Tile</th>
                <th className="p-4">Icon</th>
                <th className="p-4">Subcategories</th>
                <th className="p-4">Order</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(tiles || []).map((tile) => (
                <tr key={tile._id} className="border-b last:border-0">
                  <td className="p-4 text-gray-400">
                    <Layers className="h-4 w-4" />
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-gray-900">{tile.title}</p>
                  </td>
                  <td className="p-4 text-gray-600">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                      {tile.iconKey}
                    </code>
                  </td>
                  <td className="p-4 text-gray-600">
                    {tile.subcategorySlugs.length === 0 ? (
                      <span className="text-amber-600 text-xs">
                        No subcategories — won't reorder anything
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {tile.subcategorySlugs.map((slug) => (
                          <span
                            key={slug}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-xs"
                          >
                            {slug}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-gray-600">{tile.displayOrder}</td>
                  <td className="p-4">
                    <span
                      className={
                        tile.isActive ? 'badge-success' : 'badge-neutral'
                      }
                    >
                      {tile.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(tile)}
                        className="icon-button"
                        aria-label="Edit tile"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => del(tile)}
                        className="icon-button text-red-500"
                        aria-label="Delete tile"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && (!tiles || tiles.length === 0) && (
          <div className="p-16 text-center text-gray-500">
            <Layers className="mx-auto mb-3 h-9 w-9 text-gray-300" />
            No personalization tiles yet. Add a few to power the customer
            onboarding picker.
          </div>
        )}
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit tile' : 'New tile'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Title
              <input
                className="input mt-1"
                value={form.title}
                maxLength={60}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Restaurants"
              />
            </label>
            <label className="block text-sm font-medium">
              Icon (Lucide name)
              <input
                className="input mt-1"
                value={form.iconKey}
                maxLength={40}
                onChange={(e) => setForm({ ...form, iconKey: e.target.value })}
                placeholder="e.g. Utensils, Music, Sparkles"
              />
              <span className="mt-1 block text-xs text-gray-500">
                Any name from{' '}
                <a
                  href="https://lucide.dev/icons/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-ruby-500 underline"
                >
                  lucide.dev/icons
                </a>{' '}
                (case-sensitive, e.g. <code>Utensils</code>).
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Subcategories this tile represents
              <span className="ml-2 text-xs font-normal text-gray-500">
                {form.subcategorySlugs.length} selected
              </span>
            </label>
            <input
              className="input mb-2"
              value={subcatSearch}
              onChange={(e) => setSubcatSearch(e.target.value)}
              placeholder="Search subcategories…"
            />
            <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 divide-y">
              {filteredSubcats.length === 0 && (
                <div className="p-3 text-sm text-gray-500">
                  No subcategories match.
                </div>
              )}
              {filteredSubcats.map((sub) => {
                const checked = form.subcategorySlugs.includes(sub.slug);
                return (
                  <label
                    key={sub._id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSubcat(sub.slug)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900">{sub.name}</div>
                      <div className="text-xs text-gray-500">{sub.slug}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Sections on the customer home whose category slug intersects
              any of these will float to the top when a user picks this
              tile. Leave empty for a "placeholder" tile that shows in
              the picker but doesn't reorder anything.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Display order
              <input
                className="input mt-1"
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) =>
                  setForm({ ...form, displayOrder: e.target.value })
                }
              />
              <span className="mt-1 block text-xs text-gray-500">
                Lower numbers appear first. Ties break by creation date.
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3 sm:mt-6">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              <span>
                <strong>Active</strong>
                <small className="block text-gray-500">
                  Off = hidden from the picker. Existing user picks keep their
                  reference; the reorder helper degrades gracefully.
                </small>
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={create.isLoading || update.isLoading}
              onClick={save}
            >
              {create.isLoading || update.isLoading
                ? 'Saving…'
                : editing
                ? 'Save changes'
                : 'Create tile'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
