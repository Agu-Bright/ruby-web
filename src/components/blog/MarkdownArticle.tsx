'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

/**
 * Renders blog markdown as real, sanitized HTML.
 *
 * - `remark-gfm` adds tables, task lists, strikethrough, autolinks.
 * - `rehype-slug` adds ids to headings so the table-of-contents anchors work
 *   (ids match `extractToc` in `@/lib/blog`, which uses the same slugger).
 * - Raw HTML in the source is intentionally NOT rendered (no `rehype-raw`),
 *   matching the backend contract "public clients never render raw HTML".
 */
export function MarkdownArticle({ content }: { content: string }) {
  return (
    <div className="prose prose-lg max-w-none prose-headings:scroll-mt-28 prose-headings:font-bold prose-headings:text-gray-950 prose-p:text-gray-700 prose-a:text-ruby-red prose-a:font-medium hover:prose-a:text-ruby-700 prose-strong:text-gray-900 prose-blockquote:border-l-ruby-red prose-blockquote:bg-rose-50/50 prose-blockquote:py-1 prose-blockquote:px-5 prose-blockquote:not-italic prose-blockquote:text-gray-700 prose-code:text-ruby-700 prose-code:before:content-[''] prose-code:after:content-[''] prose-code:bg-rose-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-950 prose-pre:text-gray-100 prose-img:rounded-2xl prose-img:shadow-md prose-hr:border-gray-200 prose-th:text-gray-900 prose-li:text-gray-700 prose-li:marker:text-ruby-red">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a: ({ href, children, node, ...props }) => {
            void node;
            const external = !!href && /^https?:\/\//.test(href);
            return (
              <a
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                {...props}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => {
            const url = typeof src === 'string' ? src : '';
            if (!url) return null; // skip malformed/empty images instead of a broken icon
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={url} alt={alt || ''} loading="lazy" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
