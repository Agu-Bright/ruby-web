import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { BlogListClient } from '@/components/blog/BlogListClient';
import type { BlogPost } from '@/lib/blog';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Always render fresh so a newly published/edited post shows immediately.
// (ISR was caching an empty list from build time → "Stories are coming soon".)
export const dynamic = 'force-dynamic';

async function getPosts(): Promise<BlogPost[]> {
  try {
    const response = await fetch(`${apiUrl}/public/blog-posts?limit=48`, { cache: 'no-store' });
    if (!response.ok) return [];
    const json = await response.json();
    const data = json.data || json;
    return Array.isArray(data) ? data : data.items || [];
  } catch {
    return [];
  }
}

export const metadata = {
  title: 'Ruby+ Blog | Stories, guides and Nigeria updates',
  description: 'Stories, guides and local discoveries from the Ruby+ community.',
};

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 pt-16">
        <section className="bg-gradient-to-br from-[#1f0a15] via-[#6d1524] to-ruby-red px-5 py-20 text-white">
          <div className="mx-auto max-w-6xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.24em] text-white/70">
              Ruby+ journal
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
              Stories that bring you closer to Nigeria.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-white/80 md:text-lg">
              Guides, local discoveries and ideas from the Ruby+ community.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-12">
          {posts.length ? (
            <BlogListClient posts={posts} />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
              <h2 className="text-xl font-bold text-gray-900">Stories are coming soon.</h2>
              <p className="mt-2 text-gray-600">
                Check back for Ruby+ guides, updates and local discoveries.
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
