import GithubSlugger from 'github-slugger';

export type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category?: string;
  tags?: string[];
  coverImageUrl?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string;
  authorName?: string;
  createdAt?: string;
};

export type TocItem = { id: string; text: string; level: number };

/** Strip markdown to rough plain text — used for word counts / previews. */
export function markdownToPlainText(markdown: string): string {
  return (markdown || '')
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → text
    .replace(/^[#>\-*+]\s+/gm, '') // list/heading/quote markers
    .replace(/[*_~`#>]/g, '') // stray emphasis chars
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(markdown: string): number {
  const text = markdownToPlainText(markdown);
  return text ? text.split(/\s+/).length : 0;
}

/** Average adult reads ~225 wpm; floor of 1 minute. */
export function readingTimeMinutes(markdown: string): number {
  return Math.max(1, Math.round(wordCount(markdown) / 225));
}

/**
 * Extract an ordered heading outline from markdown. Slugs are generated with
 * the SAME github-slugger algorithm (and dedupe order) that `rehype-slug` uses
 * when rendering the article, so every TOC anchor resolves to a real heading.
 * Only h2/h3 are surfaced — h1 is the article title, h4+ is too granular.
 */
export function extractToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  const lines = (markdown || '').split('\n');
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const level = match[1].length;
    const rawText = match[2].trim();
    // github-slugger is stateful; call it for EVERY heading (h1..h6) in order
    // so dedupe counters line up with rehype-slug's, even for levels we skip.
    const id = slugger.slug(stripInlineMarkdown(rawText));
    if (level >= 2 && level <= 3) {
      items.push({ id, text: stripInlineMarkdown(rawText), level });
    }
  }
  return items;
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .trim();
}

export function formatBlogDate(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}
