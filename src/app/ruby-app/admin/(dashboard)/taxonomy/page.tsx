'use client';

import { useState } from 'react';
import { Plus, Search, FolderTree, Tag, Layers, Eye, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, type Column } from '@/components/ui';
import type { CategoryGroup, CategoryGroupType, Category, Subcategory, CreateCategoryRequest, CreateSubcategoryRequest, Location } from '@/lib/types';

type Tab = 'groups' | 'categories' | 'subcategories' | 'location-config';

export default function TaxonomyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('categories');

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'groups', label: 'Groups', icon: Layers },
    { key: 'categories', label: 'Categories', icon: FolderTree },
    { key: 'subcategories', label: 'Subcategories', icon: Tag },
    { key: 'location-config', label: 'Location Config', icon: Eye },
  ];

  return (
    <div>
      <PageHeader
        title="Taxonomy"
        description="Manage category groups, categories, and subcategories"
      />

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'groups' && <GroupsTab />}
      {activeTab === 'categories' && <CategoriesTab />}
      {activeTab === 'subcategories' && <SubcategoriesTab />}
      {activeTab === 'location-config' && <LocationConfigTab />}
    </div>
  );
}

// ============================================================
// Groups Tab
// ============================================================
function GroupsTab() {
  const { data: groups, isLoading, refetch } = useApi<CategoryGroup[]>(() => api.categoryGroups.list(), []);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{ name: string; slug: string; type: CategoryGroupType; order: number }>({ name: '', slug: '', type: 'TOP_TILES', order: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.categoryGroups.create({ ...form, isActive: true });
      toast.success('Group created');
      setShowCreate(false);
      setForm({ name: '', slug: '', type: 'TOP_TILES', order: 0 });
      refetch();
    } catch {
      toast.error('Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<CategoryGroup>[] = [
    { key: 'name', header: 'Name', render: (g) => <span className="font-medium">{g.name}</span> },
    { key: 'slug', header: 'Slug', render: (g) => <span className="font-mono text-xs text-gray-500">{g.slug}</span> },
    { key: 'type', header: 'Type', render: (g) => <span className="badge-neutral">{g.type}</span> },
    { key: 'order', header: 'Order', render: (g) => <span>{g.order}</span> },
    { key: 'status', header: 'Status', render: (g) => <StatusBadge status={g.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowCreate(true)} className="btn-primary btn-sm gap-1.5"><Plus className="w-4 h-4" /> Add Group</button>
      </div>
      <DataTable columns={columns} data={groups || []} isLoading={isLoading} emptyMessage="No category groups." />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Category Group" size="sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="label-text">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="input-field" required /></div>
          <div><label className="label-text">Slug</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input-field" required /></div>
          <div><label className="label-text">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CategoryGroupType })} className="input-field"><option value="TOP_TILES">TOP_TILES</option><option value="MORE">MORE</option><option value="HIDDEN">HIDDEN</option></select></div>
          <div><label className="label-text">Order</label><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="input-field" /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary btn-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary btn-sm">{isSubmitting ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================
// Categories Tab
// ============================================================
function CategoriesTab() {
  const { data: categories, isLoading, refetch } = useApi<Category[]>(() => api.categories.list(), []);
  const { data: groups } = useApi<CategoryGroup[]>(() => api.categoryGroups.list(), []);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateCategoryRequest>({
    slug: '', titles: { en: '' }, groupId: '', businessType: 'BOTH', order: 0, isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.categories.create(form);
      toast.success('Category created');
      setShowCreate(false);
      refetch();
    } catch {
      toast.error('Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Category>[] = [
    { key: 'title', header: 'Title', render: (c) => <span className="font-medium">{c.titles?.en || c.slug}</span> },
    { key: 'slug', header: 'Slug', render: (c) => <span className="font-mono text-xs text-gray-500">{c.slug}</span> },
    { key: 'type', header: 'Business Type', render: (c) => <span className="badge-neutral">{c.businessType}</span> },
    { key: 'group', header: 'Group', render: (c) => <span className="text-gray-500">{groups?.find(g => g._id === c.groupId)?.name || c.groupId}</span> },
    { key: 'order', header: 'Order', render: (c) => <span>{c.order}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowCreate(true)} className="btn-primary btn-sm gap-1.5"><Plus className="w-4 h-4" /> Add Category</button>
      </div>
      <DataTable columns={columns} data={categories || []} isLoading={isLoading} emptyMessage="No categories." />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Category" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="label-text">Title (English)</label><input value={form.titles.en || ''} onChange={(e) => setForm({ ...form, titles: { ...form.titles, en: e.target.value }, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="input-field" required /></div>
          <div><label className="label-text">Slug</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input-field" required /></div>
          <div><label className="label-text">Group</label><select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} className="input-field" required><option value="">Select group…</option>{groups?.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-text">Business Type</label><select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value as 'SHOPPING' | 'SERVICE' | 'BOTH' })} className="input-field"><option value="BOTH">Both</option><option value="SHOPPING">Shopping</option><option value="SERVICE">Service</option></select></div>
            <div><label className="label-text">Order</label><input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="input-field" /></div>
          </div>
          <div><label className="label-text">Icon Key (optional)</label><input value={form.iconKey || ''} onChange={(e) => setForm({ ...form, iconKey: e.target.value })} className="input-field" placeholder="e.g. utensils" /></div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary btn-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary btn-sm">{isSubmitting ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================
// Subcategories Tab
// ============================================================
function SubcategoriesTab() {
  const { data: subcategories, isLoading, refetch } = useApi<Subcategory[]>(() => api.subcategories.list(), []);
  const { data: categories } = useApi<Category[]>(() => api.categories.list(), []);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateSubcategoryRequest>({
    categoryId: '', slug: '', titles: { en: '' }, order: 0, isActive: true, synonyms: [],
  });
  const [synonymInput, setSynonymInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.subcategories.create(form);
      toast.success('Subcategory created');
      setShowCreate(false);
      refetch();
    } catch {
      toast.error('Failed to create subcategory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Subcategory>[] = [
    { key: 'title', header: 'Title', render: (s) => <span className="font-medium">{s.titles?.en || s.slug}</span> },
    { key: 'category', header: 'Category', render: (s) => <span className="text-gray-500">{categories?.find(c => c._id === s.categoryId)?.titles?.en || s.categoryId}</span> },
    { key: 'risk', header: 'Risk Tier', render: (s) => s.riskTier ? <span className={`badge ${s.riskTier === 'HIGH' ? 'badge-danger' : s.riskTier === 'MEDIUM' ? 'badge-warning' : 'badge-success'}`}>{s.riskTier}</span> : <span className="text-gray-400">—</span> },
    { key: 'synonyms', header: 'Synonyms', render: (s) => <span className="text-xs text-gray-500">{s.synonyms?.join(', ') || '—'}</span> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowCreate(true)} className="btn-primary btn-sm gap-1.5"><Plus className="w-4 h-4" /> Add Subcategory</button>
      </div>
      <DataTable columns={columns} data={subcategories || []} isLoading={isLoading} emptyMessage="No subcategories." />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Subcategory" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="label-text">Title (English)</label><input value={form.titles.en || ''} onChange={(e) => setForm({ ...form, titles: { ...form.titles, en: e.target.value }, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="input-field" required /></div>
          <div><label className="label-text">Category</label><select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input-field" required><option value="">Select…</option>{categories?.map(c => <option key={c._id} value={c._id}>{c.titles?.en || c.slug}</option>)}</select></div>
          <div><label className="label-text">Risk Tier</label><select value={form.riskTier || ''} onChange={(e) => setForm({ ...form, riskTier: (e.target.value || undefined) as 'LOW' | 'MEDIUM' | 'HIGH' | undefined })} className="input-field"><option value="">None</option><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></div>
          <div>
            <label className="label-text">Synonyms</label>
            <div className="flex gap-2">
              <input value={synonymInput} onChange={(e) => setSynonymInput(e.target.value)} className="input-field flex-1" placeholder="Add synonym" />
              <button type="button" onClick={() => { if (synonymInput.trim()) { setForm({ ...form, synonyms: [...(form.synonyms || []), synonymInput.trim()] }); setSynonymInput(''); } }} className="btn-secondary btn-sm">Add</button>
            </div>
            {form.synonyms && form.synonyms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.synonyms.map((s, i) => <span key={i} className="badge-neutral cursor-pointer" onClick={() => setForm({ ...form, synonyms: form.synonyms?.filter((_, j) => j !== i) })}>{s} ✕</span>)}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary btn-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary btn-sm">{isSubmitting ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================
// Location Config Tab
// ============================================================
function LocationConfigTab() {
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const { data: locations } = useApi<Location[]>(() => api.locations.list({ status: 'ACTIVE' }), []);
  const { data: configs, isLoading } = useApi(
    () => api.locationCategoryConfig.list(selectedLocationId),
    [selectedLocationId],
    { enabled: !!selectedLocationId }
  );
  const { data: categories } = useApi<Category[]>(() => api.categories.list(), []);

  const handleToggle = async (categoryId: string, isActive: boolean) => {
    try {
      await api.locationCategoryConfig.upsert({ locationId: selectedLocationId, categoryId, isActive });
      toast.success(`Category ${isActive ? 'enabled' : 'disabled'} for location`);
    } catch {
      toast.error('Failed to update config');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <label className="label-text">Select Location</label>
        <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} className="input-field max-w-xs">
          <option value="">Choose a location…</option>
          {locations?.map(l => <option key={l._id} value={l._id}>{l.name} ({l.countryCode})</option>)}
        </select>
      </div>

      {selectedLocationId ? (
        <div className="card divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading config…</div>
          ) : categories?.length ? (
            categories.map(cat => {
              const config = Array.isArray(configs) ? configs.find((c: { categoryId: string }) => c.categoryId === cat._id) : undefined;
              const active = config ? config.isActive : false;
              return (
                <div key={cat._id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="font-medium text-sm">{cat.titles?.en || cat.slug}</span>
                    <span className="text-xs text-gray-400 ml-2">{cat.businessType}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => handleToggle(cat._id, !active)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ruby-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-ruby-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-sm text-gray-400">No categories to configure.</div>
          )}
        </div>
      ) : (
        <div className="card p-12 text-center text-sm text-gray-400">
          Select a location to configure its categories.
        </div>
      )}
    </div>
  );
}
