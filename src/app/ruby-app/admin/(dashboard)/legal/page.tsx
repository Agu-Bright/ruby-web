'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Scale, Search, Plus, Pencil, Trash2, Eye,
  MoreHorizontal, ChevronDown, CheckCircle, XCircle,
  Loader2, FileText, Type, List,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, Modal, type Column } from '@/components/ui';
import type { LegalDocument, LegalDocumentType, LegalSection, LegalDocumentFilterParams } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const TYPE_OPTIONS: { value: LegalDocumentType; label: string }[] = [
  { value: 'MERCHANT_AGREEMENT', label: 'Merchant Agreement' },
  { value: 'TERMS_OF_SERVICE', label: 'Terms of Service' },
  { value: 'PRIVACY_POLICY', label: 'Privacy Policy' },
];

const TYPE_LABELS: Record<string, string> = {
  MERCHANT_AGREEMENT: 'Merchant Agreement',
  TERMS_OF_SERVICE: 'Terms of Service',
  PRIVACY_POLICY: 'Privacy Policy',
};

const EMPTY_FORM = {
  type: 'MERCHANT_AGREEMENT' as LegalDocumentType,
  title: '',
  version: '',
  sections: [] as LegalSection[],
  isActive: false,
  changelog: '',
};

// Convert sections array to plain text for the text editor
function sectionsToText(sections: LegalSection[]): string {
  if (!sections.length) return '';
  return sections.map((s) => {
    const header = `${s.number}. ${s.title}`;
    const items = s.items.map((item) => `- ${item}`).join('\n');
    return `${header}\n${items}`;
  }).join('\n\n');
}

// Parse plain text into sections array
function textToSections(text: string): LegalSection[] {
  const sections: LegalSection[] = [];
  const lines = text.split('\n');
  let current: LegalSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      // blank line — just continue
      continue;
    }

    // Check if it's a section header: "1. Title" or "1) Title" or just a numbered line
    const headerMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (headerMatch) {
      if (current) sections.push(current);
      current = { number: headerMatch[1], title: headerMatch[2], items: [] };
      continue;
    }

    // Check if it's a bullet item: "- item" or "• item" or "* item"
    const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      if (!current) {
        // Bullet without a section header — create an auto-numbered section
        current = { number: String(sections.length + 1), title: 'Untitled Section', items: [] };
      }
      current.items.push(bulletMatch[1]);
      continue;
    }

    // Plain text line — treat as a new section header (auto-numbered)
    if (current) sections.push(current);
    current = { number: String(sections.length + 1), title: line, items: [] };
  }

  if (current) sections.push(current);
  return sections;
}

export default function LegalDocumentsPage() {
  const [filters, setFilters] = useState<LegalDocumentFilterParams>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteModal, setDeleteModal] = useState<LegalDocument | null>(null);
  const [viewModal, setViewModal] = useState<LegalDocument | null>(null);
  const [editorMode, setEditorMode] = useState<'text' | 'form'>('text');
  const [editorText, setEditorText] = useState('');

  const { data: docsData, meta: docsMeta, isLoading, refetch } = useApi(
    () => api.legalDocuments.list(filters),
    [JSON.stringify(filters)],
  );

  const createMutation = useMutation(api.legalDocuments.create);
  const updateMutation = useMutation(
    (input: { id: string; data: Partial<LegalDocument> }) => api.legalDocuments.update(input.id, input.data),
  );
  const activateMutation = useMutation((id: string) => api.legalDocuments.activate(id));
  const deactivateMutation = useMutation((id: string) => api.legalDocuments.deactivate(id));
  const deleteMutation = useMutation((id: string) => api.legalDocuments.delete(id));

  const docs = Array.isArray(docsData) ? docsData : [];

  // Search handler
  const handleSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, page: 1, search: searchInput || undefined }));
  }, [searchInput]);

  // Open create modal
  const openCreate = () => {
    setEditingDoc(null);
    setFormData({ ...EMPTY_FORM, sections: [] });
    setEditorText('');
    setEditorMode('text');
    setFormModalOpen(true);
  };

  // Open edit modal
  const openEdit = (doc: LegalDocument) => {
    setEditingDoc(doc);
    const sections = doc.sections?.length
      ? doc.sections.map((s) => ({ ...s, items: [...s.items] }))
      : [];
    setFormData({
      type: doc.type,
      title: doc.title,
      version: doc.version,
      sections,
      isActive: doc.isActive,
      changelog: doc.changelog || '',
    });
    setEditorText(sectionsToText(sections));
    setEditorMode('text');
    setFormModalOpen(true);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.version.trim()) {
      toast.error('Title and version are required');
      return;
    }

    // Parse sections from text editor if in text mode
    const rawSections = editorMode === 'text' ? textToSections(editorText) : formData.sections;

    // Clean empty sections/items
    const cleanedSections = rawSections
      .filter((s) => s.title.trim())
      .map((s, i) => ({
        number: s.number || String(i + 1),
        title: s.title.trim(),
        items: s.items.filter((item) => item.trim()),
      }));

    const payload: any = {
      type: formData.type,
      title: formData.title.trim(),
      version: formData.version.trim(),
      sections: cleanedSections,
      isActive: formData.isActive,
      changelog: formData.changelog.trim() || undefined,
    };

    let result;
    if (editingDoc) {
      result = await updateMutation.mutate({ id: editingDoc._id, data: payload });
    } else {
      result = await createMutation.mutate(payload);
    }
    if (result !== null) {
      toast.success(editingDoc ? 'Document updated' : 'Document created');
      setFormModalOpen(false);
      refetch();
    } else {
      toast.error('Failed to save document');
    }
  };

  // Toggle active
  const handleToggleActive = async (doc: LegalDocument) => {
    const result = doc.isActive
      ? await deactivateMutation.mutate(doc._id)
      : await activateMutation.mutate(doc._id);
    if (result !== null) {
      toast.success(doc.isActive ? 'Document deactivated' : 'Document activated — now live');
      refetch();
    } else {
      toast.error('Failed to update status');
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteModal) return;
    const result = await deleteMutation.mutate(deleteModal._id);
    if (result !== null) {
      toast.success('Document deleted');
      setDeleteModal(null);
      refetch();
    } else {
      toast.error('Failed to delete');
    }
  };

  // Section builders
  const addSection = () => {
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, { number: String(prev.sections.length + 1), title: '', items: [''] }],
    }));
  };

  const removeSection = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== idx),
    }));
  };

  const updateSection = (idx: number, field: string, value: string) => {
    setFormData((prev) => {
      const sections = [...prev.sections];
      sections[idx] = { ...sections[idx], [field]: value };
      return { ...prev, sections };
    });
  };

  const addItem = (sectionIdx: number) => {
    setFormData((prev) => {
      const sections = [...prev.sections];
      sections[sectionIdx] = { ...sections[sectionIdx], items: [...sections[sectionIdx].items, ''] };
      return { ...prev, sections };
    });
  };

  const removeItem = (sectionIdx: number, itemIdx: number) => {
    setFormData((prev) => {
      const sections = [...prev.sections];
      sections[sectionIdx] = {
        ...sections[sectionIdx],
        items: sections[sectionIdx].items.filter((_, i) => i !== itemIdx),
      };
      return { ...prev, sections };
    });
  };

  const updateItem = (sectionIdx: number, itemIdx: number, value: string) => {
    setFormData((prev) => {
      const sections = [...prev.sections];
      const items = [...sections[sectionIdx].items];
      items[itemIdx] = value;
      sections[sectionIdx] = { ...sections[sectionIdx], items };
      return { ...prev, sections };
    });
  };

  // Table columns
  const columns: Column<LegalDocument>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (doc) => (
        <div>
          <p className="font-medium text-gray-900">{doc.title}</p>
          <p className="text-xs text-gray-500">v{doc.version}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (doc) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          {TYPE_LABELS[doc.type] || doc.type}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (doc) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          doc.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {doc.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {doc.isActive ? 'Active' : 'Draft'}
        </span>
      ),
    },
    {
      key: 'sections',
      header: 'Sections',
      render: (doc) => <span className="text-sm text-gray-600">{doc.sections?.length || 0}</span>,
    },
    {
      key: 'publishedAt',
      header: 'Published',
      render: (doc) => (
        <span className="text-sm text-gray-500">
          {doc.publishedAt ? formatDate(doc.publishedAt) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (doc) => (
        <div className="relative group">
          <button className="p-1.5 rounded-md hover:bg-gray-100">
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>
          <div className="absolute right-0 top-8 z-20 hidden group-hover:block bg-white border rounded-lg shadow-lg py-1 min-w-[160px]">
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              onClick={() => setViewModal(doc)}
            >
              <Eye className="w-4 h-4" /> View
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              onClick={() => openEdit(doc)}
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              onClick={() => handleToggleActive(doc)}
            >
              {doc.isActive ? (
                <><XCircle className="w-4 h-4 text-amber-500" /> <span className="text-amber-600">Deactivate</span></>
              ) : (
                <><CheckCircle className="w-4 h-4 text-green-500" /> <span className="text-green-600">Activate</span></>
              )}
            </button>
            <hr className="my-1" />
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              onClick={() => setDeleteModal(doc)}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      ),
    },
  ];

  const isSubmitting = createMutation.isLoading || updateMutation.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal Documents"
        description="Manage merchant agreements, terms of service, and privacy policies"
        action={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-ruby-600 text-white text-sm font-medium rounded-xl hover:bg-ruby-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Document
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-500"
              placeholder="Search documents..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-500"
              value={filters.type || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, type: (e.target.value || undefined) as any }))}
            >
              <option value="">All Types</option>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-500"
              value={filters.isActive ?? ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, isActive: e.target.value || undefined }))}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Draft</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={docs}
        isLoading={isLoading}
        emptyMessage="No legal documents found"
        meta={docsMeta}
        currentPage={filters.page}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingDoc ? 'Edit Document' : 'New Legal Document'}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Type */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Type</label>
            <select
              className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-500"
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as LegalDocumentType }))}
              disabled={!!editingDoc}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Title + Version */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Title</label>
              <input
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-500"
                placeholder="e.g. Ruby+ Merchant Agreement"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Version</label>
              <input
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-500"
                placeholder="e.g. 1.0"
                value={formData.version}
                onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
              />
            </div>
          </div>

          {/* Sections Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Sections</label>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    editorMode === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => {
                    if (editorMode === 'form') {
                      setEditorText(sectionsToText(formData.sections));
                    }
                    setEditorMode('text');
                  }}
                >
                  <Type className="w-3 h-3" /> Text Editor
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    editorMode === 'form' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => {
                    if (editorMode === 'text') {
                      setFormData((prev) => ({ ...prev, sections: textToSections(editorText) }));
                    }
                    setEditorMode('form');
                  }}
                >
                  <List className="w-3 h-3" /> Form Builder
                </button>
              </div>
            </div>

            {editorMode === 'text' ? (
              <div>
                <textarea
                  className="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-500 font-mono leading-relaxed"
                  rows={16}
                  placeholder={`Type or paste your document content here.\n\nFormat:\n1. Section Title\n- Bullet point one\n- Bullet point two\n\n2. Another Section\n- More content here`}
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Use numbered headers (e.g. &quot;1. Title&quot;) and bullet points (e.g. &quot;- item&quot;) to structure your document.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.sections.map((section, sIdx) => (
                  <div key={sIdx} className="bg-gray-50 rounded-lg p-3 border">
                    <div className="flex items-start gap-2 mb-2">
                      <input
                        className="w-12 px-2 py-1.5 text-sm border rounded-md text-center"
                        placeholder="#"
                        value={section.number}
                        onChange={(e) => updateSection(sIdx, 'number', e.target.value)}
                      />
                      <input
                        className="flex-1 px-2 py-1.5 text-sm border rounded-md"
                        placeholder="Section title"
                        value={section.title}
                        onChange={(e) => updateSection(sIdx, 'title', e.target.value)}
                      />
                      {formData.sections.length > 1 && (
                        <button
                          type="button"
                          className="p-1.5 text-red-400 hover:text-red-600"
                          onClick={() => removeSection(sIdx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5 ml-14">
                      {section.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-1.5">
                          <span className="text-gray-400 text-xs">•</span>
                          <input
                            className="flex-1 px-2 py-1 text-sm border rounded-md"
                            placeholder="Bullet point"
                            value={item}
                            onChange={(e) => updateItem(sIdx, iIdx, e.target.value)}
                          />
                          {section.items.length > 1 && (
                            <button
                              type="button"
                              className="p-1 text-red-400 hover:text-red-600"
                              onClick={() => removeItem(sIdx, iIdx)}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                        onClick={() => addItem(sIdx)}
                      >
                        + Add bullet point
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs text-ruby-600 hover:text-ruby-700 font-medium flex items-center gap-1"
                  onClick={addSection}
                >
                  <Plus className="w-3 h-3" /> Add Section
                </button>
              </div>
            )}
          </div>

          {/* Changelog */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Changelog</label>
            <textarea
              className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-500"
              rows={2}
              placeholder="What changed in this version..."
              value={formData.changelog}
              onChange={(e) => setFormData((prev) => ({ ...prev, changelog: e.target.value }))}
            />
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-ruby-600 focus:ring-ruby-500"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            <span className="text-sm text-gray-700">Publish immediately (activating will deactivate the previous version)</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            onClick={() => setFormModalOpen(false)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm text-white bg-ruby-600 rounded-lg hover:bg-ruby-700 disabled:opacity-50 flex items-center gap-2"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingDoc ? 'Save Changes' : 'Create Document'}
          </button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={!!viewModal}
        onClose={() => setViewModal(null)}
        title={viewModal?.title || 'Document Preview'}
        subtitle={viewModal ? `${TYPE_LABELS[viewModal.type]} — v${viewModal.version}` : ''}
        size="lg"
      >
        {viewModal && (
          <div className="max-h-[70vh] overflow-y-auto">
            {viewModal.isActive ? (
              <div className="mb-4 px-3 py-2 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> This is the currently active version
              </div>
            ) : (
              <div className="mb-4 px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg">Draft — not published</div>
            )}

            {viewModal.sections?.map((section, idx) => (
              <div key={idx} className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {section.number}. {section.title}
                </h3>
                <ul className="space-y-1.5 ml-4">
                  {section.items.map((item, iIdx) => (
                    <li key={iIdx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {viewModal.changelog && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Changelog</p>
                <p className="text-sm text-gray-600">{viewModal.changelog}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t text-xs text-gray-400">
              Created {formatDate(viewModal.createdAt)}
              {viewModal.publishedAt && ` — Published ${formatDate(viewModal.publishedAt)}`}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Document"
      >
        <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm">
          This will permanently delete this legal document. This action cannot be undone.
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete <strong>{deleteModal?.title}</strong> (v{deleteModal?.version})?
        </p>
        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            onClick={() => setDeleteModal(null)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            onClick={handleDelete}
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
