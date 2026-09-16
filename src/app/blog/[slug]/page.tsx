import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Clock, CalendarDays } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { MarkdownArticle } from '@/components/blog/MarkdownArticle';
import { ReadingProgress } from '@/components/blog/ReadingProgress';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { ShareButtons } from '@/components/blog/ShareButtons';
import {
  extractToc,
  readingTimeMinutes,
  formatBlogDate,
  markdownToPlainText,
  type BlogPost,
} from '@/lib/blog';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${apiUrl}/public/blog-posts/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || json;
  } catch {
    return null;
  }
}

async function getRelated(category: string | undefined, excludeSlug: string): Promise<BlogPost[]> {
  try {
    const qs = category ? `&category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`${apiUrl}/public/blog-posts?limit=4${qs}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json.data || json;
    const items: BlogPost[] = Array.isArray(data) ? data : data.items || [];
    return items.filter((p) => p.slug !== excludeSlug).slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Article not found | Ruby+' };
  const description = post.excerpt || markdownToPlainText(post.content).slice(0, 155);
  return {
    title: `${post.title} | Ruby+ Journal`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: post.authorName ? [post.authorName] : undefined,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
    twitter: {
      card: post.coverImageUrl ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const toc = extractToc(post.content);
  const minutes = readingTimeMinutes(post.content);
  const related = await getRelated(post.category, post.slug);

  return (
    <>
      <Navbar />
      <ReadingProgress />
      <main className="min-h-screen bg-white pt-16">
        {/* Header */}
        <div className="mx-auto max-w-3xl px-5 pt-12 md:pt-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ruby-red hover:gap-2.5 transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Back to journal
          </Link>
          {post.category && (
            <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-ruby-red">
              {post.category}
            </p>
          )}
          <h1 className="mt-3 text-4xl font-bold leading-tight text-gray-950 md:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-gray-600">{post.excerpt}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ruby-red/10 text-xs font-bold text-ruby-red">
                {(post.authorName || 'Ruby+').slice(0, 1).toUpperCase()}
              </span>
              <span className="font-medium text-gray-700">{post.authorName || 'Ruby+'}</span>
            </span>
            {post.publishedAt && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {formatBlogDate(post.publishedAt)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {minutes} min read
            </span>
          </div>
        </div>

        {/* Cover */}
        {post.coverImageUrl && (
          <div className="mx-auto mt-10 max-w-4xl px-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="aspect-[16/9] w-full rounded-2xl object-cover shadow-sm"
            />
          </div>
        )}

        {/* Body + TOC */}
        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-10 px-5 xl:grid-cols-[1fr_240px]">
          <article className="min-w-0 max-w-3xl">
            <MarkdownArticle content={post.content} />

            {post.tags?.length ? (
              <div className="mt-12 flex flex-wrap gap-2 border-t pt-6">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-ruby-red hover:bg-rose-100"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="mt-8 border-t pt-6">
              <ShareButtons title={post.title} />
            </div>
          </article>

          <aside className="sticky top-28 hidden h-fit xl:block">
            <TableOfContents items={toc} />
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mx-auto mt-20 max-w-6xl border-t px-5 py-14">
            <h2 className="text-2xl font-bold text-gray-950">More from the journal</h2>
            <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r._id}
                  href={`/blog/${r.slug}`}
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {r.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.coverImageUrl}
                      alt={r.title}
                      className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-ruby-red/15 to-rose-100 text-4xl">
                      ♦
                    </div>
                  )}
                  <div className="p-5">
                    {r.category && (
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ruby-red">
                        {r.category}
                      </p>
                    )}
                    <h3 className="font-bold leading-snug text-gray-900 group-hover:text-ruby-red">
                      {r.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{r.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
