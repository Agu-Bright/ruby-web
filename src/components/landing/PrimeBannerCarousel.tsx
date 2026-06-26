"use client";

/**
 * P120-E2 — Home page Prime banner carousel.
 *
 * Renders the same Prime-tier banner images that mobile shows in the
 * Ruby+ Select home carousel. Fetches the public ruby-select feed,
 * filters to `kind === 'BUSINESS_BANNER'` items, and lays them out as
 * a horizontally-scrollable strip of full-bleed banner cards with a
 * gold "PRIME" pill.
 *
 * Tap → /business/[slug] (the new SSR public profile, E1).
 *
 * Renders nothing when there are no Prime banners — no empty state,
 * no skeleton. Avoids visual noise on a landing page that already
 * has plenty of sections.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface PrimeBannerItem {
  id: string;
  businessId: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  // Backend stamps `slug` on deepLink path; we extract it client-side
  // since the public ruby-select endpoint doesn't return slug directly.
  // For V1 we route to /business/<businessId> as a fallback.
}

export default function PrimeBannerCarousel() {
  const [items, setItems] = useState<PrimeBannerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://api.rubyplus.net/api";
    fetch(`${base}/public/ruby-select`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((res) => {
        const all = Array.isArray(res?.data) ? res.data : [];
        const banners = all
          .filter((it: any) => it?.kind === "BUSINESS_BANNER")
          .map((it: any) => ({
            id: it.id,
            businessId: it.businessId,
            title: it.title,
            subtitle: it.subtitle,
            imageUrl: it.imageUrl,
          }));
        setItems(banners);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <section className="py-12 bg-gray-50 border-t border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Featured Businesses
            </h2>
            <p className="text-gray-600 mt-1">
              Premium merchants on Ruby+
            </p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-6">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/business/${item.businessId}`}
                className="flex-none w-[320px] md:w-[400px] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow group"
              >
                <div className="relative w-full aspect-[16/9] bg-gray-200">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 320px, 400px"
                  />
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md tracking-wider">
                    PRIME
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
                    <h3 className="text-white font-bold text-lg leading-tight">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="text-white/80 text-sm mt-1">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
