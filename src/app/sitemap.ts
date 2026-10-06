import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rubyplus.net';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Served at /sitemap.xml. Rendered fresh on every request so newly published
// posts appear immediately — static/ISR prerender caches an empty list from
// build time (same reason the blog pages are force-dynamic).
export const dynamic = 'force-dynamic';

type PostRow = {
  slug?: string;
  publishedAt?: string;
  updatedAt?: string;
  createdAt?: string;
};

// The public endpoint caps `limit` at 50 (BlogPublicQueryDto @Max(50)), so page
// through it until a short page signals the end. Returns PUBLISHED posts only.
async function getPublishedPosts(): Promise<PostRow[]> {
  const PAGE_SIZE = 50;
  const MAX_PAGES = 40; // safety ceiling (≈2000 posts)
  const all: PostRow[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(
        `${apiUrl}/public/blog-posts?limit=${PAGE_SIZE}&page=${page}`,
        { cache: 'no-store' },
      );
      if (!res.ok) break;
      const json = await res.json();
      const data = json.data ?? json;
      const items: PostRow[] = Array.isArray(data) ? data : data.items || [];
      all.push(...items);
      if (items.length < PAGE_SIZE) break;
    }
  } catch {
    // Return whatever was collected before the failure.
  }
  return all;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/partner`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.4 },
  ];

  const posts = await getPublishedPosts();
  const postRoutes: MetadataRoute.Sitemap = posts
    .filter((p) => !!p.slug)
    .map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.updatedAt || p.publishedAt || p.createdAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  return [...staticRoutes, ...postRoutes];
}
