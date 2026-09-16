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
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>(post?.status || 'DRAFT');
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const words = useMemo(() => wordCount(content), [content]);
  const minutes = useMemo(() => readingTimeMinutes(content), [content]);

  // ── Inline image upload command for the markdown toolbar ──
  const imageUpload: commands.ICommand = {
    name: 'image-upload',
    keyCommand: 'image-upload',
    buttonProps: { 'aria-label': 'Upload image', title: 'Upload image' },
    icon: <ImagePlus style={{ width: 12, height: 12 }} />,
    execute: (_state, apiText) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const toastId = toast.loading('Uploading image…');
        try {
          const res = await api.media.upload(file, 'blog');
          const url = uploadedUrl(res);
          if (!url) throw new Error('no url');
          const alt = file.name.replace(/\.[^.]+$/, '');
          apiText.replaceSelection(`\n![${alt}](${url})\n`);
          toast.success('Image inserted', { id: toastId });
        } catch {
          toast.error('Image upload failed', { id: toastId });
        }
      };
      input.click();
    },
  };

  const toolbar = useMemo(() => {
    const base = typeof commands.getCommands === 'function' ? commands.getCommands() : [];
    return [...base, commands.divider, imageUpload].filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, '');
    if (t && !tags.includes(t) && tags.length < 20) setTags((p) => [...p, t]);
    setTagDraft('');
  };

  const onCover = async (file?: File) => {
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

  const save = async (publish?: boolean) => {
    if (!title.trim() || !excerpt.trim() || !content.trim()) {
      toast.error('Title, excerpt and content are required');
      return;
    }
    const nextStatus = publish === undefined ? status : publish ? 'PUBLISHED' : 'DRAFT';
    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content,
      category: category.trim() || undefined,
      coverImageUrl: coverImageUrl || undefined,
      tags,
      status: nextStatus,
    };
    setSaving(true);
    try {
      if (post?._id) {
        await api.blogPosts.update(post._id, payload);
      } else {
        await api.blogPosts.create(payload);
      }
      toast.success(post ? 'Post updated' : 'Post created');
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
            <h2 className="text-sm font-bold text-gray-900">
              {post ? 'Edit post' : 'New post'}
            </h2>
            <p className="text-xs text-gray-400">
              /blog/{title ? slugPreview(title) : '…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${
              status === 'PUBLISHED'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {status === 'PUBLISHED' ? 'Published' : 'Draft'}
          </span>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="btn-secondary"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save draft'}
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5 lg:flex-row">
        {/* Main column */}
        <div className="flex-1 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder="Post title"
            className="w-full rounded-xl border-0 bg-transparent px-1 text-3xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
          />
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            maxLength={320}
            rows={2}
            placeholder="Short excerpt shown on cards and search results…"
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-ruby-red"
          />
          <p className="-mt-2 text-right text-xs text-gray-400">{excerpt.length}/320</p>

          <div data-color-mode="light" className="overflow-hidden rounded-xl border border-gray-200">
            <MDEditor
              value={content}
              onChange={(v) => setContent(v || '')}
              height={520}
              preview="live"
              commands={toolbar}
              textareaProps={{ placeholder: 'Write your story in Markdown…' }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full space-y-4 lg:w-80">
          {/* Stats */}
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

          {/* Preview link */}
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
