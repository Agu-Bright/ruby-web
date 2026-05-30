'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Megaphone, Eye, Archive, Pencil, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Drawer } from '@/components/ui/drawer';
import { ImageUpload } from '@/components/ui/image-upload';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import type {
  RubySelectPost,
  RubySelectPostStatus,
  CreateRubySelectPostRequest,
} from '@/lib/types';
import { toast } from 'sonner';

type FilterTab = 'ALL' | RubySelectPostStatus;

const STATUS_LABEL: Record<FilterTab, string> = {
  ALL: 'All',
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
};

interface EditorState {
  open: boolean;
  /** null = creating a new post; populated post = editing */
  post: RubySelectPost | null;
}

function emptyForm(): CreateRubySelectPostRequest {
  return {
    title: '',
    subtitle: '',
    imageUrl: '',
    ctaUrl: '',
    ctaLabel: '',
    locationIds: [],
    startsAt: undefined,
    endsAt: undefined,
    displayPriority: 0,
    status: 'DRAFT',
  };
}

function postToForm(p: RubySelectPost): CreateRubySelectPostRequest {
  return {
    title: p.title,
    subtitle: p.subtitle || '',
    imageUrl: p.imageUrl,
    ctaUrl: p.ctaUrl || '',
    ctaLabel: p.ctaLabel || '',
    locationIds: p.locationIds || [],
    startsAt: p.startsAt ? p.startsAt.slice(0, 16) : undefined,
    endsAt: p.endsAt ? p.endsAt.slice(0, 16) : undefined,
    displayPriority: p.displayPriority || 0,
    status: p.status,
  };
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

export default function RubySelectPage() {
  const [tab, setTab] = useState<FilterTab>('ALL');
  const [editor, setEditor] = useState<EditorState>({ open: false, post: null });
  const [form, setForm] = useState<CreateRubySelectPostRequest>(emptyForm());

  const listParams = useMemo(
    () => ({ status: tab === 'ALL' ? undefined : tab, limit: 100 }),
    [tab],
  );

  const {
    data: listData,
    isLoading,
    refetch,
  } = useApi(() => api.rubySelect.list(listParams), [tab]);
  const posts = listData?.items ?? [];

  const { data: locationsData } = useApi(
    () => api.locations.list({ limit: 200 } as any),
    [],
  );
  const cities = (locationsData as any)?.items ?? (locationsData as any)?.locations ?? [];

  const create = useMutation((data: CreateRubySelectPostRequest) =>
    api.rubySelect.create(data),
  );
  const update = useMutation(
    ({ id, data }: { id: string; data: CreateRubySelectPostRequest }) =>
      api.rubySelect.update(id, data),
  );
  const publish = useMutation((id: string) => api.rubySelect.publish(id));
  const archive = useMutation((id: string) => api.rubySelect.archive(id));

  const openCreate = () => {
    setEditor({ open: true, post: null });
    setForm(emptyForm());
  };
  const openEdit = (post: RubySelectPost) => {
    setEditor({ open: true, post });
    setForm(postToForm(post));
  };
  const closeEditor = () => setEditor({ open: false, post: null });

  const handleSave = async (publishNow: boolean) => {
    if (!form.title?.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.imageUrl?.trim()) {
      toast.error('Upload a hero image');
      return;
    }
    const payload: CreateRubySelectPostRequest = {
      ...form,
      status: publishNow ? 'ACTIVE' : (form.status || 'DRAFT'),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
    };
    try {
      if (editor.post) {
        await update.mutate({ id: editor.post._id, data: payload });
        toast.success('Post updated');
      } else {
        await create.mutate(payload);
        toast.success(publishNow ? 'Post published' : 'Draft saved');
      }
      closeEditor();
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Save failed');
    }
  };

  const handlePublishExisting = async (post: RubySelectPost) => {
    try {
      await publish.mutate(post._id);
      toast.success('Published');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Publish failed');
    }
  };

  const handleArchive = async (post: RubySelectPost) => {
    if (!confirm(`Archive "${post.title}"? It will stop appearing on the customer home.`)) return;
    try {
      await archive.mutate(post._id);
      toast.success('Archived');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Archive failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ruby+ Select 🤩"
        description="Home-tab notice board. Post banners, fliers, promos, announcements — they surface alongside paid featured listings + what's-hot businesses on the customer mobile carousel."
        action={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ruby-red text-white text-sm font-semibold hover:bg-ruby-red/90 transition"
          >
            <Plus className="w-4 h-4" />
            New post
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {(['ALL', 'DRAFT', 'ACTIVE', 'ARCHIVED'] as FilterTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t
                ? 'border-ruby-red text-ruby-red'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-sm text-gray-500 py-12 text-center">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <Megaphone className="w-10 h-10 mx-auto text-gray-300" />
          <p className="mt-3 text-sm text-gray-600">No Ruby+ Select posts yet.</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ruby-red text-white text-sm font-semibold hover:bg-ruby-red/90"
          >
            <Plus className="w-4 h-4" />
            Create the first post
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {posts.map((post: RubySelectPost) => (
            <div
              key={post._id}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-3"
            >
              {/* Thumbnail */}
              <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {post.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {post.title}
                  </h3>
                  <StatusBadge status={post.status} />
                  {post.locationIds && post.locationIds.length > 0 ? (
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      {post.locationIds.length} {post.locationIds.length === 1 ? 'city' : 'cities'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Global
                    </span>
                  )}
                </div>
                {post.subtitle && (
                  <p className="text-xs text-gray-600 truncate mt-0.5">{post.subtitle}</p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                  {formatDate(post.startsAt)} → {formatDate(post.endsAt)} · priority {post.displayPriority}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  title="Edit"
                  onClick={() => openEdit(post)}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {post.status !== 'ACTIVE' && (
                  <button
                    title="Publish"
                    onClick={() => handlePublishExisting(post)}
                    className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                {post.status !== 'ARCHIVED' && (
                  <button
                    title="Archive"
                    onClick={() => handleArchive(post)}
                    className="p-2 rounded-lg text-amber-600 hover:bg-amber-50"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit drawer */}
      <Drawer
        isOpen={editor.open}
        onClose={closeEditor}
        title={editor.post ? 'Edit Ruby+ Select post' : 'New Ruby+ Select post'}
        subtitle="Banner + title + optional CTA. Goes live when you Publish."
        widthPx={640}
        footer={
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={closeEditor}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={create.isLoading || update.isLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              Save as draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={create.isLoading || update.isLoading}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-ruby-red text-white hover:bg-ruby-red/90 disabled:opacity-50"
            >
              {editor.post ? 'Save & publish' : 'Publish now'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <ImageUpload
            label="Hero image"
            helpText="16:9 banner art. Min 600px wide."
            folder="ruby-select"
            value={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url || '' }))}
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
              Title <span className="text-ruby-red">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="New customers get ₦1,000 off"
              maxLength={80}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-red"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
              Subtitle
            </label>
            <input
              type="text"
              value={form.subtitle || ''}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              placeholder="Valid on your first booking. No code needed."
              maxLength={140}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-red"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                CTA URL
              </label>
              <input
                type="text"
                value={form.ctaUrl || ''}
                onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                placeholder="/(tabs)/business/<id> or https://…"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-red"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Empty = display-only banner (no tap navigation).
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                CTA Label
              </label>
              <input
                type="text"
                value={form.ctaLabel || ''}
                onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                placeholder="Claim offer"
                maxLength={30}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-red"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
              Target cities
            </label>
            <select
              multiple
              value={form.locationIds || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                setForm((f) => ({ ...f, locationIds: selected }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-red h-32"
            >
              {cities.map((c: any) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              Leave empty for global (shows to all customers). Cmd/Ctrl-click to multi-select.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                Starts at
              </label>
              <input
                type="datetime-local"
                value={form.startsAt || ''}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-red"
              />
              <p className="text-[11px] text-gray-500 mt-1">Default: now</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                Ends at
              </label>
              <input
                type="datetime-local"
                value={form.endsAt || ''}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-red"
              />
              <p className="text-[11px] text-gray-500 mt-1">Empty = no expiry</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
              Display priority
            </label>
            <input
              type="number"
              value={form.displayPriority || 0}
              onChange={(e) =>
                setForm((f) => ({ ...f, displayPriority: Number(e.target.value) || 0 }))
              }
              min={0}
              className="w-32 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-red"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Higher wins among admin posts. Sponsored ads + business fallback render after all admin posts regardless.
            </p>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
