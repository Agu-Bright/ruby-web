'use client';

import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as commands from '@uiw/react-md-editor/commands';
import '@uiw/react-md-editor/markdown-editor.css';
import {
  X,
  ImagePlus,
  Loader2,
  Upload,
  Eye,
  Clock,
  Hash,
  Type as TypeIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { readingTimeMinutes, wordCount, type BlogPost } from '@/lib/blog';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

function slugPreview(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'post'
  );
}

function uploadedUrl(res: any): string | undefined {
  return res?.data?.url || res?.data?.publicUrl || res?.url;
}

export function BlogEditor({
  post,
  onClose,
  onSaved,
}: {
  post: BlogPost | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(post?.title || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [content, setContent] = useState(post?.content || '');
  const [category, setCategory] = useState(post?.category || '');
  const [tags, setTags] = useState<string[]>(post?.tags || []);
  const [tagDraft, setTagDraft] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState(post?.coverImageUrl || '');
  const [status] = useState<'DRAFT' | 'PUBLISHED'>(post?.status || 'DRAFT');
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [inlineUploading, setInlineUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);

  const words = useMemo(() => wordCount(content), [content]);
  const minutes = useMemo(() => readingTimeMinutes(content), [content]);

  // ── Robust image insertion ──────────────────────────────────────────────
  // Insert markdown into `content` state directly (cursor-aware via the live
  // textarea, append as fallback). This does NOT rely on the editor's internal
  // text API, which loses the selection across the async upload — that was why
  // inline images silently failed before.
  const insertImageBlock = (markdown: string) => {
    const textarea = editorWrapRef.current?.querySelector<HTMLTextAreaElement>('textarea');
    setContent((prev) => {
      // Insert the image as a STANDALONE BLOCK at the end of the current line,
      // surrounded by blank lines. Inserting at the raw caret offset could land
      // inside an existing markdown token (e.g. an unfinished `![...]()`),
      // producing broken nested image syntax — this can't.
      let pos = prev.length;
      if (textarea && typeof textarea.selectionStart === 'number') {
        const caret = textarea.selectionStart;
        const nextNewline = prev.indexOf('\n', caret);
        pos = nextNewline === -1 ? prev.length : nextNewline;
      }
      const before = prev.slice(0, pos);
      const after = prev.slice(pos);
      const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const trail = after === '' || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
      return before + lead + markdown + trail + after;
    });
  };

  const uploadAndInsert = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files can be added');
      return;
    }
    setInlineUploading(true);
    const toastId = toast.loading('Uploading image…');
    try {
      const res = await api.media.upload(file, 'blog');
      const url = uploadedUrl(res);
      if (!url) throw new Error('no url');
      const alt = file.name.replace(/\.[^.]+$/, '');
      insertImageBlock(`![${alt}](${url})`);
      toast.success('Image added', { id: toastId });
    } catch {
      toast.error('Image upload failed', { id: toastId });
    } finally {
      setInlineUploading(false);
    }
  };

  const pickInlineImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => uploadAndInsert(input.files?.[0]);
    input.click();
  };

  // Toolbar image button (opens the same picker; insertion is state-based).
  const imageCommand: commands.ICommand = {
    name: 'image-upload',
    keyCommand: 'image-upload',
    buttonProps: { 'aria-label': 'Upload image', title: 'Upload image' },
    icon: <ImagePlus style={{ width: 12, height: 12 }} />,
    execute: () => pickInlineImage(),
  };

  const toolbar = useMemo(() => {
    const base = typeof commands.getCommands === 'function' ? commands.getCommands() : [];
    return [...base, commands.divider, imageCommand].filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEditorDrop = (e: React.DragEvent) => {
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      e.preventDefault();
      setDragOver(false);
      uploadAndInsert(file);
    }
  };

  const onEditorPaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData?.files || [])[0];
    if (file && file.type.startsWith('image/')) {
      e.preventDefault();
      uploadAndInsert(file);
    }
  };

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, '');
    if (t && !tags.includes(t) && tags.length < 20) setTags((p) => [...p, t]);
    setTagDraft('');
  };

  const onCover = async (file?: File | null) => {
    if (!file) return;
    setCoverUploading(true);
    const toastId = toast.loading('Uploading cover…');
    try {
      const res = await api.media.upload(file, 'blog');
      const url = uploadedUrl(res);
      if (!url) throw new Error('no url');
      setCoverImageUrl(url);
      toast.success('Cover uploaded', { id: toastId });
    } catch {
      toast.error('Cover upload failed', { id: toastId });
    } finally {
      setCoverUploading(false);
    }
  };

  const save = async (publish: boolean) => {
    // Specific, actionable validation — no more vague "everything is required".
    if (!title.trim()) return toast.error('Please add a title');
    if (!excerpt.trim()) return toast.error('Please add a short excerpt');
    if (!content.trim()) return toast.error('Please write the article content');

    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content,
      category: category.trim() || undefined,
      coverImageUrl: coverImageUrl || undefined,
      tags,
      status: publish ? ('PUBLISHED' as const) : ('DRAFT' as const),
    };
    setSaving(true);
    try {
      if (post?._id) {
        await api.blogPosts.update(post._id, payload);
      } else {
        await api.blogPosts.create(payload);
      }
      toast.success(publish ? 'Post published' : 'Draft saved');
      onSaved();
    } catch {
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 border-b bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="icon-button" aria-label="Close editor">
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-gray-900">{post ? 'Edit post' : 'New post'}</h2>
            <p className="text-xs text-gray-400">/blog/{title ? slugPreview(title) : '…'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => save(false)} disabled={saving} className="btn-secondary">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === 'PUBLISHED' ? (
              'Unpublish'
            ) : (
              'Save draft'
            )}
          </button>
          <button onClick={() => save(true)} disabled={saving} className="btn-primary">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === 'PUBLISHED' ? (
              'Update'
            ) : (
              'Publish'
            )}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5 lg:flex-row">
        {/* Main column */}
        <div className="flex-1 space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              placeholder="e.g. How to use Ruby+"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-2xl font-bold text-gray-900 outline-none focus:border-ruby-red placeholder:font-normal placeholder:text-gray-300"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Excerpt <span className="font-normal normal-case text-gray-400">— short summary shown on cards</span>
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              maxLength={320}
              rows={2}
              placeholder="One or two sentences summarising the article…"
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-ruby-red"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{excerpt.length}/320</p>
          </div>

          {/* Content */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Content
              </label>
              <button
                onClick={pickInlineImage}
                disabled={inlineUploading}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 transition hover:border-ruby-red hover:text-ruby-red disabled:opacity-50"
              >
                {inlineUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" />
                )}
                Add image
              </button>
            </div>
            <div
              ref={editorWrapRef}
              data-color-mode="light"
              onDrop={onEditorDrop}
              onDragOver={(e) => {
                if (e.dataTransfer?.types?.includes('Files')) {
                  e.preventDefault();
                  setDragOver(true);
                }
              }}
              onDragLeave={() => setDragOver(false)}
              onPaste={onEditorPaste}
              className={`overflow-hidden rounded-xl border ${
                dragOver ? 'border-ruby-red ring-2 ring-ruby-red/20' : 'border-gray-200'
              }`}
            >
              <MDEditor
                value={content}
                onChange={(v) => setContent(v || '')}
                height={480}
                preview="live"
                commands={toolbar}
                textareaProps={{ placeholder: 'Write your story in Markdown…' }}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              Tip: drag &amp; drop or paste an image straight into the editor, or use{' '}
              <span className="font-semibold">Add image</span>.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full space-y-4 lg:w-80">
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={TypeIcon} label="Words" value={words.toLocaleString()} />
            <Stat icon={Clock} label="Read" value={`${minutes}m`} />
            <Stat icon={Hash} label="Tags" value={String(tags.length)} />
          </div>

          {/* Cover */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">Cover image</p>
            {coverImageUrl ? (
              <div className="group relative overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImageUrl} alt="cover" className="aspect-[16/9] w-full object-cover" />
                <button
                  onClick={() => setCoverImageUrl('')}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove cover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 transition hover:border-ruby-red hover:text-ruby-red"
              >
                {coverUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    <span className="text-xs font-medium">Upload cover</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onCover(e.target.files?.[0])}
            />
          </div>

          {/* Category */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <label className="text-sm font-semibold text-gray-700">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={80}
              placeholder="e.g. Travel, Food, Guides"
              className="input mt-2"
            />
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <label className="text-sm font-semibold text-gray-700">Tags</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-ruby-red"
                >
                  #{tag}
                  <button onClick={() => setTags((p) => p.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagDraft);
                } else if (e.key === 'Backspace' && !tagDraft && tags.length) {
                  setTags((p) => p.slice(0, -1));
                }
              }}
              onBlur={() => tagDraft && addTag(tagDraft)}
              placeholder="Type a tag and press Enter"
              className="input mt-2"
            />
          </div>

          {post?.slug && status === 'PUBLISHED' && (
            <a
              href={`/blog/${post.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 hover:text-ruby-red"
            >
              <Eye className="h-4 w-4" /> View live post
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-gray-400" />
      <p className="text-sm font-bold text-gray-900">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
    </div>
  );
}
