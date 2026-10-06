import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rubyplus.net';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Served at /sitemap.xml. Refreshed hourly so newly published posts are
// discoverable by Google without a redeploy.
export const revalidate = 3600;

type PostRow = {
  slug?: string;
  publishedAt?: string;
  updatedAt?: string;
  createdAt?: string;
};

async function getPublishedPosts(): Promise<PostRow[]> {
  try {
    // Public endpoint already returns PUBLISHED posts only.
    const res = await fetch(`${apiUrl}/public/blog-posts?limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json.data ?? json;
    const items = Array.isArray(data) ? data : data.items || [];
    return items as PostRow[];
  } catch {
    return [];
  }
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
