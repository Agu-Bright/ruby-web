'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ScrollReveal from './ScrollReveal';

// P128-LAND — Lagos data wiring for the landing page Featured Services
// section. Fetches the backend `whats-hot` feed (admin-curated +
// merchant-paid promotions + organic high-rated, sorted by promotion
// then rating). Falls back to a small Lagos-themed placeholder set if
// the env var is missing or the fetch fails, so the section is never
// blank.
//
// Environment:
//   NEXT_PUBLIC_API_URL          — backend root (e.g. https://api.rubyplus.net/api)
//   NEXT_PUBLIC_LAGOS_LOCATION_ID — ObjectId of the Lagos location doc.
//                                   See backend /admin/locations to find it.
//                                   Without this, the section renders the
//                                   fallback set below.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.rubyplus.net/api';
const LAGOS_LOCATION_ID = process.env.NEXT_PUBLIC_LAGOS_LOCATION_ID || '';

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

  // Fetch Lagos whats-hot businesses from the public backend endpoint.
  // Best-effort: on any failure we keep the fallback set so the section
  // is never empty.
  useEffect(() => {
    let cancelled = false;
    if (!LAGOS_LOCATION_ID) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(
          '[FeaturedServices] NEXT_PUBLIC_LAGOS_LOCATION_ID not set — showing fallback. Set it in .env.local to fetch real Lagos businesses.',
        );
      }
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE}/public/businesses/whats-hot?locationId=${LAGOS_LOCATION_ID}&limit=8`,
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
        // Silent — fallback already set on mount
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
              Featured Services in Lagos
            </h2>
            <div className="mt-2 w-12 h-1 bg-ruby-red rounded-full mx-auto sm:mx-0" />
          </div>
        </ScrollReveal>

        {/* Horizontal Scrolling Cards */}
        <div className="mt-8 sm:mt-10 relative">
          <div
            ref={scrollRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
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
                  <div className="flex items-center justify-between">
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
                    <span className="text-[10px] sm:text-xs font-semibold px-3 sm:px-4 py-1.5 bg-ruby-red text-white rounded-full">
                      View
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

        {/* Write Review CTA */}
        <div className="mt-8 sm:mt-12 bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between p-5 sm:p-6 lg:p-8 gap-4">
          <div className="text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-bold text-ruby-black">
              Write a Review
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Help others find the best in town.
            </p>
          </div>
          <a
            href="https://apps.apple.com/us/app/ruby/id6760121727"
            target="_blank"
            rel="noreferrer noopener"
            className="w-full sm:w-auto px-6 py-2.5 bg-ruby-red text-white text-sm font-semibold rounded-lg whitespace-nowrap hover:bg-ruby-red/90 transition-colors text-center"
          >
            Leave a Review
          </a>
        </div>
      </div>
    </section>
  );
}
