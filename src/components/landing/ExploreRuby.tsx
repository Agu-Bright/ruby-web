'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ScrollReveal from './ScrollReveal';
import {
  useSelectedLocation,
  RUBY_PLUS_API_BASE,
} from '@/lib/selected-location';

// P128-LAND — Explore Ruby+ scoped to the city currently picked in
// the RedStrip location picker (defaults to Lagos). Fetches the public
// Ruby+ Select aggregator feed (mix of admin-curated posts,
// FEATURED_LISTING ads, and what's-hot business fallback) for the
// selected location and refetches when the user changes city. Falls
// back to a small placeholder set if the fetch fails.

/**
 * Ruby+ Select feed item shapes (kind discriminator).
 * Backend `/public/ruby-select?locationId=X` returns an array of items
 * with one of these `kind` values. Each kind has a slightly different
 * payload — we normalize to a single ArticleCard for rendering.
 */
type RubySelectKind =
  | 'ADMIN_POST'
  | 'FEATURED_LISTING'
  | 'FEATURED_BUSINESS'
  | 'WHATS_HOT'
  | 'BUSINESS_BANNER'
  | string;

interface RubySelectItem {
  kind: RubySelectKind;
  // Common-ish fields
  _id?: string;
  id?: string;
  title?: string;
  excerpt?: string;
  body?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  media?: { url: string; type?: string }[];
  href?: string;
  authorName?: string;
  publishedAt?: string;
  // Business-shaped variants
  business?: {
    _id: string;
    name?: string;
    slug?: string;
    coverImageUrl?: string;
    logoUrl?: string;
  };
  // Fallback nested object for misc shapes
  data?: any;
}

interface ArticleCard {
  id: string;
  image: string;
  title: string;
  kindLabel: string;
  href: string;
}

const FALLBACK: ArticleCard[] = [
  {
    id: 'fb-1',
    image: 'https://picsum.photos/seed/explore1/400/260',
    title: 'Discover hidden gems across Lagos — from beach bars to fine dining',
    kindLabel: 'Ruby+ Select',
    href: '#',
  },
  {
    id: 'fb-2',
    image: 'https://picsum.photos/seed/explore2/400/260',
    title: 'Top-rated nightlife spots in Victoria Island this week',
    kindLabel: 'Featured',
    href: '#',
  },
  {
    id: 'fb-3',
    image: 'https://picsum.photos/seed/explore3/400/260',
    title: 'Lagos hotel guide: where the diaspora actually stays',
    kindLabel: 'Editor Picks',
    href: '#',
  },
  {
    id: 'fb-4',
    image: 'https://picsum.photos/seed/explore4/400/260',
    title: 'Best home services in Lekki and Ikoyi — verified by Ruby+',
    kindLabel: 'Trending',
    href: '#',
  },
  {
    id: 'fb-5',
    image: 'https://picsum.photos/seed/explore5/400/260',
    title: 'Where to eat suya at 2am: a Lagos nightlife guide',
    kindLabel: 'Featured',
    href: '#',
  },
];

function kindToLabel(kind: RubySelectKind): string {
  switch (kind) {
    case 'ADMIN_POST':
      return 'Ruby+ Select';
    case 'FEATURED_LISTING':
      return 'Featured';
    case 'FEATURED_BUSINESS':
      return 'Featured';
    case 'WHATS_HOT':
      return "What's Hot";
    case 'BUSINESS_BANNER':
      return 'Prime';
    default:
      return 'Ruby+ Select';
  }
}

function mapItemToCard(item: RubySelectItem): ArticleCard | null {
  const id = item._id || item.id || item.business?._id || '';
  if (!id) return null;
  const biz = item.business;
  const image =
    item.coverImageUrl ||
    item.imageUrl ||
    item.media?.find((m) => m.type !== 'VIDEO')?.url ||
    biz?.coverImageUrl ||
    biz?.logoUrl ||
    `https://picsum.photos/seed/${id}/400/260`;
  const title = item.title || biz?.name || 'Discover on Ruby+';
  // Prefer business deep-link when item carries one, else item-level href,
  // else fall back to home so the click is never a dead "#".
  const href =
    item.href ||
    (biz?._id ? `/business/${biz.slug || biz._id}` : '/');
  return {
    id,
    image,
    title,
    kindLabel: kindToLabel(item.kind),
    href,
  };
}

export default function ExploreRuby() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [articles, setArticles] = useState<ArticleCard[]>(FALLBACK);
  const { selectedLocation } = useSelectedLocation();

  // Refetch when the user picks a different city in RedStrip.
  useEffect(() => {
    if (!selectedLocation?._id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${RUBY_PLUS_API_BASE}/public/ruby-select?locationId=${selectedLocation._id}`,
        );
        if (!res.ok) return;
        const json = await res.json();
        const data: RubySelectItem[] = Array.isArray(json?.data)
          ? json.data
          : [];
        if (cancelled) return;
        const mapped = data
          .map(mapItemToCard)
          .filter((c): c is ArticleCard => !!c);
        if (mapped.length > 0) setArticles(mapped);
      } catch {
        // Silent — previous data stays visible
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedLocation?._id]);

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="relative">
            {/* String decorations - hidden on mobile */}
            <div
              className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[50%] w-24 xl:w-32 h-56 xl:h-64 bg-contain bg-no-repeat bg-center -scale-x-100 z-20"
              style={{ backgroundImage: 'url(/images/string1.png)' }}
              aria-hidden="true"
            />
            <div
              className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-[50%] w-24 xl:w-32 h-56 xl:h-64 bg-contain bg-no-repeat bg-center z-20"
              style={{ backgroundImage: 'url(/images/string2.png)' }}
              aria-hidden="true"
            />

            <div
              className="relative rounded-2xl sm:rounded-[2rem] lg:rounded-[3rem] overflow-hidden px-4 sm:px-8 lg:px-16 py-10 sm:py-12 lg:py-16"
              style={{
                background:
                  'linear-gradient(59.68deg, #97201C -49.52%, #FD362F 182.5%)',
              }}
            >
              <div className="text-center mb-6 sm:mb-10">
                <h2
                  className="font-playfair text-xl sm:text-2xl lg:text-4xl font-bold text-white uppercase"
                  style={{ fontVariant: 'small-caps' }}
                >
                  Explore Ruby+ in {selectedLocation?.name || 'Lagos'}
                </h2>
                <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs lg:text-sm text-white/70 max-w-xl mx-auto leading-relaxed px-4">
                  Editor picks, what&apos;s hot, and trending businesses —
                  curated weekly for {selectedLocation?.name || 'Lagos'}.
                </p>
              </div>

              {/* Horizontal Scrolling Cards */}
              <div
                ref={scrollRef}
                className="flex gap-3 sm:gap-4 lg:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    href={article.href}
                    className="flex-shrink-0 w-[240px] sm:w-[280px] lg:w-[300px] bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-lg snap-start hover:shadow-xl transition-shadow"
                  >
                    <div className="rounded-lg sm:rounded-xl overflow-hidden mb-3 sm:mb-4 bg-gray-100 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-32 sm:h-36 lg:h-44 object-cover"
                      />
                      <span className="absolute top-2 left-2 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-ruby-red text-white">
                        {article.kindLabel}
                      </span>
                    </div>
                    <div className="px-0.5 sm:px-1 pb-1">
                      <h3 className="text-xs sm:text-sm font-bold text-ruby-black leading-snug mb-2 line-clamp-2 sm:line-clamp-3">
                        {article.title}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-ruby-red font-semibold">
                        View on Ruby+ →
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Scroll dots - Mobile */}
              {articles.length > 0 && (
                <div className="flex justify-center gap-1.5 mt-2 sm:hidden">
                  {articles.slice(0, 4).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-white/30"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
