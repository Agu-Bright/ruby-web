'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Rocket, ChevronDown, ChevronRight, Check, X, Loader2,
  Layers, Tag, FolderTree, FileText, Package, MapPin, Calendar,
  ArrowLeft, AlertTriangle, SkipForward, RefreshCw, CheckCircle2,
  XCircle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { TEMPLATE_PRESETS } from '@/lib/template-presets';
import {
  SEED_CATEGORY_GROUPS, SEED_CATEGORIES, SEED_SUBCATEGORIES,
} from '@/lib/taxonomy-seed-data';
import type {
  CategoryGroup, Category, Subcategory, Template,
} from '@/lib/types';

// ─── Types ─────────────────────────────────────────────────

type ItemStatus = 'pending' | 'creating' | 'success' | 'skipped' | 'failed';
type Phase = 'idle' | 'groups' | 'categories' | 'templates' | 'subcategories' | 'done';

interface SetupItem {
  id: string;
  phase: Phase;
  type: string;
  name: string;
  status: ItemStatus;
  error?: string;
  createdId?: string;
}

const BUSINESS_MODEL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  ORDER_DELIVERY: { label: 'Order & Delivery', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Package },
  VISIT_ONLY: { label: 'Visit Only', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: MapPin },
  BOOKING_VISIT: { label: 'Booking & Visit', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: Calendar },
};

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'Ready',
  groups: 'Category Groups',
  categories: 'Categories',
  templates: 'Templates',
  subcategories: 'Subcategories',
  done: 'Complete',
};

const PHASE_ORDER: Phase[] = ['groups', 'categories', 'templates', 'subcategories'];

// ─── Helpers ───────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function BusinessModelBadge({ model }: { model?: string }) {
  if (!model) return <span className="text-gray-400 text-xs">--</span>;
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

function StatusIcon({ status }: { status: ItemStatus }) {
  switch (status) {
    case 'pending': return <Clock className="w-4 h-4 text-gray-300" />;
    case 'creating': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'skipped': return <SkipForward className="w-4 h-4 text-amber-500" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
  }
}

// ─── Main Page ─────────────────────────────────────────────

export default function TaxonomySetupPage() {
  // Existing data (pre-flight check)
  const [existingGroups, setExistingGroups] = useState<CategoryGroup[]>([]);
  const [existingCategories, setExistingCategories] = useState<Category[]>([]);
  const [existingSubcategories, setExistingSubcategories] = useState<Subcategory[]>([]);
  const [existingTemplates, setExistingTemplates] = useState<Template[]>([]);
  const [preflightLoading, setPreflightLoading] = useState(true);

  // Setup state
  const [skipExisting, setSkipExisting] = useState(true);
  const [items, setItems] = useState<SetupItem[]>([]);
  const [currentPhase, setCurrentPhase] = useState<Phase>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const abortRef = useRef(false);

  // Preview expand states
  const [expandGroups, setExpandGroups] = useState(false);
  const [expandCategories, setExpandCategories] = useState(true);
  const [expandTemplates, setExpandTemplates] = useState(false);
  const [expandSubcategories, setExpandSubcategories] = useState(false);

  // ─── Pre-flight Check ──────────────────────────────────

  const runPreflight = useCallback(async () => {
    setPreflightLoading(true);
    try {
      const [groupsRes, catsRes, subsRes, tmplsRes] = await Promise.all([
        api.categoryGroups.list().catch(() => ({ data: [] as CategoryGroup[] })),
        api.categories.list().catch(() => ({ data: [] as Category[] })),
        api.subcategories.list().catch(() => ({ data: [] as Subcategory[] })),
        api.templates.list().catch(() => ({ data: [] as Template[] })),
      ]);
      setExistingGroups(groupsRes.data || []);
      setExistingCategories(catsRes.data || []);
      setExistingSubcategories(subsRes.data || []);
      setExistingTemplates(tmplsRes.data || []);
    } catch {
      toast.error('Failed to check existing data');
    } finally {
      setPreflightLoading(false);
    }
  }, []);

  useEffect(() => { runPreflight(); }, [runPreflight]);

  const hasExistingData = existingGroups.length > 0 || existingCategories.length > 0 ||
    existingSubcategories.length > 0 || existingTemplates.length > 0;

  // ─── Stats ─────────────────────────────────────────────

  const successCount = items.filter(i => i.status === 'success').length;
  const skippedCount = items.filter(i => i.status === 'skipped').length;
  const failedCount = items.filter(i => i.status === 'failed').length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round(((successCount + skippedCount + failedCount) / totalCount) * 100) : 0;

  // ─── Execution Engine ──────────────────────────────────

  const updateItem = useCallback((id: string, updates: Partial<SetupItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const runSetup = useCallback(async () => {
    abortRef.current = false;
    setIsRunning(true);
    setIsDone(false);
    setShowConfirm(false);

    // Build the items list
    const allItems: SetupItem[] = [];

    // Phase 1: Groups
    for (const g of SEED_CATEGORY_GROUPS) {
      allItems.push({ id: `group-${g._seedKey}`, phase: 'groups', type: 'Group', name: g.name, status: 'pending' });
    }
    // Phase 2: Categories
    for (const c of SEED_CATEGORIES) {
      allItems.push({ id: `cat-${c._seedKey}`, phase: 'categories', type: 'Category', name: c.name, status: 'pending' });
    }
    // Phase 3: Templates
    for (const t of TEMPLATE_PRESETS) {
      allItems.push({ id: `tmpl-${t.id}`, phase: 'templates', type: 'Template', name: `${t.name} Template`, status: 'pending' });
    }
    // Phase 4: Subcategories
    for (const s of SEED_SUBCATEGORIES) {
      allItems.push({ id: `sub-${s.slug}`, phase: 'subcategories', type: 'Subcategory', name: s.name, status: 'pending' });
    }

    setItems(allItems);

    // Maps for cross-referencing
    const groupIdMap = new Map<string, string>();
    const categoryIdMap = new Map<string, string>();
    const templateIdMap = new Map<string, string>();

    // Pre-populate maps with existing data if skip-existing is enabled
    if (skipExisting) {
      for (const g of existingGroups) {
        groupIdMap.set(g.slug, g._id);
      }
      for (const c of existingCategories) {
        categoryIdMap.set(c.slug, c._id);
      }
      for (const t of existingTemplates) {
        // Match templates by name (strip " Template" suffix for matching)
        const baseName = t.name.replace(/ Template$/, '').toLowerCase();
        for (const preset of TEMPLATE_PRESETS) {
          if (preset.name.toLowerCase() === baseName || t.name.toLowerCase() === (preset.name + ' template').toLowerCase()) {
            templateIdMap.set(preset.id, t._id);
          }
        }
      }
    }

    // Helper to check if slug already exists
    const existingGroupSlugs = new Set(existingGroups.map(g => g.slug));
    const existingCategorySlugs = new Set(existingCategories.map(c => c.slug));
    const existingSubcategorySlugs = new Set(existingSubcategories.map(s => s.slug));
    const existingTemplateNames = new Set(existingTemplates.map(t => t.name.toLowerCase()));

    // ── Phase 1: Category Groups ──
    setCurrentPhase('groups');
    for (const group of SEED_CATEGORY_GROUPS) {
      if (abortRef.current) break;
      const itemId = `group-${group._seedKey}`;

      if (skipExisting && existingGroupSlugs.has(group.slug)) {
        const existing = existingGroups.find(g => g.slug === group.slug);
        if (existing) groupIdMap.set(group._seedKey, existing._id);
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'skipped' } : i));
        continue;
      }

      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'creating' } : i));
      try {
        const { _seedKey, ...payload } = group;
        const res = await api.categoryGroups.create(payload);
        groupIdMap.set(group._seedKey, res.data._id);
        updateItem(itemId, { status: 'success', createdId: res.data._id });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        updateItem(itemId, { status: 'failed', error: msg });
      }
      await delay(100);
    }

    // ── Phase 2: Categories ──
    setCurrentPhase('categories');
    for (const cat of SEED_CATEGORIES) {
      if (abortRef.current) break;
      const itemId = `cat-${cat._seedKey}`;

      if (skipExisting && existingCategorySlugs.has(cat.slug)) {
        const existing = existingCategories.find(c => c.slug === cat.slug);
        if (existing) categoryIdMap.set(cat._seedKey, existing._id);
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'skipped' } : i));
        continue;
      }

      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'creating' } : i));
      try {
        const { _seedKey, _groupSeedKey, ...rest } = cat;
        const groupId = groupIdMap.get(_groupSeedKey);
        const payload = { ...rest, ...(groupId ? { defaultGroupId: groupId } : {}) };
        const res = await api.categories.create(payload);
        categoryIdMap.set(cat._seedKey, res.data._id);
        updateItem(itemId, { status: 'success', createdId: res.data._id });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        updateItem(itemId, { status: 'failed', error: msg });
      }
      await delay(100);
    }

    // ── Phase 3: Templates ──
    setCurrentPhase('templates');
    for (const preset of TEMPLATE_PRESETS) {
      if (abortRef.current) break;
      const itemId = `tmpl-${preset.id}`;
      const templateName = `${preset.name} Template`;

      if (skipExisting && existingTemplateNames.has(templateName.toLowerCase())) {
        // Already mapped in pre-populate above
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'skipped' } : i));
        continue;
      }

      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'creating' } : i));
      try {
        const res = await api.templates.create({
          name: templateName,
          description: preset.description,
          fields: preset.fields.map(f => ({ ...f })),
        });
        templateIdMap.set(preset.id, res.data._id);
        updateItem(itemId, { status: 'success', createdId: res.data._id });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        updateItem(itemId, { status: 'failed', error: msg });
      }
      await delay(100);
    }

    // ── Phase 4: Subcategories ──
    setCurrentPhase('subcategories');
    for (const sub of SEED_SUBCATEGORIES) {
      if (abortRef.current) break;
      const itemId = `sub-${sub.slug}`;

      if (skipExisting && existingSubcategorySlugs.has(sub.slug)) {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'skipped' } : i));
        continue;
      }

      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'creating' } : i));
      try {
        const categoryId = categoryIdMap.get(sub._categorySeedKey);
        if (!categoryId) throw new Error(`Category "${sub._categorySeedKey}" not found — was it created?`);

        const templateId = sub._templatePresetId ? templateIdMap.get(sub._templatePresetId) : undefined;

        const { _categorySeedKey, _templatePresetId, ...rest } = sub;
        const payload = {
          ...rest,
          categoryId,
          ...(templateId ? { templateId } : {}),
        };
        const res = await api.subcategories.create(payload);
        updateItem(itemId, { status: 'success', createdId: res.data._id });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        updateItem(itemId, { status: 'failed', error: msg });
      }
      await delay(100);
    }

    setCurrentPhase('done');
    setIsRunning(false);
    setIsDone(true);

    if (!abortRef.current) {
      toast.success('Taxonomy setup complete!');
    }
  }, [skipExisting, existingGroups, existingCategories, existingSubcategories, existingTemplates, updateItem]);

  const handleAbort = () => {
    abortRef.current = true;
    toast.info('Setup will stop after the current item');
  };

  // ─── Categorize subcategories by parent for preview ────

  const subcategoriesByCategory = SEED_CATEGORIES.map(cat => ({
    category: cat,
    subcategories: SEED_SUBCATEGORIES.filter(s => s._categorySeedKey === cat._seedKey),
  }));

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/ruby-app/admin/taxonomy"
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 bg-gradient-to-br from-ruby-500 to-ruby-700 rounded-xl flex items-center justify-center shadow-lg shadow-ruby-500/20">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Taxonomy Quick Setup</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Auto-generate the official Ruby+ categories, subcategories & templates in one click
            </p>
          </div>
        </div>
      </div>

      {/* Pre-flight Status */}
      {preflightLoading ? (
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            <span className="text-sm text-gray-500">Checking existing taxonomy data...</span>
          </div>
        </div>
      ) : hasExistingData ? (
        <div className="card p-5 border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-amber-800">Existing data detected</h3>
              <p className="text-sm text-amber-600 mt-1">
                Found {existingGroups.length} group{existingGroups.length !== 1 ? 's' : ''},{' '}
                {existingCategories.length} categor{existingCategories.length !== 1 ? 'ies' : 'y'},{' '}
                {existingSubcategories.length} subcategor{existingSubcategories.length !== 1 ? 'ies' : 'y'},{' '}
                {existingTemplates.length} template{existingTemplates.length !== 1 ? 's' : ''}.
              </p>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipExisting}
                  onChange={(e) => setSkipExisting(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500"
                />
                <span className="text-sm font-medium text-amber-800">Skip existing items (match by slug/name)</span>
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-5 border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-800">Ready to initialize</h3>
              <p className="text-sm text-emerald-600 mt-0.5">No existing taxonomy data found. You can safely initialize everything.</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {!isRunning && !isDone && (
        <div className="space-y-3">
          {/* Category Groups Preview */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setExpandGroups(!expandGroups)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Category Groups</h3>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  {SEED_CATEGORY_GROUPS.length}
                </span>
              </div>
              {expandGroups ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {expandGroups && (
              <div className="px-5 pb-4 space-y-2">
                {SEED_CATEGORY_GROUPS.map(g => (
                  <div key={g._seedKey} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Layers className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-800">{g.name}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                      g.type === 'TOP_TILES' ? 'text-ruby-700 bg-ruby-50 border border-ruby-200' : 'text-blue-700 bg-blue-50 border border-blue-200'
                    }`}>
                      {g.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categories Preview */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setExpandCategories(!expandCategories)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FolderTree className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Categories</h3>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  {SEED_CATEGORIES.length}
                </span>
              </div>
              {expandCategories ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {expandCategories && (
              <div className="px-5 pb-4">
                {/* TOP_TILES */}
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-2 mb-2">Top Tiles</p>
                <div className="space-y-2 mb-4">
                  {SEED_CATEGORIES.filter(c => c.defaultGroupType === 'TOP_TILES').map(c => (
                    <div key={c._seedKey} className="py-2.5 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{c.name}</span>
                        <span className="text-[11px] text-ruby-700 bg-ruby-50 border border-ruby-200 px-2 py-0.5 rounded-md font-semibold">TOP_TILES</span>
                      </div>
                      {c.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description}</p>}
                    </div>
                  ))}
                </div>

                {/* MORE */}
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-2 mb-2">More</p>
                <div className="space-y-2">
                  {SEED_CATEGORIES.filter(c => c.defaultGroupType === 'MORE').map(c => (
                    <div key={c._seedKey} className="py-2.5 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{c.name}</span>
                        <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-semibold">MORE</span>
                      </div>
                      {c.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Templates Preview */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setExpandTemplates(!expandTemplates)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Templates</h3>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  {TEMPLATE_PRESETS.length}
                </span>
              </div>
              {expandTemplates ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {expandTemplates && (
              <div className="px-5 pb-4 space-y-2">
                {TEMPLATE_PRESETS.map(t => {
                  const Icon = t.icon;
                  return (
                    <div key={t.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center shadow-sm`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-800">{t.name} Template</span>
                          <p className="text-xs text-gray-400">{t.fields.length} fields</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subcategories Preview */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setExpandSubcategories(!expandSubcategories)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Subcategories</h3>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  {SEED_SUBCATEGORIES.length}
                </span>
              </div>
              {expandSubcategories ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {expandSubcategories && (
              <div className="px-5 pb-4 space-y-4">
                {subcategoriesByCategory.map(({ category, subcategories }) => (
                  <div key={category._seedKey}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-2">{category.name}</p>
                    <div className="space-y-1.5">
                      {subcategories.map(s => (
                        <div key={s.slug} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700">{s.name}</span>
                          <div className="flex items-center gap-2">
                            {s._templatePresetId && (
                              <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-medium">
                                {s._templatePresetId}
                              </span>
                            )}
                            <BusinessModelBadge model={s.businessModel} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Button / Confirmation */}
      {!isRunning && !isDone && !showConfirm && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={preflightLoading}
            className="btn-primary px-8 py-3 text-base font-semibold flex items-center gap-2.5 shadow-lg shadow-ruby-500/20 disabled:opacity-50"
          >
            <Rocket className="w-5 h-5" />
            Initialize Taxonomy
          </button>
        </div>
      )}

      {/* Confirmation Modal (inline) */}
      {showConfirm && !isRunning && !isDone && (
        <div className="card p-6 border-ruby-200 bg-gradient-to-r from-ruby-50/50 to-white">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Confirm Taxonomy Setup</h3>
          <p className="text-sm text-gray-600 mb-4">This will create the following:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="p-3 bg-white rounded-lg border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-900">{SEED_CATEGORY_GROUPS.length}</p>
              <p className="text-xs text-gray-500">Category Groups</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-900">{SEED_CATEGORIES.length}</p>
              <p className="text-xs text-gray-500">Categories</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-900">{TEMPLATE_PRESETS.length}</p>
              <p className="text-xs text-gray-500">Templates</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-900">{SEED_SUBCATEGORIES.length}</p>
              <p className="text-xs text-gray-500">Subcategories</p>
            </div>
          </div>

          {hasExistingData && (
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={skipExisting}
                onChange={(e) => setSkipExisting(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500"
              />
              <span className="text-sm text-gray-700">Skip items that already exist</span>
            </label>
          )}

          <div className="flex items-center gap-3">
            <button onClick={() => setShowConfirm(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={runSetup} className="btn-primary flex items-center gap-2">
              <Rocket className="w-4 h-4" /> Start Setup
            </button>
          </div>
        </div>
      )}

      {/* Progress Section */}
      {(isRunning || isDone) && (
        <div className="space-y-4">
          {/* Phase Stepper */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              {PHASE_ORDER.map((phase, i) => {
                const isActive = currentPhase === phase;
                const isPast = PHASE_ORDER.indexOf(currentPhase as Phase) > i || currentPhase === 'done';
                return (
                  <div key={phase} className="flex items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isPast ? 'bg-emerald-500 text-white' : isActive ? 'bg-ruby-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isPast ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${
                      isActive ? 'text-ruby-700' : isPast ? 'text-emerald-700' : 'text-gray-400'
                    }`}>
                      {PHASE_LABELS[phase]}
                    </span>
                    {i < PHASE_ORDER.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${isPast ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-ruby-500 to-ruby-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">{progressPct}% complete</span>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-emerald-600 font-medium">{successCount} created</span>
                <span className="text-amber-600 font-medium">{skippedCount} skipped</span>
                <span className="text-red-600 font-medium">{failedCount} failed</span>
              </div>
            </div>

            {isRunning && (
              <div className="mt-3 flex justify-end">
                <button onClick={handleAbort} className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Stop
                </button>
              </div>
            )}
          </div>

          {/* Item List */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Progress Details</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-5 py-2.5 transition-colors ${
                    item.status === 'creating' ? 'bg-blue-50/50' :
                    item.status === 'failed' ? 'bg-red-50/30' : ''
                  }`}
                >
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800 font-medium truncate">{item.name}</span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium shrink-0">{item.type}</span>
                    </div>
                    {item.error && <p className="text-xs text-red-500 mt-0.5 truncate">{item.error}</p>}
                  </div>
                  {item.status === 'success' && item.createdId && (
                    <span className="text-[10px] text-gray-400 font-mono shrink-0">{item.createdId.slice(-6)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Post-completion */}
      {isDone && (
        <div className="card p-8 text-center border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Setup Complete!</h3>
          <p className="text-sm text-gray-500 mb-6">
            Created {successCount} items{skippedCount > 0 ? `, skipped ${skippedCount}` : ''}{failedCount > 0 ? `, ${failedCount} failed` : ''}.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/ruby-app/admin/taxonomy"
              className="btn-primary inline-flex items-center gap-2"
            >
              <FolderTree className="w-4 h-4" /> Go to Taxonomy
            </Link>
            <button
              onClick={() => {
                setIsDone(false);
                setCurrentPhase('idle');
                setItems([]);
                runPreflight();
              }}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Run Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
