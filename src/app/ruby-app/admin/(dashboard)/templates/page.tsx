'use client';

import { useState, useCallback } from 'react';
import { FileText, Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, Modal, StatusBadge, type Column } from '@/components/ui';
import type { Template, TemplateField, Subcategory, FieldType, FilterType, CreateTemplateRequest } from '@/lib/types';

const FIELD_TYPES: FieldType[] = ['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'MEDIA', 'RANGE'];
const FILTER_TYPES: FilterType[] = ['EXACT', 'RANGE', 'MULTI', 'BOOLEAN'];

function emptyField(): TemplateField {
  return {
    key: '',
    label: { en: '' },
    type: 'TEXT',
    required: false,
    isPublic: true,
    isFilter: false,
    options: [],
    placeholder: { en: '' },
    order: 0,
  };
}

export default function TemplatesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [fields, setFields] = useState<TemplateField[]>([emptyField()]);

  const { data: templates, meta, isLoading, refetch } = useApi<Template[]>(
    () => api.templates.list(),
    []
  );
  const { data: subcategories } = useApi<Subcategory[]>(
    () => api.subcategories.list(),
    []
  );

  const { mutate: createTemplate, isLoading: creating } = useMutation(
    (data: CreateTemplateRequest) => api.templates.create(data)
  );
  const { mutate: updateTemplate, isLoading: updating } = useMutation(
    ({ id, data }: { id: string; data: Partial<CreateTemplateRequest> }) => api.templates.update(id, data)
  );
  const { mutate: deleteTemplate } = useMutation(
    (id: string) => api.templates.delete(id)
  );

  const resetForm = useCallback(() => {
    setName('');
    setSubcategoryId('');
    setFields([emptyField()]);
    setEditingTemplate(null);
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const openEdit = useCallback((tmpl: Template) => {
    setEditingTemplate(tmpl);
    setName(tmpl.name);
    setSubcategoryId(tmpl.subcategoryId);
    setFields(tmpl.fields.length > 0 ? tmpl.fields : [emptyField()]);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const result = await deleteTemplate(id);
    if (result !== null) {
      toast.success('Template deleted');
      refetch();
    }
  }, [deleteTemplate, refetch]);

  const handleSubmit = useCallback(async () => {
    const validFields = fields.filter(f => f.key && (typeof f.label === 'string' ? f.label : f.label?.en));
    if (!name || !subcategoryId) {
      toast.error('Name and subcategory are required');
      return;
    }
    const payload: CreateTemplateRequest = {
      name,
      subcategoryId,
      fields: validFields.map((f, i) => ({ ...f, order: i })),
    };
    if (editingTemplate) {
      const result = await updateTemplate({ id: editingTemplate._id, data: payload });
      if (result) {
        toast.success('Template updated');
        setShowModal(false);
        refetch();
      }
    } else {
      const result = await createTemplate(payload);
      if (result) {
        toast.success('Template created');
        setShowModal(false);
        refetch();
      }
    }
  }, [name, subcategoryId, fields, editingTemplate, createTemplate, updateTemplate, refetch]);

  const updateField = useCallback((index: number, updates: Partial<TemplateField>) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  }, []);

  const removeField = useCallback((index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addField = useCallback(() => {
    setFields(prev => [...prev, emptyField()]);
  }, []);

  const subMap = (subcategories || []).reduce((acc, s) => {
    acc[s._id] = s.titles?.en || s.slug;
    return acc;
  }, {} as Record<string, string>);

  const columns: Column<Template>[] = [
    {
      key: 'name',
      header: 'Template',
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{t.name}</div>
            <div className="text-xs text-gray-500">{t.fields.length} fields · v{t.version}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'subcategory',
      header: 'Subcategory',
      render: (t) => <span className="text-sm">{subMap[t.subcategoryId] || t.subcategoryId}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusBadge status={t.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'fields',
      header: 'Public / Filter',
      render: (t) => {
        const pub = t.fields.filter(f => f.isPublic).length;
        const fil = t.fields.filter(f => f.isFilter).length;
        return <span className="text-sm text-gray-600">{pub} public · {fil} filterable</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (t) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(t); }} className="p-1.5 rounded hover:bg-gray-100" title="Edit">
            <Pencil className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(t._id); }} className="p-1.5 rounded hover:bg-red-50" title="Delete">
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Manage dynamic form templates for business onboarding"
        action={<button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" /> New Template</button>}
      />

      <DataTable
        columns={columns}
        data={templates || []}
        meta={meta}
        isLoading={isLoading}
        emptyMessage="No templates yet"
        onRowClick={(t) => setExpandedRow(expandedRow === t._id ? null : t._id)}
      />

      {/* Expanded field preview */}
      {expandedRow && templates?.find(t => t._id === expandedRow) && (
        <div className="card p-4 animate-slide-down">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Fields for &ldquo;{templates.find(t => t._id === expandedRow)!.name}&rdquo;
          </h4>
          <div className="grid gap-2">
            {templates.find(t => t._id === expandedRow)!.fields.map((f, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded">{f.key}</span>
                <span className="font-medium">{typeof f.label === 'string' ? f.label : f.label?.en || ''}</span>
                <span className="text-gray-400 text-xs uppercase">{f.type}</span>
                <div className="flex items-center gap-2 ml-auto">
                  {f.required && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">required</span>}
                  {f.isPublic && <Eye className="w-3.5 h-3.5 text-green-500" />}
                  {f.isFilter && <Filter className="w-3.5 h-3.5 text-blue-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTemplate ? 'Edit Template' : 'Create Template'} size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Template Name</label>
              <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Restaurant Template" />
            </div>
            <div>
              <label className="label">Subcategory</label>
              <select className="input" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)}>
                <option value="">Select subcategory...</option>
                {(subcategories || []).map(s => (
                  <option key={s._id} value={s._id}>{s.titles?.en || s.slug}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Template Fields</label>
              <button onClick={addField} className="text-xs text-ruby-600 hover:text-ruby-700 font-medium">+ Add Field</button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {fields.map((field, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <GripVertical className="w-3.5 h-3.5" />
                      Field {index + 1}
                    </div>
                    <button onClick={() => removeField(index)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Key</label>
                      <input type="text" className="input text-sm" value={field.key} onChange={(e) => updateField(index, { key: e.target.value })} placeholder="field_key" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Label</label>
                      <input type="text" className="input text-sm" value={typeof field.label === 'string' ? field.label : field.label?.en || ''} onChange={(e) => updateField(index, { label: { ...(typeof field.label === 'object' ? field.label : {}), en: e.target.value } })} placeholder="Display Label" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Type</label>
                      <select className="input text-sm" value={field.type} onChange={(e) => updateField(index, { type: e.target.value as FieldType })}>
                        {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Placeholder</label>
                      <input type="text" className="input text-sm" value={typeof field.placeholder === 'string' ? field.placeholder : field.placeholder?.en || ''} onChange={(e) => updateField(index, { placeholder: { ...(typeof field.placeholder === 'object' ? field.placeholder : {}), en: e.target.value } })} />
                    </div>
                  </div>

                  {(field.type === 'SELECT' || field.type === 'MULTISELECT') && (
                    <div>
                      <label className="text-xs text-gray-500">Options (comma-separated)</label>
                      <input type="text" className="input text-sm" value={(field.options || []).join(', ')} onChange={(e) => updateField(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Option 1, Option 2, Option 3" />
                    </div>
                  )}

                  <div className="flex items-center gap-5">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={field.required} onChange={(e) => updateField(index, { required: e.target.checked })} className="rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                      Required
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={field.isPublic} onChange={(e) => updateField(index, { isPublic: e.target.checked })} className="rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                      <Eye className="w-3.5 h-3.5" /> Public
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={field.isFilter} onChange={(e) => updateField(index, { isFilter: e.target.checked })} className="rounded border-gray-300 text-ruby-600 focus:ring-ruby-500" />
                      <Filter className="w-3.5 h-3.5" /> Filterable
                    </label>
                    {field.isFilter && (
                      <select className="input text-sm w-32" value={field.filterType || ''} onChange={(e) => updateField(index, { filterType: (e.target.value || undefined) as FilterType | undefined })}>
                        <option value="">Filter type...</option>
                        {FILTER_TYPES.map(ft => <option key={ft} value={ft}>{ft}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={creating || updating}>
              {creating || updating ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
