'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Eye, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApi, useMutation } from '@/lib/hooks';
import { PageHeader } from '@/components/ui';
import { BlogEditor } from '@/components/blog/BlogEditor';
import { readingTimeMinutes, type BlogPost } from '@/lib/blog';

export default function BlogAdminPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const { data, isLoading, refetch } = useApi(
    () =>
      api.blogPosts.list({
        limit: 50,
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
      }),
    [search, status],
  );
  const remove = useMutation(api.blogPosts.delete);
  const posts: BlogPost[] = Array.isArray(data) ? data : (data as any)?.items || [];

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setEditorOpen(true);
  };
  const onSaved = () => {
    setEditorOpen(false);
    setEditing(null);
    refetch();
  };
  const deletePost = async (post: BlogPost) => {
    if (!confirm(`Delete “${post.title}”?`)) return;
    const result = await remove.mutate(post._id);
    if (result) {
      toast.success('Blog post deleted');
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog"
        description="Write, publish and manage articles shown on rubyplus.net"
        action={
          <button onClick={openNew} className="btn-primary">
            <Plus className="h-4 w-4" /> New post
          </button>
        }
      />

      <div className="card flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts"
            className="input pl-10"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input sm:w-44">
          <option value="">All statuses</option>
          <option value="DRAFT">Drafts</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="p-4">Post</th>
                <th className="p-4">Category</th>
                <th className="p-4">Read</th>
                <th className="p-4">Status</th>
                <th className="p-4">Published</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post._id} className="border-b last:border-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {post.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.coverImageUrl}
                          alt=""
                          className="h-10 w-14 flex-shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-md bg-rose-50 text-ruby-red">
                          ♦
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{post.title}</p>
                        <p className="mt-0.5 max-w-xs truncate text-xs text-gray-500">/blog/{post.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{post.category || '—'}</td>
                  <td className="p-4 text-gray-600">
                    {post.content ? (
                      <span className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" /> {readingTimeMinutes(post.content)}m
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-4">
                    <span className={post.status === 'PUBLISHED' ? 'badge-success' : 'badge-neutral'}>
                      {post.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-NG') : '—'}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="icon-button"
                        aria-label="View post"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <button onClick={() => openEdit(post)} className="icon-button" aria-label="Edit post">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deletePost(post)}
                        className="icon-button text-red-500"
                        aria-label="Delete post"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && !posts.length && (
          <div className="p-16 text-center text-gray-500">
            <FileText className="mx-auto mb-3 h-9 w-9 text-gray-300" />
            No blog posts yet.
          </div>
        )}
      </div>

      {editorOpen && (
        <BlogEditor post={editing} onClose={() => setEditorOpen(false)} onSaved={onSaved} />
      )}
    </div>
  );
}
