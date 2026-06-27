'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ScrollReveal from './ScrollReveal';
import {
  useSelectedLocation,
  RUBY_PLUS_API_BASE,
} from '@/lib/selected-location';

// P128-LAND — Featured Services scoped to the city currently picked
// in the RedStrip location picker (defaults to Lagos). Fetches the
// backend `whats-hot` feed (admin-curated + merchant-paid promotions
// + organic high-rated, sorted by promotion then rating) for the
// selected location and refetches when the user changes city. Falls
// back to a small placeholder set if the fetch fails so the section
// is never blank.

interface PublicBusinessCard {
  _id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  media?: { url: string; type?: string }[];
  averageRating?: number;
  weightedRating?: number | null;
  totalReviews?: number;
  weightedRatingCount?: number;
  categoryId?: { name?: string } | string;
  subcategoryId?: { name?: string } | string;
  address?: { city?: string; state?: string };
  _isSponsored?: boolean;
  _isFeatured?: boolean;
}

interface ServiceCard {
  id: string;
  image: string;
  title: string;
  tags: string[];
  rating: number;
  reviews: number;
  location: string;
  href: string;
}

// Fallback shown when the env var is missing or the fetch fails. Keeps
// the section visually populated; merchants see a "wire up the env var"
// breadcrumb in DevTools console only.
const FALLBACK: ServiceCard[] = [
  {
    id: 'fb-1',
    image: 'https://picsum.photos/seed/svc1/400/260',
    title: 'Top Wedding Vendors',
    tags: ['Events', 'Premium'],
    rating: 4.5,
    reviews: 128,
    location: 'Lagos, Nigeria',
    href: '#',
  },
  {
    id: 'fb-2',
    image: 'https://picsum.photos/seed/svc2/400/260',
    title: 'Family & Home Services',
    tags: ['Home Services', 'Verified'],
    rating: 4.8,
    reviews: 86,
    location: 'Lagos, Nigeria',
    href: '#',
  },
  {
    id: 'fb-3',
    image: 'https://picsum.photos/seed/svc3/400/260',
    title: 'Restaurant and Bar Guide',
    tags: ['Restaurant', 'Nightlife'],
    rating: 4.3,
    reviews: 210,
    location: 'Lagos, Nigeria',
    href: '#',
  },
  {
    id: 'fb-4',
    image: 'https://picsum.photos/seed/svc4/400/260',
    title: 'Professional Photography',
    tags: ['Creative', 'Events'],
    rating: 4.9,
    reviews: 156,
    location: 'Lagos, Nigeria',
    href: '#',
  },
];

function mapBusinessToCard(b: PublicBusinessCard): ServiceCard {
  const image =
    b.coverImageUrl ||
    b.media?.find((m) => m.type !== 'VIDEO')?.url ||
    b.logoUrl ||
    `https://picsum.photos/seed/${b._id}/400/260`;
  const categoryName =
    typeof b.categoryId === 'object' && b.categoryId
      ? b.categoryId.name
      : undefined;
  const subcategoryName =
    typeof b.subcategoryId === 'object' && b.subcategoryId
      ? b.subcategoryId.name
      : undefined;
  const tags = [categoryName, subcategoryName].filter(Boolean) as string[];
  if (b._isSponsored) tags.unshift('Sponsored');
  else if (b._isFeatured) tags.unshift('Featured');
  const rating = b.weightedRating ?? b.averageRating ?? 0;
  const reviews = b.weightedRatingCount ?? b.totalReviews ?? 0;
  const cityState = [b.address?.city, b.address?.state]
    .filter(Boolean)
    .join(', ');
  return {
    id: b._id,
    image,
    title: b.name,
    tags: tags.slice(0, 2),
    rating: Number(rating),
    reviews: Number(reviews),
    location: cityState || 'Lagos, Nigeria',
    href: `/business/${b.slug || b._id}`,
  };
}

function Stars({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${s <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1.5 text-[10px] sm:text-xs text-gray-500">({reviews})</span>
    </div>
  );
}

export default function FeaturedServices() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [services, setServices] = useState<ServiceCard[]>(FALLBACK);
  const [, setLoading] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const { selectedLocation } = useSelectedLocation();

  // Track scroll position to enable/disable arrow buttons. Runs on scroll
  // events + when services array changes (e.g. after fetch). useCallback
  // so the listener handler reference is stable.
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, services.length]);

  const scrollBy = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by roughly one card width plus gap. Empirical card widths
    // are 280/320/340 across breakpoints — use 80% of viewport so the
    // user lands on the next set cleanly without overshooting.
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  // Refetch whenever the user picks a different city in RedStrip.
  // Best-effort — on any failure we keep the previous data so the
  // section is never empty (a flash of fallback is better than blank).
  useEffect(() => {
    if (!selectedLocation?._id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${RUBY_PLUS_API_BASE}/public/businesses/whats-hot?locationId=${selectedLocation._id}&limit=8`,
        );
        if (!res.ok) return;
        const json = await res.json();
        const data: PublicBusinessCard[] = Array.isArray(json?.data)
          ? json.data
          : [];
        if (cancelled) return;
        if (data.length > 0) {
          setServices(data.map(mapBusinessToCard));
        }
      } catch {
        // Silent — previous data stays visible
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedLocation?._id]);

  return (
    <section
      className="relative py-12 sm:py-16 lg:py-20 bg-ruby-gray overflow-hidden"
      id="about"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold text-ruby-red uppercase tracking-widest mb-1">
              Discover the Best
            </p>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-ruby-black uppercase tracking-wide">
              Featured Services in {selectedLocation?.name || 'Lagos'}
            </h2>
            <div className="mt-2 w-12 h-1 bg-ruby-red rounded-full mx-auto sm:mx-0" />
          </div>
        </ScrollReveal>

        {/* Horizontal Scrolling Cards */}
        <div className="mt-8 sm:mt-10 relative group">
          {/* Left scroll arrow — desktop only, hidden when at start */}
          <button
            type="button"
            aria-label="Scroll featured services left"
            onClick={() => scrollBy('left')}
            disabled={!canScrollLeft}
            className={`hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-11 h-11 rounded-full bg-white shadow-lg items-center justify-center text-ruby-black hover:bg-ruby-red hover:text-white transition-all ${
              canScrollLeft
                ? 'opacity-0 group-hover:opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {/* Right scroll arrow — desktop only, hidden when at end */}
          <button
            type="button"
            aria-label="Scroll featured services right"
            onClick={() => scrollBy('right')}
            disabled={!canScrollRight}
            className={`hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-11 h-11 rounded-full bg-white shadow-lg items-center justify-center text-ruby-black hover:bg-ruby-red hover:text-white transition-all ${
              canScrollRight
                ? 'opacity-0 group-hover:opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div
            ref={scrollRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {services.map((svc) => (
              <Link
                key={svc.id}
                href={svc.href}
                className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[340px] bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 snap-start hover:shadow-md transition-shadow"
              >
                <div className="relative h-36 sm:h-44 lg:h-48 overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={svc.image}
                    alt={svc.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="text-sm sm:text-base font-semibold text-ruby-black mb-2 line-clamp-1">
                    {svc.title}
                  </h3>
                  {svc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {svc.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] sm:text-[11px] font-medium px-2 sm:px-2.5 py-0.5 rounded-full bg-red-50 text-ruby-red"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mb-3">
                    <Stars rating={svc.rating} reviews={svc.reviews} />
                  </div>
                  <div className="flex items-center">
                    <span className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1">
                      <svg
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                      </svg>
                      {svc.location}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Scroll Indicators (dots) - Mobile only */}
          {services.length > 0 && (
            <div className="flex justify-center gap-1.5 mt-4 sm:hidden">
              {services.slice(0, 4).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
