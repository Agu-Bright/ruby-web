'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Search, Plus, Pencil, Trash2, Eye,
  MoreHorizontal, ChevronDown, CheckCircle, XCircle,
  Loader2, FileText, List, Upload, Download,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, Modal, type Column } from '@/components/ui';
import type { LegalDocument, LegalDocumentType, LegalSection, LegalDocumentFilterParams } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { extractTextFromFile, markdownToDocxBlob, slugifyFilename, downloadBlob } from '@/lib/doc-io';

const ACCEPTED_UPLOAD_EXT = ['pdf', 'docx', 'md', 'markdown', 'txt'];

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
  content: '',
  isActive: false,
  changelog: '',
};

type EditorMode = 'document' | 'sections';

// Convert a structured sections array to plain text — used to seed the
// Document editor when an admin opens a legacy section-based doc and wants to
// switch to free-form editing (so no work is lost in the hand-off).
function sectionsToText(sections: LegalSection[]): string {
  if (!sections.length) return '';
  return sections.map((s) => {
    const header = `${s.number}. ${s.title}`;
    const items = s.items.map((item) => `- ${item}`).join('\n');
    return `${header}\n${items}`;
  }).join('\n\n');
}

export default function LegalDocumentsPage() {
  const [filters, setFilters] = useState<LegalDocumentFilterParams>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteModal, setDeleteModal] = useState<LegalDocument | null>(null);
  const [viewModal, setViewModal] = useState<LegalDocument | null>(null);
  // The editor has two mutually-exclusive modes:
  //  • 'document' — one free-form body (Markdown / plain text). This is the
  //    paste-the-whole-thing-at-once path, and also where extracted PDF text
  //    lands. Saved to `content`.
  //  • 'sections' — the structured number + title + bullets builder. Saved to
  //    `sections`.
  // Whichever mode is active at save time wins; the other field is cleared so
  // consumers have an unambiguous choice (content present → render content).
  const [editorMode, setEditorMode] = useState<EditorMode>('document');
  const [documentText, setDocumentText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionMenuDoc, setActionMenuDoc] = useState<LegalDocument | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; right: number } | null>(null);

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
    setDocumentText('');
    setEditorMode('document');
    setShowPreview(false);
    setFormModalOpen(true);
  };

  // Open edit modal. A doc with a non-empty `content` opens in Document mode;
  // a legacy section-only doc opens in Sections mode, but we still pre-seed the
  // Document editor with a text rendering of its sections so switching modes
  // never starts from a blank page.
  const openEdit = (doc: LegalDocument) => {
    setEditingDoc(doc);
    const sections = doc.sections?.length
      ? doc.sections.map((s) => ({ ...s, items: [...s.items] }))
      : [];
    const hasContent = !!doc.content && doc.content.trim().length > 0;
    setFormData({
      type: doc.type,
      title: doc.title,
      version: doc.version,
      sections,
      content: doc.content || '',
      isActive: doc.isActive,
      changelog: doc.changelog || '',
    });
    setDocumentText(hasContent ? (doc.content as string) : sectionsToText(sections));
    setEditorMode(hasContent ? 'document' : 'sections');
    setShowPreview(false);
    setFormModalOpen(true);
  };

  // Read a chosen file (.pdf / .docx / .md / .txt) entirely in the browser and
  // drop its text into the Document editor for review. Nothing is uploaded.
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    const ext = (file.name.toLowerCase().split('.').pop() || '');
    if (!ACCEPTED_UPLOAD_EXT.includes(ext)) {
      toast.error('Unsupported file. Upload a PDF, Word (.docx), Markdown (.md) or text (.txt) file.');
      return;
    }
    setUploadBusy(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text) {
        toast.error(
          ext === 'pdf'
            ? 'No selectable text found — this PDF looks like a scanned image. Paste the text in manually.'
            : 'That file had no readable text. Paste the text in manually.',
        );
        return;
      }
      setEditorMode('document');
      setDocumentText((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${text}` : text));
      setShowPreview(false);
      toast.success('Text extracted — review and edit it before saving.');
    } catch (err) {
      console.error('File extraction failed', err);
      toast.error('Could not read that file. Try a different format, or paste the text in manually.');
    } finally {
      setUploadBusy(false);
    }
  };

  // Build a Word (.docx) file from a title + content so the admin can edit it
  // in Word / Google Docs and re-upload it. Shared by the editor toolbar and
  // the row action menu.
  const downloadDocx = async (title: string, version: string, content: string) => {
    const body = content.trim();
    if (!body) {
      toast.error('Nothing to download yet.');
      return;
    }
    setDownloadBusy(true);
    try {
      const blob = await markdownToDocxBlob(title, body);
      const base = slugifyFilename(title);
      downloadBlob(blob, `${base}${version ? `-v${version}` : ''}.docx`);
    } catch (err) {
      console.error('DOCX export failed', err);
      toast.error('Could not generate the Word file.');
    } finally {
      setDownloadBusy(false);
    }
  };

  // Download the current editor contents (unsaved edits included).
  const handleDownloadCurrent = () =>
    void downloadDocx(formData.title || 'legal-document', formData.version, documentText);

  // Download a saved doc straight from the list — uses its content, or a text
  // rendering of its sections for legacy section-only docs.
  const handleDownloadDoc = (doc: LegalDocument) => {
    setActionMenuDoc(null);
    const content = doc.content && doc.content.trim() ? doc.content : sectionsToText(doc.sections || []);
    void downloadDocx(doc.title, doc.version, content);
  };

  const switchToDocument = () => {
    // Don't lose builder work: if the document box is empty but sections exist,
    // seed it from the sections.
    setDocumentText((prev) => (prev.trim() ? prev : sectionsToText(formData.sections)));
    setEditorMode('document');
  };

  const switchToSections = () => {
    // Start the builder with one empty section if there's nothing to edit yet.
    setFormData((prev) => (
      prev.sections.length
        ? prev
        : { ...prev, sections: [{ number: '1', title: '', items: [''] }] }
    ));
    setEditorMode('sections');
  };

  // Submit form
  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.version.trim()) {
      toast.error('Title and version are required');
      return;
    }

    const payload: any = {
      type: formData.type,
      title: formData.title.trim(),
      version: formData.version.trim(),
      isActive: formData.isActive,
      changelog: formData.changelog.trim() || undefined,
    };

    if (editorMode === 'document') {
      const content = documentText.trim();
      if (!content) {
        toast.error('Add the document text, or switch to Sections.');
        return;
      }
      // Document mode wins: store the free-form body and clear sections so
      // consumers unambiguously render `content`.
      payload.content = documentText;
      payload.sections = [];
    } else {
      const cleanedSections = formData.sections
        .filter((s) => s.title.trim())
        .map((s, i) => ({
          number: s.number || String(i + 1),
          title: s.title.trim(),
          items: s.items.filter((item) => item.trim()),
        }));
      if (!cleanedSections.length) {
        toast.error('Add at least one section, or switch to Document.');
        return;
      }
      // Sections mode wins: clear `content` so consumers fall back to sections.
      payload.sections = cleanedSections;
      payload.content = '';
    }

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
    }
    // On failure, useMutation already surfaced the real backend reason via a
    // toast (e.g. "A MERCHANT_AGREEMENT document with version "2" already
    // exists…"). A second generic "Failed to save document" toast would only
    // bury that message, so we don't add one here.
  };

  // Toggle active
  const handleToggleActive = async (doc: LegalDocument) => {
    setActionMenuDoc(null);
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

  const openActionMenu = (doc: LegalDocument, button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    setActionMenuPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setActionMenuDoc(doc);
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
      key: 'content',
      header: 'Format',
      render: (doc) => (
        doc.content && doc.content.trim() ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
            <FileText className="w-3 h-3" /> Full text
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
            <List className="w-3 h-3" /> {doc.sections?.length || 0} sections
          </span>
        )
      ),
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
        <div className="flex justify-end">
          <button
            type="button"
            aria-label={`Actions for ${doc.title}`}
            aria-haspopup="menu"
            aria-expanded={actionMenuDoc?._id === doc._id}
            onClick={(event) => openActionMenu(doc, event.currentTarget)}
            className="rounded-md p-1.5 hover:bg-gray-100"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>
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

      {actionMenuDoc && actionMenuPosition && (
        <>
          <button type="button" aria-label="Close actions menu" className="fixed inset-0 z-[90] cursor-default" onClick={() => setActionMenuDoc(null)} />
          <div role="menu" aria-label={`Actions for ${actionMenuDoc.title}`} className="fixed z-[100] min-w-[172px] rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl" style={actionMenuPosition}>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setActionMenuDoc(null); setViewModal(actionMenuDoc); }}><Eye className="w-4 h-4" /> View</button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setActionMenuDoc(null); openEdit(actionMenuDoc); }}><Pencil className="w-4 h-4" /> Edit</button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => handleDownloadDoc(actionMenuDoc)}><Download className="w-4 h-4" /> Download Word</button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => void handleToggleActive(actionMenuDoc)}>{actionMenuDoc.isActive ? <><XCircle className="w-4 h-4 text-amber-500" /><span className="text-amber-700">Deactivate</span></> : <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-green-700">Activate</span></>}</button>
            <div className="my-1 border-t border-gray-100" />
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => { setActionMenuDoc(null); setDeleteModal(actionMenuDoc); }}><Trash2 className="w-4 h-4" /> Delete</button>
          </div>
        </>
      )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Content</label>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    editorMode === 'document' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={switchToDocument}
                >
                  <FileText className="w-3 h-3" /> Document
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    editorMode === 'sections' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={switchToSections}
                >
                  <List className="w-3 h-3" /> Sections
                </button>
              </div>
            </div>

            {editorMode === 'document' ? (
              <div className="space-y-2">
                {/* Toolbar: upload PDF + preview toggle + char count */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadBusy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-60"
                  >
                    {uploadBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploadBusy ? 'Reading…' : 'Upload file'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.md,.markdown,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                  <button
                    type="button"
                    onClick={handleDownloadCurrent}
                    disabled={downloadBusy || !documentText.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-60"
                  >
                    {downloadBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Download Word
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreview((p) => !p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <Eye className="w-3.5 h-3.5" /> {showPreview ? 'Edit text' : 'Preview'}
                  </button>
                  <span className="ml-auto text-[11px] text-gray-400">
                    {documentText.length.toLocaleString()} chars
                  </span>
                </div>

                {showPreview ? (
                  <div className="border rounded-lg p-4 max-h-[340px] overflow-y-auto bg-white prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-a:text-ruby-600 prose-strong:text-gray-900">
                    {documentText.trim() ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{documentText}</ReactMarkdown>
                    ) : (
                      <p className="text-sm text-gray-400">Nothing to preview yet.</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    className="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-500 leading-relaxed"
                    rows={16}
                    placeholder={'Paste the full text of the agreement or policy here, or upload a PDF above.\n\nBasic Markdown is supported:\n# A heading\n## A sub-heading\n- A bullet point\n**bold text**'}
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                  />
                )}
                <p className="text-[11px] text-gray-400">
                  Paste the whole document at once, or upload a PDF / Word / text file to pull its text in. Use “Download Word” to export it, edit in Word or Google Docs, then re-upload. Basic Markdown (headings with #, bullets with -, **bold**) is rendered in the apps; plain text works too.
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

            {viewModal.content && viewModal.content.trim() ? (
              <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-a:text-ruby-600 prose-strong:text-gray-900">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewModal.content}</ReactMarkdown>
              </div>
            ) : (
              viewModal.sections?.map((section, idx) => (
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
              ))
            )}

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
