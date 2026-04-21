'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  FolderTree, Tag, Layers, Eye, Pencil, Power, PowerOff, Plus, Search,
  RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Activity, Check, Briefcase, Settings, List,
  Package, MapPin, ShoppingBag, Calendar, X, AlertCircle, Hash, FileText,
  Rocket,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Modal, StatCard, StatusBadge, ImageUpload } from '@/components/ui';
import { FieldBuilder } from '@/components/ui/field-builder';
import type {
  CategoryGroup, CategoryGroupType, Category, Subcategory, Template,
  CreateCategoryRequest, CreateSubcategoryRequest, CreateCategoryGroupRequest,
  Location, BusinessModel,
} from '@/lib/types';

// ─── Config & Constants ────────────────────────────────────

type Tab = 'groups' | 'categories' | 'subcategories' | 'location-config';

const BUSINESS_MODEL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  ORDER_DELIVERY: { label: 'Order & Delivery', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Package },
  VISIT_ONLY: { label: 'Visit Only', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: MapPin },
  BOOKING_VISIT: { label: 'Booking & Visit', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: Calendar },
};

const GROUP_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  TOP_TILES: { label: 'Top Tiles', color: 'text-ruby-700', bg: 'bg-ruby-50', border: 'border-ruby-200' },
  MORE: { label: 'More', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  FEATURED: { label: 'Featured', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  SEASONAL: { label: 'Seasonal', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

const RISK_TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  LOW: { label: 'Low', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  MEDIUM: { label: 'Medium', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  HIGH: { label: 'High', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

const ICON_SUGGESTIONS: Record<string, string> = {
  restaurant: 'utensils', restaurants: 'utensils', dining: 'utensils',
  shopping: 'shopping-bag', shop: 'shopping-bag', boutique: 'shopping-bag',
  hotel: 'hotel', hotels: 'hotel', travel: 'plane',
  health: 'heart-pulse', wellness: 'heart-pulse', spa: 'sparkles',
  home: 'home', cleaning: 'spray-can', services: 'wrench',
  nightlife: 'moon', clubs: 'music', bars: 'wine',
  concierge: 'bell-concierge', professional: 'briefcase',
  arts: 'palette', entertainment: 'ticket', local: 'map-pin',
};

const DESCRIPTION_SUGGESTIONS: Record<string, string> = {
  restaurants: 'Discover local dining experiences',
  nightlife: 'Explore rooftop lounges, clubs, and beach bars',
  'health-wellness': 'Spas, gyms, salons, and wellness retreats',
  'home-services': 'Trusted cleaners, electricians, and plumbers',
  shopping: 'Boutique fashion and local artisan finds',
  'local-services': 'Tailors, laundry, car wash, and repairs',
  'professional-services': 'Legal, financial, and consulting services',
  'arts-entertainment': 'Galleries, live shows, and festivals',
  'hotels-travel': 'Hotels, shortlets, and travel accommodations',
  'concierge-services': 'Airport pickups, private security, and special requests',
};

const CATEGORY_MODEL_DEFAULTS: Record<string, BusinessModel> = {
  restaurants: 'VISIT_ONLY',
  shopping: 'ORDER_DELIVERY',
  'home-services': 'BOOKING_VISIT',
  'hotels-travel': 'BOOKING_VISIT',
  'health-wellness': 'VISIT_ONLY',
  nightlife: 'VISIT_ONLY',
  'concierge-services': 'BOOKING_VISIT',
  'local-services': 'VISIT_ONLY',
  'professional-services': 'BOOKING_VISIT',
  'arts-entertainment': 'VISIT_ONLY',
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function suggestIconKey(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of Object.entries(ICON_SUGGESTIONS)) {
    if (lower.includes(keyword)) return icon;
  }
  return '';
}

function suggestDescription(slug: string): string {
  return DESCRIPTION_SUGGESTIONS[slug] || '';
}

function suggestBusinessModel(categorySlug: string): BusinessModel | undefined {
  return CATEGORY_MODEL_DEFAULTS[categorySlug];
}

// ─── Inline UI Components ──────────────────────────────────

function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-gray-600" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {description && <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function DetailCard({ icon: Icon, label, value, mono }: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="w-3 h-3 text-gray-400" />}
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className={`text-sm text-gray-800 font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, tooltip, onClick, variant }: {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  onClick: (e: React.MouseEvent) => void;
  variant: 'default' | 'blue' | 'green' | 'amber' | 'red';
}) {
  const styles = {
    default: 'hover:bg-gray-100 text-gray-500 hover:text-gray-700',
    blue: 'hover:bg-blue-50 text-gray-500 hover:text-blue-600',
    green: 'hover:bg-emerald-50 text-gray-500 hover:text-emerald-600',
    amber: 'hover:bg-amber-50 text-gray-500 hover:text-amber-600',
    red: 'hover:bg-red-50 text-gray-500 hover:text-red-600',
  };
  return (
    <button onClick={onClick} className={`p-2 rounded-lg transition-all duration-200 ${styles[variant]}`} title={tooltip}>
      <Icon className="w-4 h-4" />
    </button>
  );
}

function BusinessModelBadge({ model }: { model?: string }) {
  if (!model) return <span className="text-gray-400 text-xs">—</span>;
  const cfg = BUSINESS_MODEL_CONFIG[model];
  if (!cfg) return <span className="text-xs text-gray-500">{model}</span>;
  const IconComp = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
      <IconComp className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function GroupTypeBadge({ type }: { type?: string }) {
  if (!type) return <span className="text-gray-400 text-xs">—</span>;
  const cfg = GROUP_TYPE_CONFIG[type] || { label: type, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-300' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
      <Layers className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function RiskTierBadge({ tier }: { tier?: string }) {
  if (!tier) return <span className="text-gray-400 text-xs">—</span>;
  const cfg = RISK_TIER_CONFIG[tier] || { label: tier, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-300' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function AutoFillHint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium ml-1">
      <Check className="w-3 h-3" />
      suggested
    </span>
  );
}

function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-6 space-y-4">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/5" />
            </div>
            <div className="h-6 w-16 bg-gray-100 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="card p-16 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-gray-200">
        <Icon className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> {actionLabel}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function TaxonomyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('categories');

  const { data: groups } = useApi<CategoryGroup[]>(() => api.categoryGroups.list(), []);
  const { data: categories } = useApi<Category[]>(() => api.categories.list(), []);
  const { data: subcategories } = useApi<Subcategory[]>(() => api.subcategories.list(), []);

  const stats = useMemo(() => {
    const totalGroups = groups?.length || 0;
    const totalCategories = categories?.length || 0;
    const totalSubcategories = subcategories?.length || 0;
    const activeCategories = categories?.filter(c => c.isActive).length || 0;
    const activeSubcategories = subcategories?.filter(s => s.isActive).length || 0;
    return { totalGroups, totalCategories, totalSubcategories, activeItems: activeCategories + activeSubcategories };
  }, [groups, categories, subcategories]);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'groups', label: 'Groups', icon: Layers },
    { key: 'categories', label: 'Categories', icon: FolderTree },
    { key: 'subcategories', label: 'Subcategories', icon: Tag },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-ruby-500 to-ruby-700 rounded-xl flex items-center justify-center shadow-lg shadow-ruby-500/20">
            <FolderTree className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Taxonomy Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage category groups, categories, and subcategories</p>
          </div>
        </div>
        <Link
          href="/ruby-app/admin/taxonomy/setup"
          className="btn-primary flex items-center gap-2 text-sm shadow-lg shadow-ruby-500/20"
        >
          <Rocket className="w-4 h-4" /> Quick Setup
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Category Groups" value={stats.totalGroups} icon={Layers} />
        <StatCard title="Categories" value={stats.totalCategories} icon={FolderTree} className="border-l-4 border-l-ruby-400" />
        <StatCard title="Subcategories" value={stats.totalSubcategories} icon={Tag} className="border-l-4 border-l-blue-400" />
        <StatCard title="Active Items" value={stats.activeItems} icon={Activity} className="border-l-4 border-l-emerald-500" />
      </div>

      {/* Quick Setup CTA — shown when taxonomy is empty */}
      {stats.totalGroups === 0 && stats.totalCategories === 0 && stats.totalSubcategories === 0 && (
        <Link
          href="/ruby-app/admin/taxonomy/setup"
          className="block card p-5 border-ruby-200 bg-gradient-to-r from-ruby-50/60 to-white hover:from-ruby-50 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-ruby-500 to-ruby-700 rounded-xl flex items-center justify-center shadow-lg shadow-ruby-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900">No taxonomy data yet</h3>
              <p className="text-sm text-gray-500 mt-0.5">Set up the official Ruby+ categories, subcategories & templates in one click.</p>
            </div>
            <span className="btn-primary shrink-0 flex items-center gap-2 text-sm">
              <Rocket className="w-4 h-4" /> Quick Setup
            </span>
          </div>
        </Link>
      )}

      {/* Tab Bar */}
      <div className="card p-1.5">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-ruby-500 to-ruby-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'groups' && <GroupsTab />}
      {activeTab === 'categories' && <CategoriesTab />}
      {activeTab === 'subcategories' && <SubcategoriesTab />}
      {/* {activeTab === 'location-config' && <LocationConfigTab />} */}
    </div>
  );
}

// ============================================================
// Groups Tab
// ============================================================
function GroupsTab() {
  const { data: groups, isLoading, error, refetch } = useApi<CategoryGroup[]>(() => api.categoryGroups.list(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewGroup, setViewGroup] = useState<CategoryGroup | null>(null);
  const [editGroup, setEditGroup] = useState<CategoryGroup | null>(null);
  const [form, setForm] = useState<CreateCategoryGroupRequest>({ name: '', slug: '', type: 'TOP_TILES', displayOrder: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (!groups) return [];
    return groups.filter(g => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!g.name.toLowerCase().includes(q) && !g.slug.toLowerCase().includes(q)) return false;
      }
      if (typeFilter && g.type !== typeFilter) return false;
      return true;
    });
  }, [groups, searchQuery, typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.categoryGroups.create({ ...form, isActive: true });
      toast.success('Group created');
      setShowCreate(false);
      setForm({ name: '', slug: '', type: 'TOP_TILES', displayOrder: 0 });
      refetch();
    } catch {
      toast.error('Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (group: CategoryGroup) => {
    try {
      await api.categoryGroups.update(group._id, { isActive: !group.isActive });
      toast.success(`Group ${group.isActive ? 'deactivated' : 'activated'}`);
      refetch();
    } catch {
      toast.error('Failed to update group');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroup) return;
    setIsSubmitting(true);
    try {
      await api.categoryGroups.update(editGroup._id, form);
      toast.success('Group updated');
      setEditGroup(null);
      refetch();
    } catch {
      toast.error('Failed to update group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (group: CategoryGroup) => {
    setForm({ name: group.name, slug: group.slug, type: group.type, displayOrder: group.displayOrder });
    setEditGroup(group);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups..."
              className="input-field pl-10 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer">
                <option value="">All types</option>
                <option value="TOP_TILES">Top Tiles</option>
                <option value="MORE">More</option>
                <option value="FEATURED">Featured</option>
                <option value="SEASONAL">Seasonal</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={() => refetch()} className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => { setForm({ name: '', slug: '', type: 'TOP_TILES', displayOrder: (groups?.length || 0) }); setShowCreate(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-ruby-500/20">
              <Plus className="w-4 h-4" /> Add Group
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && !isLoading && (
        <div className="card p-6 border-red-200 bg-gradient-to-r from-red-50 to-red-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Failed to load groups</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button onClick={() => refetch()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoadingSkeleton rows={3} />}

      {!isLoading && !error && (!groups || groups.length === 0) && (
        <EmptyState icon={Layers} title="No category groups yet" description="Create your first category group to organize categories." actionLabel="Create First Group" onAction={() => setShowCreate(true)} />
      )}

      {/* Table */}
      {!isLoading && !error && groups && groups.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Category Groups</h3>
              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{filtered.length} of {groups.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-500">No groups match your filters</p>
                    </td>
                  </tr>
                ) : filtered.map(group => (
                  <tr key={group._id} className="group hover:bg-gray-50/80 transition-colors cursor-pointer" onClick={() => setViewGroup(group)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center">
                          <Layers className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{group.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="font-mono text-xs text-gray-500">{group.slug}</span></td>
                    <td className="px-5 py-3.5"><GroupTypeBadge type={group.type} /></td>
                    <td className="px-5 py-3.5"><span className="text-sm text-gray-600">{group.displayOrder}</span></td>
                    <td className="px-5 py-3.5"><StatusBadge status={group.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <ActionButton icon={Eye} tooltip="View" onClick={(e) => { e.stopPropagation(); setViewGroup(group); }} variant="default" />
                        <ActionButton icon={Pencil} tooltip="Edit" onClick={(e) => { e.stopPropagation(); openEdit(group); }} variant="blue" />
                        {group.isActive ? (
                          <ActionButton icon={PowerOff} tooltip="Deactivate" onClick={(e) => { e.stopPropagation(); handleToggleStatus(group); }} variant="red" />
                        ) : (
                          <ActionButton icon={Power} tooltip="Activate" onClick={(e) => { e.stopPropagation(); handleToggleStatus(group); }} variant="green" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Category Group" size="sm">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-4">
            <SectionHeader icon={Layers} title="Group Details" description="Define a new category group" />
            <div>
              <label className="label-text">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} className="input-field" required placeholder="e.g. Top Tiles" />
            </div>
            <div>
              <label className="label-text">Slug <AutoFillHint visible={!!form.slug && !!form.name} /></label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input-field font-mono text-sm" required />
            </div>
            <div>
              <label className="label-text">Group Type</label>
              <div className="relative">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CategoryGroupType })} className="input-field w-full pr-8 appearance-none cursor-pointer">
                  <option value="TOP_TILES">Top Tiles</option>
                  <option value="MORE">More</option>
                  <option value="FEATURED">Featured</option>
                  <option value="SEASONAL">Seasonal</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="label-text">Display Order <AutoFillHint visible={(form.displayOrder || 0) > 0} /></label>
              <input type="number" value={form.displayOrder ?? 0} onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })} className="input-field" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-200">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Group</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {viewGroup && (
        <Modal isOpen onClose={() => setViewGroup(null)} title="Group Details" size="md">
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                <Layers className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-bold text-gray-900">{viewGroup.name}</h3>
                  <StatusBadge status={viewGroup.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <GroupTypeBadge type={viewGroup.type} />
                  <span className="text-gray-300">|</span>
                  <span className="font-mono text-xs text-gray-400">{viewGroup.slug}</span>
                </div>
              </div>
            </div>
            <div>
              <SectionHeader icon={Layers} title="Details" />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <DetailCard icon={Hash} label="Name" value={viewGroup.name} />
                <DetailCard icon={Hash} label="Slug" value={viewGroup.slug} mono />
                <DetailCard icon={Layers} label="Type" value={GROUP_TYPE_CONFIG[viewGroup.type]?.label || viewGroup.type} />
                <DetailCard icon={Hash} label="Display Order" value={String(viewGroup.displayOrder)} />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button onClick={() => { setViewGroup(null); openEdit(viewGroup); }} className="btn-primary flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Edit Group
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editGroup && (
        <Modal isOpen onClose={() => setEditGroup(null)} title={`Edit: ${editGroup.name}`} size="sm">
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="space-y-4">
              <SectionHeader icon={Pencil} title="Edit Group" description="Update group details" />
              <div>
                <label className="label-text">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="label-text">Slug</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input-field font-mono text-sm" required />
              </div>
              <div>
                <label className="label-text">Group Type</label>
                <div className="relative">
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CategoryGroupType })} className="input-field w-full pr-8 appearance-none cursor-pointer">
                    <option value="TOP_TILES">Top Tiles</option>
                    <option value="MORE">More</option>
                    <option value="FEATURED">Featured</option>
                    <option value="SEASONAL">Seasonal</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="label-text">Display Order</label>
                <input type="number" value={form.displayOrder ?? 0} onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
              <button type="button" onClick={() => setEditGroup(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
                {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// Categories Tab
// ============================================================
function CategoriesTab() {
  const { data: categories, isLoading, error, refetch } = useApi<Category[]>(() => api.categories.list(), []);
  const { data: groups } = useApi<CategoryGroup[]>(() => api.categoryGroups.list(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewCategory, setViewCategory] = useState<Category | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  // Track which fields were auto-filled so we don't overwrite user edits
  const autoFilled = useRef<Set<string>>(new Set());

  const defaultForm = useCallback((): CreateCategoryRequest => ({
    name: '', slug: '', defaultGroupType: 'TOP_TILES', displayOrder: (categories?.length || 0), isActive: true,
  }), [categories]);

  const [form, setForm] = useState<CreateCategoryRequest>(defaultForm());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (!categories) return [];
    return categories.filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
      }
      if (groupFilter && c.defaultGroupType !== groupFilter) return false;
      if (statusFilter === 'active' && !c.isActive) return false;
      if (statusFilter === 'inactive' && c.isActive) return false;
      return true;
    });
  }, [categories, searchQuery, groupFilter, statusFilter]);

  const getGroupName = (cat: Category) => {
    if (cat.defaultGroupType) return cat.defaultGroupType;
    if (cat.defaultGroupId && typeof cat.defaultGroupId === 'object') return (cat.defaultGroupId as CategoryGroup).name;
    return '—';
  };

  const handleNameChange = (name: string) => {
    const slug = slugify(name);
    const updates: Partial<CreateCategoryRequest> = { name, slug };

    // Auto-suggest icon key
    const iconSuggestion = suggestIconKey(name);
    if (iconSuggestion && (!form.iconKey || autoFilled.current.has('iconKey'))) {
      updates.iconKey = iconSuggestion;
      autoFilled.current.add('iconKey');
    }

    // Auto-suggest description
    const descSuggestion = suggestDescription(slug);
    if (descSuggestion && (!form.description || autoFilled.current.has('description'))) {
      updates.description = descSuggestion;
      autoFilled.current.add('description');
    }

    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.categories.create(form);
      toast.success('Category created');
      setShowCreate(false);
      autoFilled.current.clear();
      setForm(defaultForm());
      refetch();
    } catch {
      toast.error('Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategory) return;
    setIsSubmitting(true);
    try {
      await api.categories.update(editCategory._id, form);
      toast.success('Category updated');
      setEditCategory(null);
      autoFilled.current.clear();
      refetch();
    } catch {
      toast.error('Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    try {
      await api.categories.update(cat._id, { isActive: !cat.isActive });
      toast.success(`Category ${cat.isActive ? 'deactivated' : 'activated'}`);
      refetch();
    } catch {
      toast.error('Failed to update category');
    }
  };

  const openCreate = () => {
    autoFilled.current.clear();
    setForm(defaultForm());
    setShowCreate(true);
  };

  const openEdit = (cat: Category) => {
    autoFilled.current.clear();
    setForm({
      name: cat.name, slug: cat.slug, description: cat.description, iconKey: cat.iconKey,
      iconUrl: cat.iconUrl,
      defaultGroupType: cat.defaultGroupType, displayOrder: cat.displayOrder,
      isActive: cat.isActive, isShopping: cat.isShopping, isService: cat.isService,
    });
    setEditCategory(cat);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search categories..." className="input-field pl-10 bg-gray-50 border-gray-200 focus:bg-white" />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer">
                <option value="">All groups</option>
                <option value="TOP_TILES">Top Tiles</option>
                <option value="MORE">More</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer">
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={() => refetch()} className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 shadow-lg shadow-ruby-500/20">
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>
        </div>
      </div>

      {error && !isLoading && (
        <div className="card p-6 border-red-200 bg-gradient-to-r from-red-50 to-red-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0"><AlertCircle className="w-6 h-6 text-red-600" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Failed to load categories</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button onClick={() => refetch()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900"><RefreshCw className="w-3.5 h-3.5" /> Try again</button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoadingSkeleton rows={5} />}

      {!isLoading && !error && (!categories || categories.length === 0) && (
        <EmptyState icon={FolderTree} title="No categories yet" description="Create your first category to start organizing your taxonomy." actionLabel="Create First Category" onAction={openCreate} />
      )}

      {/* Table */}
      {!isLoading && !error && categories && categories.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <FolderTree className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Categories</h3>
              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{filtered.length} of {categories.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Group</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-500">No categories match your filters</p>
                    </td>
                  </tr>
                ) : filtered.map(cat => (
                  <tr key={cat._id} className="group hover:bg-gray-50/80 transition-colors cursor-pointer" onClick={() => setViewCategory(cat)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {cat.iconUrl ? (
                          <div className="w-9 h-9 rounded-xl overflow-hidden border border-gray-200 bg-white flex items-center justify-center shadow-sm">
                            <img src={cat.iconUrl} alt={cat.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 bg-gradient-to-br from-ruby-400 to-ruby-600 rounded-xl flex items-center justify-center shadow-sm">
                            <FolderTree className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{cat.name}</div>
                          <div className="text-xs text-gray-400 font-mono">{cat.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-gray-500 max-w-[200px] truncate block">{cat.description || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5"><GroupTypeBadge type={getGroupName(cat)} /></td>
                    <td className="px-5 py-3.5"><span className="text-sm text-gray-600">{cat.displayOrder}</span></td>
                    <td className="px-5 py-3.5"><StatusBadge status={cat.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <ActionButton icon={Eye} tooltip="View" onClick={(e) => { e.stopPropagation(); setViewCategory(cat); }} variant="default" />
                        <ActionButton icon={Pencil} tooltip="Edit" onClick={(e) => { e.stopPropagation(); openEdit(cat); }} variant="blue" />
                        {cat.isActive ? (
                          <ActionButton icon={PowerOff} tooltip="Deactivate" onClick={(e) => { e.stopPropagation(); handleToggleStatus(cat); }} variant="red" />
                        ) : (
                          <ActionButton icon={Power} tooltip="Activate" onClick={(e) => { e.stopPropagation(); handleToggleStatus(cat); }} variant="green" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); autoFilled.current.clear(); }} title="Create Category" size="lg">
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <SectionHeader icon={FolderTree} title="Basic Information" description="Name and description for this category" />
            <div>
              <label className="label-text">Name</label>
              <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} className="input-field" required placeholder="e.g. Restaurants" />
            </div>
            <div>
              <label className="label-text">Slug <AutoFillHint visible={!!form.slug && !!form.name} /></label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input-field font-mono text-sm" required />
            </div>
            <div>
              <label className="label-text">Description <AutoFillHint visible={!!form.description && autoFilled.current.has('description')} /></label>
              <textarea value={form.description || ''} onChange={(e) => { autoFilled.current.delete('description'); setForm({ ...form, description: e.target.value }); }} className="input-field resize-none" rows={3} placeholder="Short tagline for this category" />
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-4">
            <SectionHeader icon={Layers} title="Classification" description="Group type and ordering" />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label-text">Group Type</label>
                <div className="relative">
                  <select value={form.defaultGroupType || 'TOP_TILES'} onChange={(e) => setForm({ ...form, defaultGroupType: e.target.value as CategoryGroupType })} className="input-field w-full pr-8 appearance-none cursor-pointer">
                    <option value="TOP_TILES">Top Tiles</option>
                    <option value="MORE">More</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="label-text">Display Order <AutoFillHint visible={(form.displayOrder || 0) > 0} /></label>
                <input type="number" value={form.displayOrder ?? 0} onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })} className="input-field" />
              </div>
              <div>
                <label className="label-text">Icon Key <AutoFillHint visible={!!form.iconKey && autoFilled.current.has('iconKey')} /></label>
                <input value={form.iconKey || ''} onChange={(e) => { autoFilled.current.delete('iconKey'); setForm({ ...form, iconKey: e.target.value }); }} className="input-field" placeholder="e.g. utensils" />
              </div>
            </div>
            <ImageUpload
              value={form.iconUrl}
              onChange={(url) => setForm({ ...form, iconUrl: url })}
              folder="taxonomy"
              label="Category Icon"
              helpText="Upload an icon image for this category"
            />
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <SectionHeader icon={Settings} title="Settings" description="Category behavior flags" />
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isShopping || false} onChange={(e) => setForm({ ...form, isShopping: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                <span className="text-sm text-gray-700">Shopping category</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isService || false} onChange={(e) => setForm({ ...form, isService: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                <span className="text-sm text-gray-700">Service category</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-200">
            <button type="button" onClick={() => { setShowCreate(false); autoFilled.current.clear(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Category</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {viewCategory && (
        <Modal isOpen onClose={() => setViewCategory(null)} title="Category Details" size="lg">
          <div className="space-y-6">
            {/* Header card with icon */}
            <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-xl border border-gray-100">
              {viewCategory.iconUrl ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-white flex items-center justify-center shadow-sm shrink-0">
                  <img src={viewCategory.iconUrl} alt={viewCategory.name} className="w-full h-full object-contain p-1.5" />
                </div>
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-ruby-500 to-ruby-700 rounded-xl flex items-center justify-center shadow-lg shadow-ruby-500/20 shrink-0">
                  <FolderTree className="w-7 h-7 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <h3 className="text-xl font-bold text-gray-900 truncate">{viewCategory.name}</h3>
                  <StatusBadge status={viewCategory.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                  <GroupTypeBadge type={viewCategory.defaultGroupType} />
                  <span className="text-gray-300">|</span>
                  <span className="font-mono text-xs text-gray-400">{viewCategory.slug}</span>
                </div>
                {viewCategory.description && (
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">{viewCategory.description}</p>
                )}
              </div>
            </div>

            {/* Details grid */}
            <div>
              <SectionHeader icon={FolderTree} title="Category Information" />
              <div className="mt-4 space-y-3">
                {/* Top row: key identifiers */}
                <div className="grid grid-cols-3 gap-3">
                  <DetailCard icon={Layers} label="Group Type" value={GROUP_TYPE_CONFIG[viewCategory.defaultGroupType]?.label || viewCategory.defaultGroupType} />
                  <DetailCard icon={Hash} label="Display Order" value={String(viewCategory.displayOrder)} />
                  <DetailCard label="Icon Key" value={viewCategory.iconKey || '—'} mono />
                </div>
                {/* Bottom row: flags */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Shopping</p>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${viewCategory.isShopping ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {viewCategory.isShopping ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {viewCategory.isShopping ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Service</p>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${viewCategory.isService ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {viewCategory.isService ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {viewCategory.isService ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Status</p>
                    <StatusBadge status={viewCategory.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button onClick={() => { setViewCategory(null); openEdit(viewCategory); }} className="btn-primary flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Edit Category
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editCategory && (
        <Modal isOpen onClose={() => { setEditCategory(null); autoFilled.current.clear(); }} title={`Edit: ${editCategory.name}`} size="lg">
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="space-y-4">
              <SectionHeader icon={FolderTree} title="Basic Information" />
              <div>
                <label className="label-text">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="label-text">Slug</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input-field font-mono text-sm" required />
              </div>
              <div>
                <label className="label-text">Description</label>
                <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows={3} />
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader icon={Layers} title="Classification" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label-text">Group Type</label>
                  <div className="relative">
                    <select value={form.defaultGroupType || 'TOP_TILES'} onChange={(e) => setForm({ ...form, defaultGroupType: e.target.value as CategoryGroupType })} className="input-field w-full pr-8 appearance-none cursor-pointer">
                      <option value="TOP_TILES">Top Tiles</option>
                      <option value="MORE">More</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="label-text">Display Order</label>
                  <input type="number" value={form.displayOrder ?? 0} onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })} className="input-field" />
                </div>
                <div>
                  <label className="label-text">Icon Key</label>
                  <input value={form.iconKey || ''} onChange={(e) => setForm({ ...form, iconKey: e.target.value })} className="input-field" />
                </div>
              </div>
              <ImageUpload
                value={form.iconUrl}
                onChange={(url) => setForm({ ...form, iconUrl: url })}
                folder="taxonomy"
                label="Category Icon"
                helpText="Upload an icon image for this category"
              />
            </div>

            <div className="space-y-4">
              <SectionHeader icon={Settings} title="Settings" />
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isShopping || false} onChange={(e) => setForm({ ...form, isShopping: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                  <span className="text-sm text-gray-700">Shopping</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isService || false} onChange={(e) => setForm({ ...form, isService: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                  <span className="text-sm text-gray-700">Service</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
              <button type="button" onClick={() => { setEditCategory(null); autoFilled.current.clear(); }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
                {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// Subcategories Tab
// ============================================================
function SubcategoriesTab() {
  const { data: subcategories, isLoading, error, refetch } = useApi<Subcategory[]>(() => api.subcategories.list(), []);
  const { data: categories } = useApi<Category[]>(() => api.categories.list(), []);
  const { data: templates } = useApi<Template[]>(() => api.templates.list(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subcategoryPage, setSubcategoryPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [viewSubcategory, setViewSubcategory] = useState<Subcategory | null>(null);
  const [editSubcategory, setEditSubcategory] = useState<Subcategory | null>(null);
  const [synonymInput, setSynonymInput] = useState('');

  const autoFilled = useRef<Set<string>>(new Set());

  const defaultForm = useCallback((): CreateSubcategoryRequest => ({
    categoryId: '', name: '', slug: '', displayOrder: 0, isActive: true, synonyms: [],
    productFields: [], serviceFields: [],
  }), []);

  const [form, setForm] = useState<CreateSubcategoryRequest>(defaultForm());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    setSubcategoryPage(1);
    if (!subcategories) return [];
    return subcategories.filter(s => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!s.name?.toLowerCase().includes(q) && !s.slug.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter) {
        const catId = typeof s.categoryId === 'object' ? s.categoryId._id : s.categoryId;
        if (catId !== categoryFilter) return false;
      }
      if (modelFilter && s.businessModel !== modelFilter) return false;
      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'inactive' && s.isActive) return false;
      return true;
    });
  }, [subcategories, searchQuery, categoryFilter, modelFilter, statusFilter]);

  const SUBCATEGORY_PAGE_SIZE = 20;
  const subcategoryTotalPages = Math.ceil(filtered.length / SUBCATEGORY_PAGE_SIZE);
  const paginatedSubcategories = filtered.slice((subcategoryPage - 1) * SUBCATEGORY_PAGE_SIZE, subcategoryPage * SUBCATEGORY_PAGE_SIZE);

  const getCategoryName = (s: Subcategory) => {
    if (typeof s.categoryId === 'object' && s.categoryId?.name) return s.categoryId.name;
    const cat = categories?.find(c => c._id === (typeof s.categoryId === 'string' ? s.categoryId : s.categoryId?._id));
    return cat?.name || String(s.categoryId);
  };

  const getCategorySlug = (categoryId: string): string => {
    const cat = categories?.find(c => c._id === categoryId);
    return cat?.slug || '';
  };

  const getTemplateName = (templateId?: string | { _id: string; name: string; version?: number }): string => {
    if (!templateId) return '—';
    if (typeof templateId === 'object') return templateId.name;
    const tmpl = templates?.find(t => t._id === templateId);
    return tmpl?.name || templateId;
  };

  const handleCategorySelect = (categoryId: string) => {
    const updates: Partial<CreateSubcategoryRequest> = { categoryId };

    // Auto-suggest business model based on parent category
    const catSlug = getCategorySlug(categoryId);
    const suggestedModel = suggestBusinessModel(catSlug);
    if (suggestedModel && (!form.businessModel || autoFilled.current.has('businessModel'))) {
      updates.businessModel = suggestedModel;
      autoFilled.current.add('businessModel');
    }

    // Auto-suggest risk tier
    if (!form.riskTier || autoFilled.current.has('riskTier')) {
      updates.riskTier = 'LOW';
      autoFilled.current.add('riskTier');
    }

    // Auto-set display order to next available in this category
    const existingInCategory = subcategories?.filter(s => {
      const catId = typeof s.categoryId === 'object' ? s.categoryId._id : s.categoryId;
      return catId === categoryId;
    }).length || 0;
    if (!form.displayOrder || autoFilled.current.has('displayOrder')) {
      updates.displayOrder = existingInCategory;
      autoFilled.current.add('displayOrder');
    }

    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({ ...prev, name, slug: slugify(name) }));
  };

  const addSynonym = () => {
    if (synonymInput.trim()) {
      setForm(prev => ({ ...prev, synonyms: [...(prev.synonyms || []), synonymInput.trim()] }));
      setSynonymInput('');
    }
  };

  const removeSynonym = (index: number) => {
    setForm(prev => ({ ...prev, synonyms: prev.synonyms?.filter((_, i) => i !== index) }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.subcategories.create(form);
      toast.success('Subcategory created');
      setShowCreate(false);
      autoFilled.current.clear();
      setForm(defaultForm());
      setSynonymInput('');
      refetch();
    } catch {
      toast.error('Failed to create subcategory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubcategory) return;
    setIsSubmitting(true);
    try {
      await api.subcategories.update(editSubcategory._id, form);
      toast.success('Subcategory updated');
      setEditSubcategory(null);
      autoFilled.current.clear();
      setSynonymInput('');
      refetch();
    } catch {
      toast.error('Failed to update subcategory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (sub: Subcategory) => {
    try {
      await api.subcategories.update(sub._id, { isActive: !sub.isActive });
      toast.success(`Subcategory ${sub.isActive ? 'deactivated' : 'activated'}`);
      refetch();
    } catch {
      toast.error('Failed to update subcategory');
    }
  };

  const openCreate = () => {
    autoFilled.current.clear();
    setForm(defaultForm());
    setSynonymInput('');
    setShowCreate(true);
  };

  const openEdit = (sub: Subcategory) => {
    autoFilled.current.clear();
    const catId = typeof sub.categoryId === 'object' ? sub.categoryId._id : sub.categoryId;
    const tmplId = typeof sub.templateId === 'object' ? sub.templateId._id : sub.templateId;
    setForm({
      categoryId: catId, name: sub.name, slug: sub.slug,
      displayOrder: sub.displayOrder, isActive: sub.isActive,
      synonyms: sub.synonyms || [], businessModel: sub.businessModel,
      riskTier: sub.riskTier, templateId: tmplId,
      productFields: sub.productFields || [],
      serviceFields: sub.serviceFields || [],
    });
    setSynonymInput('');
    setEditSubcategory(sub);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search subcategories..." className="input-field pl-10 bg-gray-50 border-gray-200 focus:bg-white" />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer">
                <option value="">All categories</option>
                {categories?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer">
                <option value="">All models</option>
                <option value="ORDER_DELIVERY">Order & Delivery</option>
                <option value="VISIT_ONLY">Visit Only</option>
                <option value="BOOKING_VISIT">Booking & Visit</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer">
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={() => refetch()} className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 shadow-lg shadow-ruby-500/20">
              <Plus className="w-4 h-4" /> Add Subcategory
            </button>
          </div>
        </div>
      </div>

      {error && !isLoading && (
        <div className="card p-6 border-red-200 bg-gradient-to-r from-red-50 to-red-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0"><AlertCircle className="w-6 h-6 text-red-600" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Failed to load subcategories</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button onClick={() => refetch()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900"><RefreshCw className="w-3.5 h-3.5" /> Try again</button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoadingSkeleton rows={5} />}

      {!isLoading && !error && (!subcategories || subcategories.length === 0) && (
        <EmptyState icon={Tag} title="No subcategories yet" description="Create your first subcategory to classify businesses further." actionLabel="Create First Subcategory" onAction={openCreate} />
      )}

      {/* Table */}
      {!isLoading && !error && subcategories && subcategories.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <Tag className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Subcategories</h3>
              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{filtered.length} of {subcategories.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Subcategory</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Business Model</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Risk Tier</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Template</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Synonyms</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-500">No subcategories match your filters</p>
                    </td>
                  </tr>
                ) : paginatedSubcategories.map(sub => (
                  <tr key={sub._id} className="group hover:bg-gray-50/80 transition-colors cursor-pointer" onClick={() => setViewSubcategory(sub)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                          <Tag className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{sub.name || sub.slug}</div>
                          <div className="text-xs text-gray-400 font-mono">{sub.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="text-sm text-gray-600">{getCategoryName(sub)}</span></td>
                    <td className="px-5 py-3.5"><BusinessModelBadge model={sub.businessModel} /></td>
                    <td className="px-5 py-3.5"><RiskTierBadge tier={sub.riskTier} /></td>
                    <td className="px-5 py-3.5">
                      {sub.templateId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-purple-600 bg-purple-50 border border-purple-200">
                          <FileText className="w-3 h-3" /> {getTemplateName(sub.templateId)}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {sub.synonyms && sub.synonyms.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-600 bg-gray-100 border border-gray-200">
                          {sub.synonyms.length} synonym{sub.synonyms.length !== 1 ? 's' : ''}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={sub.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <ActionButton icon={Eye} tooltip="View" onClick={(e) => { e.stopPropagation(); setViewSubcategory(sub); }} variant="default" />
                        <ActionButton icon={Pencil} tooltip="Edit" onClick={(e) => { e.stopPropagation(); openEdit(sub); }} variant="blue" />
                        {sub.isActive ? (
                          <ActionButton icon={PowerOff} tooltip="Deactivate" onClick={(e) => { e.stopPropagation(); handleToggleStatus(sub); }} variant="red" />
                        ) : (
                          <ActionButton icon={Power} tooltip="Activate" onClick={(e) => { e.stopPropagation(); handleToggleStatus(sub); }} variant="green" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {subcategoryTotalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(subcategoryPage - 1) * SUBCATEGORY_PAGE_SIZE + 1} to {Math.min(subcategoryPage * SUBCATEGORY_PAGE_SIZE, filtered.length)} of {filtered.length} subcategories
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSubcategoryPage(p => Math.max(1, p - 1))}
                  disabled={subcategoryPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm text-gray-600 font-medium px-2">
                  Page {subcategoryPage} of {subcategoryTotalPages}
                </span>
                <button
                  onClick={() => setSubcategoryPage(p => Math.min(subcategoryTotalPages, p + 1))}
                  disabled={subcategoryPage === subcategoryTotalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); autoFilled.current.clear(); }} title="Create Subcategory" size="lg">
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <SectionHeader icon={Tag} title="Basic Information" description="Name and parent category" />
            <div>
              <label className="label-text">Name</label>
              <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} className="input-field" required placeholder="e.g. Casual Dining" />
            </div>
            <div>
              <label className="label-text">Slug <AutoFillHint visible={!!form.slug && !!form.name} /></label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input-field font-mono text-sm" required />
            </div>
            <div>
              <label className="label-text">Category</label>
              <div className="relative">
                <select value={form.categoryId} onChange={(e) => handleCategorySelect(e.target.value)} className="input-field w-full pr-8 appearance-none cursor-pointer" required>
                  <option value="">Select a category...</option>
                  {categories?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Business Classification */}
          <div className="space-y-4">
            <SectionHeader icon={Briefcase} title="Business Classification" description="Business model, risk tier, and template" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Business Model <AutoFillHint visible={!!form.businessModel && autoFilled.current.has('businessModel')} /></label>
                <div className="relative">
                  <select
                    value={form.businessModel || ''}
                    onChange={(e) => { autoFilled.current.delete('businessModel'); setForm({ ...form, businessModel: (e.target.value || undefined) as BusinessModel | undefined }); }}
                    className="input-field w-full pr-8 appearance-none cursor-pointer"
                  >
                    <option value="">Select...</option>
                    <option value="ORDER_DELIVERY">Order & Delivery</option>
                    <option value="VISIT_ONLY">Visit Only</option>
                    <option value="BOOKING_VISIT">Booking & Visit</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
                {form.businessModel && autoFilled.current.has('businessModel') && form.categoryId && (
                  <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Auto-suggested based on category
                  </p>
                )}
              </div>
              <div>
                <label className="label-text">Risk Tier <AutoFillHint visible={!!form.riskTier && autoFilled.current.has('riskTier')} /></label>
                <div className="relative">
                  <select
                    value={form.riskTier || ''}
                    onChange={(e) => { autoFilled.current.delete('riskTier'); setForm({ ...form, riskTier: (e.target.value || undefined) as 'LOW' | 'MEDIUM' | 'HIGH' | undefined }); }}
                    className="input-field w-full pr-8 appearance-none cursor-pointer"
                  >
                    <option value="">None</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div>
              <label className="label-text">Linked Template</label>
              <div className="relative">
                <select
                  value={form.templateId || ''}
                  onChange={(e) => setForm({ ...form, templateId: e.target.value || undefined })}
                  className="input-field w-full pr-8 appearance-none cursor-pointer"
                >
                  <option value="">No template (optional)</option>
                  {templates?.filter(t => t.isActive).map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.fields.length} fields)</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Businesses in this subcategory will fill out this template during onboarding</p>
            </div>
          </div>

          {/* Custom Product Fields */}
          <div className="space-y-4">
            <FieldBuilder
              label="Product Creation Fields"
              description="Custom fields business owners fill when creating a product in this subcategory"
              fields={form.productFields || []}
              onChange={(f) => setForm({ ...form, productFields: f })}
            />
          </div>

          {/* Custom Service Fields */}
          <div className="space-y-4">
            <FieldBuilder
              label="Service Creation Fields"
              description="Custom fields business owners fill when creating a service in this subcategory"
              fields={form.serviceFields || []}
              onChange={(f) => setForm({ ...form, serviceFields: f })}
            />
          </div>

          {/* Additional */}
          <div className="space-y-4">
            <SectionHeader icon={List} title="Additional" description="Synonyms and display order" />
            <div>
              <label className="label-text">Synonyms</label>
              <div className="flex gap-2">
                <input
                  value={synonymInput}
                  onChange={(e) => setSynonymInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSynonym(); } }}
                  className="input-field flex-1"
                  placeholder="Type and press Enter or click Add"
                />
                <button type="button" onClick={addSynonym} className="btn-secondary flex items-center gap-1.5 shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {form.synonyms && form.synonyms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.synonyms.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium">
                      {s}
                      <button type="button" onClick={() => removeSynonym(i)} className="hover:text-blue-900 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="label-text">Display Order <AutoFillHint visible={(form.displayOrder || 0) > 0 && autoFilled.current.has('displayOrder')} /></label>
              <input type="number" value={form.displayOrder ?? 0} onChange={(e) => { autoFilled.current.delete('displayOrder'); setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 }); }} className="input-field" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-200">
            <button type="button" onClick={() => { setShowCreate(false); autoFilled.current.clear(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Subcategory</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {viewSubcategory && (
        <Modal isOpen onClose={() => setViewSubcategory(null)} title="Subcategory Details" size="lg">
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                <Tag className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="text-xl font-bold text-gray-900">{viewSubcategory.name || viewSubcategory.slug}</h3>
                  <StatusBadge status={viewSubcategory.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                  <BusinessModelBadge model={viewSubcategory.businessModel} />
                  <span className="text-gray-300">|</span>
                  <span className="text-xs text-gray-500">{getCategoryName(viewSubcategory)}</span>
                  <span className="text-gray-300">|</span>
                  <span className="font-mono text-xs text-gray-400">{viewSubcategory.slug}</span>
                </div>
              </div>
            </div>

            <div>
              <SectionHeader icon={Tag} title="Details" />
              <div className="grid grid-cols-3 gap-4 mt-4">
                <DetailCard icon={Hash} label="Name" value={viewSubcategory.name || viewSubcategory.slug} />
                <DetailCard icon={Hash} label="Slug" value={viewSubcategory.slug} mono />
                <DetailCard icon={FolderTree} label="Category" value={getCategoryName(viewSubcategory)} />
                <DetailCard icon={Briefcase} label="Business Model" value={BUSINESS_MODEL_CONFIG[viewSubcategory.businessModel || '']?.label || '—'} />
                <DetailCard icon={AlertCircle} label="Risk Tier" value={RISK_TIER_CONFIG[viewSubcategory.riskTier || '']?.label || '—'} />
                <DetailCard icon={FileText} label="Template" value={getTemplateName(viewSubcategory.templateId)} />
                <DetailCard icon={Hash} label="Display Order" value={String(viewSubcategory.displayOrder)} />
              </div>
            </div>

            {/* Synonyms */}
            {viewSubcategory.synonyms && viewSubcategory.synonyms.length > 0 && (
              <div>
                <SectionHeader icon={List} title="Synonyms" description={`${viewSubcategory.synonyms.length} synonym${viewSubcategory.synonyms.length !== 1 ? 's' : ''}`} />
                <div className="flex flex-wrap gap-2 mt-4">
                  {viewSubcategory.synonyms.map((s, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button onClick={() => { setViewSubcategory(null); openEdit(viewSubcategory); }} className="btn-primary flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Edit Subcategory
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editSubcategory && (
        <Modal isOpen onClose={() => { setEditSubcategory(null); autoFilled.current.clear(); }} title={`Edit: ${editSubcategory.name || editSubcategory.slug}`} size="lg">
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="space-y-4">
              <SectionHeader icon={Tag} title="Basic Information" />
              <div>
                <label className="label-text">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="label-text">Slug</label>
                <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input-field font-mono text-sm" required />
              </div>
              <div>
                <label className="label-text">Category</label>
                <div className="relative">
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input-field w-full pr-8 appearance-none cursor-pointer" required>
                    <option value="">Select...</option>
                    {categories?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader icon={Briefcase} title="Business Classification" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Business Model</label>
                  <div className="relative">
                    <select value={form.businessModel || ''} onChange={(e) => setForm({ ...form, businessModel: (e.target.value || undefined) as BusinessModel | undefined })} className="input-field w-full pr-8 appearance-none cursor-pointer">
                      <option value="">Select...</option>
                      <option value="ORDER_DELIVERY">Order & Delivery</option>
                      <option value="VISIT_ONLY">Visit Only</option>
                      <option value="BOOKING_VISIT">Booking & Visit</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="label-text">Risk Tier</label>
                  <div className="relative">
                    <select value={form.riskTier || ''} onChange={(e) => setForm({ ...form, riskTier: (e.target.value || undefined) as 'LOW' | 'MEDIUM' | 'HIGH' | undefined })} className="input-field w-full pr-8 appearance-none cursor-pointer">
                      <option value="">None</option>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="label-text">Linked Template</label>
                <div className="relative">
                  <select
                    value={form.templateId || ''}
                    onChange={(e) => setForm({ ...form, templateId: e.target.value || undefined })}
                    className="input-field w-full pr-8 appearance-none cursor-pointer"
                  >
                    <option value="">No template (optional)</option>
                    {templates?.filter(t => t.isActive).map(t => (
                      <option key={t._id} value={t._id}>{t.name} ({t.fields.length} fields)</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Businesses in this subcategory will fill out this template during onboarding</p>
              </div>
            </div>

            {/* Custom Product Fields */}
            <div className="space-y-4">
              <FieldBuilder
                label="Product Creation Fields"
                description="Custom fields business owners fill when creating a product"
                fields={form.productFields || []}
                onChange={(f) => setForm({ ...form, productFields: f })}
              />
            </div>

            {/* Custom Service Fields */}
            <div className="space-y-4">
              <FieldBuilder
                label="Service Creation Fields"
                description="Custom fields business owners fill when creating a service"
                fields={form.serviceFields || []}
                onChange={(f) => setForm({ ...form, serviceFields: f })}
              />
            </div>

            <div className="space-y-4">
              <SectionHeader icon={List} title="Additional" />
              <div>
                <label className="label-text">Synonyms</label>
                <div className="flex gap-2">
                  <input
                    value={synonymInput}
                    onChange={(e) => setSynonymInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSynonym(); } }}
                    className="input-field flex-1"
                    placeholder="Type and press Enter"
                  />
                  <button type="button" onClick={addSynonym} className="btn-secondary flex items-center gap-1.5 shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                {form.synonyms && form.synonyms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.synonyms.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium">
                        {s}
                        <button type="button" onClick={() => removeSynonym(i)} className="hover:text-blue-900 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="label-text">Display Order</label>
                <input type="number" value={form.displayOrder ?? 0} onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })} className="input-field" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
              <button type="button" onClick={() => { setEditSubcategory(null); autoFilled.current.clear(); }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
                {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// Location Config Tab
// ============================================================
function LocationConfigTab() {
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editConfig, setEditConfig] = useState<{ categoryId: string; categoryName: string } | null>(null);
  const [configForm, setConfigForm] = useState<{ isActive: boolean; orderOverride?: number; groupOverride?: string; isFeatured: boolean }>({ isActive: true, isFeatured: false });
  const [isSaving, setIsSaving] = useState(false);
  const { data: locations } = useApi<Location[]>(() => api.locations.list({ status: 'ACTIVE' }), []);
  const { data: configs, isLoading, refetch } = useApi(
    () => api.locationCategoryConfig.list(selectedLocationId),
    [selectedLocationId],
    { enabled: !!selectedLocationId }
  );
  const { data: categories } = useApi<Category[]>(() => api.categories.list(), []);

  type LocCatConfig = { categoryId: string; isActive: boolean; orderOverride?: number; groupOverride?: string; isFeatured?: boolean };

  const getConfig = useCallback((categoryId: string): LocCatConfig | undefined => {
    if (!Array.isArray(configs)) return undefined;
    return configs.find((c: LocCatConfig) => c.categoryId === categoryId);
  }, [configs]);

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(cat => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!cat.name.toLowerCase().includes(q) && !cat.slug.toLowerCase().includes(q)) return false;
      }
      if (statusFilter && selectedLocationId) {
        const config = getConfig(cat._id);
        const active = config ? config.isActive : false;
        if (statusFilter === 'enabled' && !active) return false;
        if (statusFilter === 'disabled' && active) return false;
      }
      return true;
    });
  }, [categories, searchQuery, statusFilter, getConfig, selectedLocationId]);

  const handleToggle = async (categoryId: string, isActive: boolean) => {
    try {
      await api.locationCategoryConfig.upsert({ locationId: selectedLocationId, categoryId, isActive });
      toast.success(`Category ${isActive ? 'enabled' : 'disabled'} for location`);
      refetch();
    } catch {
      toast.error('Failed to update config');
    }
  };

  const openConfigure = (cat: Category) => {
    const config = getConfig(cat._id);
    setConfigForm({
      isActive: config?.isActive ?? false,
      orderOverride: config?.orderOverride,
      groupOverride: config?.groupOverride || '',
      isFeatured: config?.isFeatured ?? false,
    });
    setEditConfig({ categoryId: cat._id, categoryName: cat.name });
  };

  const handleConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editConfig) return;
    setIsSaving(true);
    try {
      await api.locationCategoryConfig.upsert({
        locationId: selectedLocationId,
        categoryId: editConfig.categoryId,
        isActive: configForm.isActive,
        orderOverride: configForm.orderOverride,
        groupOverride: configForm.groupOverride || undefined,
        isFeatured: configForm.isFeatured,
      });
      toast.success('Category config updated');
      setEditConfig(null);
      refetch();
    } catch {
      toast.error('Failed to update config');
    } finally {
      setIsSaving(false);
    }
  };

  const enabledCount = useMemo(() => {
    if (!categories || !configs || !Array.isArray(configs)) return 0;
    return categories.filter(cat => {
      const config = configs.find((c: LocCatConfig) => c.categoryId === cat._id);
      return config?.isActive;
    }).length;
  }, [categories, configs]);

  return (
    <div className="space-y-4">
      {/* Location Selection & Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="input-field pl-10 bg-gray-50 border-gray-200 appearance-none cursor-pointer w-full pr-8"
            >
              <option value="">Choose a location...</option>
              {locations?.map(l => <option key={l._id} value={l._id}>{l.name} ({l.countryCode})</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          {selectedLocationId && (
            <>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="input-field pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer">
                  <option value="">All</option>
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              <button onClick={() => refetch()} className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {!selectedLocationId ? (
        <EmptyState icon={MapPin} title="Select a location" description="Choose a location above to configure which categories are available there." />
      ) : isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Location Categories</h3>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  {enabledCount} enabled of {categories?.length || 0}
                </span>
              </div>
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No categories match your search</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Group Override</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Featured</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Enabled</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCategories.map(cat => {
                  const config = getConfig(cat._id);
                  const active = config?.isActive ?? false;
                  return (
                    <tr key={cat._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {cat.iconUrl ? (
                            <div className="w-9 h-9 rounded-xl overflow-hidden border border-gray-200 bg-white flex items-center justify-center shadow-sm">
                              <img src={cat.iconUrl} alt={cat.name} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-gradient-to-br from-ruby-400 to-ruby-600' : 'bg-gray-200'}`}>
                              <FolderTree className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-500'}`} />
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-sm text-gray-900">{cat.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <GroupTypeBadge type={cat.defaultGroupType} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {config?.groupOverride ? (
                          <GroupTypeBadge type={config.groupOverride} />
                        ) : (
                          <span className="text-xs text-gray-400">Default</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {config?.orderOverride !== undefined ? (
                          <span className="text-sm font-medium text-gray-700">{config.orderOverride}</span>
                        ) : (
                          <span className="text-xs text-gray-400">{cat.displayOrder}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {config?.isFeatured ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                            <Activity className="w-3 h-3" /> Featured
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggle(cat._id, !active)}
                          className={`relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ruby-400 ${active ? 'bg-ruby-600' : 'bg-gray-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transform transition duration-200 ease-in-out ${active ? 'translate-x-[20px]' : 'translate-x-[2px]'} mt-[2px]`} />
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <ActionButton icon={Settings} tooltip="Configure" onClick={() => openConfigure(cat)} variant="blue" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Configure Modal */}
      {editConfig && (
        <Modal isOpen onClose={() => setEditConfig(null)} title={`Configure: ${editConfig.categoryName}`} size="sm">
          <form onSubmit={handleConfigSave} className="space-y-6">
            <div className="space-y-4">
              <SectionHeader icon={Settings} title="Location Overrides" description="Customize this category for the selected location" />

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors">
                <div>
                  <span className="text-sm font-medium text-gray-800">Enabled</span>
                  <p className="text-[11px] text-gray-400 mt-0.5">Show this category in this location</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfigForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ruby-400 ${configForm.isActive ? 'bg-ruby-600' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transform transition duration-200 ease-in-out ${configForm.isActive ? 'translate-x-[20px]' : 'translate-x-[2px]'} mt-[2px]`} />
                </button>
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors">
                <div>
                  <span className="text-sm font-medium text-gray-800">Featured</span>
                  <p className="text-[11px] text-gray-400 mt-0.5">Highlight this category in the location</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfigForm(prev => ({ ...prev, featured: !prev.isFeatured }))}
                  className={`relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ruby-400 ${configForm.isFeatured ? 'bg-amber-500' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transform transition duration-200 ease-in-out ${configForm.isFeatured ? 'translate-x-[20px]' : 'translate-x-[2px]'} mt-[2px]`} />
                </button>
              </label>

              <div>
                <label className="label-text">Display Order Override</label>
                <input
                  type="number"
                  value={configForm.orderOverride ?? ''}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, orderOverride: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="input-field"
                  placeholder="Leave empty to use default"
                />
                <p className="text-[11px] text-gray-400 mt-1">Override the display order for this location only</p>
              </div>

              <div>
                <label className="label-text">Group Override</label>
                <div className="relative">
                  <select
                    value={configForm.groupOverride || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, groupOverride: e.target.value }))}
                    className="input-field w-full pr-8 appearance-none cursor-pointer"
                  >
                    <option value="">No override (use default)</option>
                    <option value="TOP_TILES">Top Tiles</option>
                    <option value="MORE">More</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Move this category to a different group in this location</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
              <button type="button" onClick={() => setEditConfig(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2">
                {isSaving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> Save Config</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
