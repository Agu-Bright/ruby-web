'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  FileText, Plus, Pencil, Eye, Power, PowerOff, Search, RefreshCw,
  ChevronDown, Activity, Check, X, AlertCircle, Hash, Trash2,
  GripVertical, Filter, Settings, Layers, Type, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Modal, StatCard, StatusBadge } from '@/components/ui';
import { TEMPLATE_PRESETS } from '@/lib/template-presets';
import type {
  Template, TemplateField, TemplateFieldOption,
  CreateTemplateRequest, FieldType, FilterType,
} from '@/lib/types';

// ─── Config & Constants ────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string; group: string }[] = [
  { value: 'TEXT', label: 'Text', group: 'Basic' },
  { value: 'TEXTAREA', label: 'Text Area', group: 'Basic' },
  { value: 'NUMBER', label: 'Number', group: 'Basic' },
  { value: 'BOOLEAN', label: 'Yes / No', group: 'Basic' },
  { value: 'SELECT', label: 'Dropdown', group: 'Choice' },
  { value: 'MULTISELECT', label: 'Multi Select', group: 'Choice' },
  { value: 'RANGE', label: 'Range', group: 'Numeric' },
  { value: 'PRICE', label: 'Price', group: 'Numeric' },
  { value: 'DATE', label: 'Date', group: 'Date/Time' },
  { value: 'TIME', label: 'Time', group: 'Date/Time' },
  { value: 'DURATION', label: 'Duration', group: 'Date/Time' },
  { value: 'PHONE', label: 'Phone', group: 'Contact' },
  { value: 'EMAIL', label: 'Email', group: 'Contact' },
  { value: 'URL', label: 'URL', group: 'Contact' },
  { value: 'MEDIA', label: 'Media Upload', group: 'Media' },
];

const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'RADIO', label: 'Radio' },
  { value: 'RANGE_SLIDER', label: 'Range Slider' },
  { value: 'MULTI_CHECKBOX', label: 'Multi Checkbox' },
  { value: 'TOGGLE', label: 'Toggle' },
];

const FIELD_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  TEXT: { label: 'Text', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
  TEXTAREA: { label: 'Text Area', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
  NUMBER: { label: 'Number', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  BOOLEAN: { label: 'Yes/No', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  SELECT: { label: 'Dropdown', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  MULTISELECT: { label: 'Multi Select', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  MEDIA: { label: 'Media', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  RANGE: { label: 'Range', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  PRICE: { label: 'Price', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  DATE: { label: 'Date', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  TIME: { label: 'Time', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  DURATION: { label: 'Duration', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  PHONE: { label: 'Phone', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  EMAIL: { label: 'Email', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  URL: { label: 'URL', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
};

function emptyField(order: number): TemplateField {
  return {
    key: '',
    label: '',
    type: 'TEXT',
    required: false,
    isPublic: true,
    isFilter: false,
    options: [],
    order,
  };
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

function FieldTypeBadge({ type }: { type: string }) {
  const cfg = FIELD_TYPE_CONFIG[type] || { label: type, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
      {cfg.label}
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

export default function TemplatesPage() {
  const { data: templates, isLoading, error, refetch } = useApi<Template[]>(() => api.templates.list(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewTemplate, setViewTemplate] = useState<Template | null>(null);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<CreateTemplateRequest>({ name: '', description: '', fields: [emptyField(0)] });

  const stats = useMemo(() => {
    const total = templates?.length || 0;
    const active = templates?.filter(t => t.isActive).length || 0;
    const totalFields = templates?.reduce((sum, t) => sum + t.fields.length, 0) || 0;
    const filterFields = templates?.reduce((sum, t) => sum + t.fields.filter(f => f.isFilter).length, 0) || 0;
    return { total, active, totalFields, filterFields };
  }, [templates]);

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
      }
      if (statusFilter === 'active' && !t.isActive) return false;
      if (statusFilter === 'inactive' && t.isActive) return false;
      return true;
    });
  }, [templates, searchQuery, statusFilter]);

  const resetForm = useCallback(() => {
    setForm({ name: '', description: '', fields: [emptyField(0)] });
  }, []);

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const openEdit = (tmpl: Template) => {
    setForm({
      name: tmpl.name,
      description: tmpl.description,
      fields: tmpl.fields.length > 0 ? tmpl.fields : [emptyField(0)],
    });
    setEditTemplate(tmpl);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error('Template name is required'); return; }
    setIsSubmitting(true);
    try {
      const validFields = (form.fields || []).filter(f => f.key && f.label).map((f, i) => ({ ...f, order: i }));
      await api.templates.create({ ...form, fields: validFields });
      toast.success('Template created');
      setShowCreate(false);
      resetForm();
      refetch();
    } catch {
      toast.error('Failed to create template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTemplate) return;
    setIsSubmitting(true);
    try {
      const validFields = (form.fields || []).filter(f => f.key && f.label).map((f, i) => ({ ...f, order: i }));
      await api.templates.update(editTemplate._id, { ...form, fields: validFields });
      toast.success('Template updated');
      setEditTemplate(null);
      refetch();
    } catch {
      toast.error('Failed to update template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (tmpl: Template) => {
    try {
      if (tmpl.isActive) {
        await api.templates.deactivate(tmpl._id);
        toast.success('Template deactivated');
      } else {
        await api.templates.update(tmpl._id, { name: tmpl.name });
        toast.success('Template reactivated');
      }
      refetch();
    } catch {
      toast.error('Failed to update template status');
    }
  };

  const handleDelete = async (tmpl: Template) => {
    if (!confirm(`Delete template "${tmpl.name}"? This cannot be undone.`)) return;
    try {
      await api.templates.delete(tmpl._id);
      toast.success('Template deleted');
      refetch();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const updateField = (index: number, updates: Partial<TemplateField>) => {
    setForm(prev => ({
      ...prev,
      fields: (prev.fields || []).map((f, i) => i === index ? { ...f, ...updates } : f),
    }));
  };

  const removeField = (index: number) => {
    setForm(prev => ({
      ...prev,
      fields: (prev.fields || []).filter((_, i) => i !== index),
    }));
  };

  const addField = () => {
    setForm(prev => ({
      ...prev,
      fields: [...(prev.fields || []), emptyField((prev.fields || []).length)],
    }));
  };

  // ─── Field Builder (shared between Create & Edit) ──────

  const renderFieldBuilder = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader icon={Layers} title="Template Fields" description="Define the form fields businesses will fill out" />
      </div>
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {(form.fields || []).map((field, index) => (
          <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <GripVertical className="w-3.5 h-3.5" />
                <span className="font-semibold">Field {index + 1}</span>
                {field.type && <FieldTypeBadge type={field.type} />}
              </div>
              <button type="button" onClick={() => removeField(index)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 font-medium">Key</label>
                <input type="text" className="input-field text-sm font-mono" value={field.key} onChange={(e) => updateField(index, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder="field_key" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium">Label</label>
                <input type="text" className="input-field text-sm" value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} placeholder="Display Label" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium">Type</label>
                <div className="relative">
                  <select className="input-field text-sm pr-8 appearance-none cursor-pointer" value={field.type} onChange={(e) => updateField(index, { type: e.target.value as FieldType })}>
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium">Placeholder</label>
                <input type="text" className="input-field text-sm" value={field.placeholder || ''} onChange={(e) => updateField(index, { placeholder: e.target.value })} placeholder="Hint text" />
              </div>
            </div>

            {field.helpText !== undefined && (
              <div>
                <label className="text-[11px] text-gray-500 font-medium">Help Text</label>
                <input type="text" className="input-field text-sm" value={field.helpText || ''} onChange={(e) => updateField(index, { helpText: e.target.value })} placeholder="Additional instructions for the field" />
              </div>
            )}

            {(field.type === 'SELECT' || field.type === 'MULTISELECT') && (
              <div>
                <label className="text-[11px] text-gray-500 font-medium">Options</label>
                <input
                  type="text"
                  className="input-field text-sm"
                  value={(field.options || []).map(o => typeof o === 'string' ? o : o.label).join(', ')}
                  onChange={(e) => updateField(index, {
                    options: e.target.value.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ value: s.toLowerCase().replace(/[^a-z0-9_]/g, '_'), label: s })),
                  })}
                  placeholder="Option 1, Option 2, Option 3"
                />
                <p className="text-[10px] text-gray-400 mt-1">Comma-separated list of options</p>
              </div>
            )}

            <div className="flex items-center gap-5 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={field.required} onChange={(e) => updateField(index, { required: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                <span className="text-gray-700">Required</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={field.isPublic} onChange={(e) => updateField(index, { isPublic: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                <Eye className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-700">Public</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={field.isFilter} onChange={(e) => updateField(index, { isFilter: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-700">Filterable</span>
              </label>
              {field.isFilter && (
                <div className="relative">
                  <select className="input-field text-sm w-36 pr-8 appearance-none cursor-pointer" value={field.filterType || ''} onChange={(e) => updateField(index, { filterType: (e.target.value || undefined) as FilterType | undefined })}>
                    <option value="">Filter type...</option>
                    {FILTER_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addField} className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-ruby-400 hover:text-ruby-600 transition-colors">
        + Add Field
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Template Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Define dynamic form templates for business onboarding</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Templates" value={stats.total} icon={FileText} />
        <StatCard title="Active" value={stats.active} icon={Activity} className="border-l-4 border-l-emerald-500" />
        <StatCard title="Total Fields" value={stats.totalFields} icon={Type} className="border-l-4 border-l-purple-400" />
        <StatCard title="Filter Fields" value={stats.filterFields} icon={Filter} className="border-l-4 border-l-blue-400" />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search templates..." className="input-field pl-10 bg-gray-50 border-gray-200 focus:bg-white" />
          </div>
          <div className="flex items-center gap-3">
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
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && !isLoading && (
        <div className="card p-6 border-red-200 bg-gradient-to-r from-red-50 to-red-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0"><AlertCircle className="w-6 h-6 text-red-600" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Failed to load templates</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button onClick={() => refetch()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900"><RefreshCw className="w-3.5 h-3.5" /> Try again</button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoadingSkeleton rows={4} />}

      {!isLoading && !error && (!templates || templates.length === 0) && (
        <EmptyState icon={FileText} title="No templates yet" description="Create your first template to define dynamic forms for business onboarding." actionLabel="Create First Template" onAction={openCreate} />
      )}

      {/* Table */}
      {!isLoading && !error && templates && templates.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Templates</h3>
              <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{filtered.length} of {templates.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Template</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fields</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Version</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-500">No templates match your filters</p>
                    </td>
                  </tr>
                ) : filtered.map(tmpl => {
                  const pubFields = tmpl.fields.filter(f => f.isPublic).length;
                  const filterFields = tmpl.fields.filter(f => f.isFilter).length;
                  return (
                    <tr key={tmpl._id} className="group hover:bg-gray-50/80 transition-colors cursor-pointer" onClick={() => setViewTemplate(tmpl)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-semibold text-gray-900 text-sm">{tmpl.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-gray-500 max-w-[200px] truncate block">{tmpl.description || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 font-medium">{tmpl.fields.length}</span>
                          <span className="text-[10px] text-gray-400">({pubFields} public, {filterFields} filter)</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-200">
                          v{tmpl.version}
                        </span>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={tmpl.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <ActionButton icon={Eye} tooltip="View" onClick={(e) => { e.stopPropagation(); setViewTemplate(tmpl); }} variant="default" />
                          <ActionButton icon={Pencil} tooltip="Edit" onClick={(e) => { e.stopPropagation(); openEdit(tmpl); }} variant="blue" />
                          {tmpl.isActive ? (
                            <ActionButton icon={PowerOff} tooltip="Deactivate" onClick={(e) => { e.stopPropagation(); handleToggleStatus(tmpl); }} variant="red" />
                          ) : (
                            <ActionButton icon={Power} tooltip="Activate" onClick={(e) => { e.stopPropagation(); handleToggleStatus(tmpl); }} variant="green" />
                          )}
                          <ActionButton icon={Trash2} tooltip="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(tmpl); }} variant="red" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title="Create Template" size="xl">
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Preset Suggestions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-800">Start from a Preset</h3>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">Optional</span>
            </div>
            <p className="text-xs text-gray-500">Choose a preset to auto-fill fields, or start from scratch below.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {TEMPLATE_PRESETS.map(preset => {
                const Icon = preset.icon;
                const isSelected = form.name === preset.name + ' Template';
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setForm({
                        name: preset.name + ' Template',
                        description: preset.description,
                        fields: preset.fields.map(f => ({ ...f })),
                      });
                      toast.success(`Loaded "${preset.name}" preset with ${preset.fields.length} fields`);
                    }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 text-center
                      ${isSelected
                        ? 'border-ruby-400 bg-ruby-50/50 shadow-sm shadow-ruby-500/10'
                        : 'border-gray-150 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${preset.color} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-ruby-700' : 'text-gray-700'}`}>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-200" />

          <div className="space-y-4">
            <SectionHeader icon={FileText} title="Basic Information" description="Name and describe this template" />
            <div>
              <label className="label-text">Template Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required placeholder="e.g. Restaurant Onboarding" />
            </div>
            <div>
              <label className="label-text">Description</label>
              <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows={2} placeholder="What is this template for?" />
            </div>
          </div>

          {renderFieldBuilder()}

          <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-200">
            <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Template</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {viewTemplate && (
        <Modal isOpen onClose={() => setViewTemplate(null)} title="Template Details" size="xl">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-xl border border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <h3 className="text-xl font-bold text-gray-900 truncate">{viewTemplate.name}</h3>
                  <StatusBadge status={viewTemplate.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-200">v{viewTemplate.version}</span>
                </div>
                {viewTemplate.description && (
                  <p className="text-sm text-gray-500 leading-relaxed">{viewTemplate.description}</p>
                )}
              </div>
            </div>

            {/* Info */}
            <div>
              <SectionHeader icon={Settings} title="Template Info" />
              <div className="grid grid-cols-3 gap-3 mt-4">
                <DetailCard icon={Hash} label="Total Fields" value={String(viewTemplate.fields.length)} />
                <DetailCard icon={Eye} label="Public Fields" value={String(viewTemplate.fields.filter(f => f.isPublic).length)} />
                <DetailCard icon={Filter} label="Filter Fields" value={String(viewTemplate.fields.filter(f => f.isFilter).length)} />
              </div>
            </div>

            {/* Fields */}
            <div>
              <SectionHeader icon={Layers} title="Fields" description={`${viewTemplate.fields.length} fields defined`} />
              <div className="mt-4 space-y-2">
                {viewTemplate.fields.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No fields defined</p>
                ) : viewTemplate.fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                    <span className="text-xs text-gray-400 font-semibold w-6">{i + 1}</span>
                    <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-700">{f.key}</span>
                    <span className="font-medium text-sm text-gray-800 flex-1">{f.label}</span>
                    <FieldTypeBadge type={f.type} />
                    <div className="flex items-center gap-2">
                      {f.required && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-semibold border border-red-200">Required</span>}
                      {f.isPublic && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-semibold border border-emerald-200 flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5" /> Public
                        </span>
                      )}
                      {f.isFilter && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold border border-blue-200 flex items-center gap-0.5">
                          <Filter className="w-2.5 h-2.5" /> Filter
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button onClick={() => { setViewTemplate(null); openEdit(viewTemplate); }} className="btn-primary flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Edit Template
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editTemplate && (
        <Modal isOpen onClose={() => { setEditTemplate(null); resetForm(); }} title={`Edit: ${editTemplate.name}`} size="xl">
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="space-y-4">
              <SectionHeader icon={FileText} title="Basic Information" />
              <div>
                <label className="label-text">Template Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="label-text">Description</label>
                <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows={2} />
              </div>
            </div>

            {renderFieldBuilder()}

            <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
              <button type="button" onClick={() => { setEditTemplate(null); resetForm(); }} className="btn-secondary">Cancel</button>
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
