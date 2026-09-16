'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Clock } from 'lucide-react';
import { readingTimeMinutes, formatBlogDate, type BlogPost } from '@/lib/blog';

function readingLabel(post: BlogPost): string | null {
  if (!post.content) return null;
  return `${readingTimeMinutes(post.content)} min read`;
}

function Card({ post }: { post: BlogPost }) {
  const mins = readingLabel(post);
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md">
      <Link href={`/blog/${post.slug}`} className="block overflow-hidden">
        {post.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-ruby-red/15 to-rose-100 text-3xl">
            ♦
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        {post.category && (
          <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-ruby-red">
            {post.category}
          </p>
        )}
        <h2 className="text-sm font-bold leading-snug text-gray-900">
          <Link href={`/blog/${post.slug}`} className="line-clamp-2 hover:text-ruby-red">
            {post.title}
          </Link>
        </h2>
        <p className="mt-1 line-clamp-2 text-xs leading-4 text-gray-500">{post.excerpt}</p>
        <div className="mt-auto flex items-center gap-2 pt-2.5 text-[10px] text-gray-400">
          <span>{formatBlogDate(post.publishedAt)}</span>
          {mins && (
            <>
              <span aria-hidden>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> {mins}
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function BlogListClient({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.category && set.add(p.category));
    return ['All', ...Array.from(set).sort()];
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const catOk = activeCategory === 'All' || p.category === activeCategory;
      if (!catOk) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, query, activeCategory]);

  return (
    <div>
      {/* Controls */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                activeCategory === cat
                  ? 'bg-ruby-red text-white'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-ruby-red/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles"
            className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-ruby-red focus:ring-2 focus:ring-ruby-red/20"
          />
        </div>
      </div>

      {/* Compact uniform grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((post) => (
            <Card key={post._id} post={post} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-bold text-gray-900">No articles found</h2>
          <p className="mt-2 text-sm text-gray-600">Try a different search or category.</p>
        </div>
      )}
    </div>
  );
}
