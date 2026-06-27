/**
 * P120-E1 — Public SSR business profile.
 *
 * Reachable at `/business/<slug-or-id>` (the route param accepts either —
 * the backend `/public/businesses/:idOrSlug` endpoint resolves both).
 *
 * SSR-rendered Next.js page that fetches a Business by slug/id and
 * renders a marketing-grade profile: hero, gallery, contact, hours,
 * tier badge, and a CTA to open the merchant in the customer mobile
 * app via universal/deep link.
 *
 * P128-LAND restyle — brought into visual parity with the landing page:
 *   - Brand palette (ruby-red, ruby-black, ruby-gray) instead of generic
 *     Tailwind reds
 *   - Playfair Display for hero headings (matches landing typography)
 *   - Red gradient cover fallback (matches RedStrip + Hero accents)
 *   - Live App Store + Google Play deep-links from Hero/Footer pattern
 *
 * Renders Schema.org `LocalBusiness` JSON-LD for SEO so search engines
 * surface the public profile when people search the merchant's name.
 *
 * 404s cleanly when the slug doesn't resolve.
 */

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const API_BASE =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.rubyplus.net/api";

// Live store links (mirrors Hero.tsx + Footer.tsx).
const APP_STORE_URL = "https://apps.apple.com/us/app/ruby/id6760121727";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.rubyplus.customer";

async function fetchBusiness(slug: string) {
  try {
    const res = await fetch(
      `${API_BASE}/public/businesses/${encodeURIComponent(slug)}`,
      {
        // SSR — cache for 60s so a viral merchant doesn't hammer the
        // backend during a traffic spike, but updates surface fast
        // enough for ops.
        next: { revalidate: 60 },
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

async function fetchTier(businessId: string) {
  try {
    const res = await fetch(
      `${API_BASE}/public/businesses/${businessId}/tier`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await fetchBusiness(slug);
  if (!business) {
    return { title: "Business not found | Ruby+" };
  }
  const desc =
    business.description ||
    business.tagline ||
    `Discover ${business.name} on Ruby+. Order, book, or visit.`;
  return {
    title: `${business.name} | Ruby+`,
    description: desc.slice(0, 160),
    openGraph: {
      title: business.name,
      description: desc.slice(0, 200),
      images: business.coverImageUrl
        ? [business.coverImageUrl]
        : business.logoUrl
          ? [business.logoUrl]
          : [],
    },
  };
}

export default async function BusinessPublicProfile({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await fetchBusiness(slug);
  if (!business) {
    notFound();
  }

  const tier = await fetchTier(business._id);
  const tierBadge =
    tier?.tier === "PRIME"
      ? { label: "Prime", className: "bg-gradient-to-r from-amber-500 to-amber-600 text-white" }
      : tier?.tier === "GROWTH"
        ? { label: "Growth", className: "bg-gradient-to-r from-purple-500 to-purple-600 text-white" }
        : tier?.tier === "STARTER"
          ? { label: "Starter", className: "bg-gradient-to-r from-blue-500 to-blue-600 text-white" }
          : null;

  const cover = business.coverImageUrl || business.logoUrl;
  const address = business.address;
  const contact = business.contact;
  const gallery = (business.media || []).filter(
    (m: { type?: string; url?: string }) =>
      m.type === "IMAGE" && m.url !== business.logoUrl,
  );
  const ratingValue = business.weightedRating ?? business.averageRating ?? null;
  const reviewCount =
    business.weightedRatingCount ?? business.totalReviews ?? 0;

  // Categorize tags from category/subcategory metadata for the pill row
  const categoryTags: string[] = [];
  if (typeof business.categoryId === "object" && business.categoryId?.name) {
    categoryTags.push(business.categoryId.name);
  }
  if (
    typeof business.subcategoryId === "object" &&
    business.subcategoryId?.name
  ) {
    categoryTags.push(business.subcategoryId.name);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.description || business.tagline,
    image: cover ? [cover] : [],
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address.street,
          addressLocality: address.city,
          addressRegion: address.state,
          addressCountry: address.country || "NG",
        }
      : undefined,
    telephone: contact?.phone,
    email: contact?.email,
    url: contact?.website,
    aggregateRating:
      ratingValue && reviewCount
        ? {
            "@type": "AggregateRating",
            ratingValue,
            reviewCount,
          }
        : undefined,
  };

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Schema.org JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative">
        {cover ? (
          <div className="relative w-full aspect-[16/7] md:aspect-[16/5] bg-ruby-gray">
            <Image
              src={cover}
              alt={business.name}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            {/* Dark gradient so the white profile card pops over the photo */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        ) : (
          // Brand-red fallback (mirrors RedStrip gradient) when no cover image
          <div
            className="w-full aspect-[16/5]"
            style={{
              background:
                "linear-gradient(59.68deg, #97201C -49.52%, #FD362F 182.5%)",
            }}
          />
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-20 md:-mt-32 relative z-10">
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.10)] p-5 sm:p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-6">
            {business.logoUrl ? (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-white shadow-lg flex-none bg-ruby-gray">
                <Image
                  src={business.logoUrl}
                  alt={business.name + " logo"}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
            ) : null}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold text-ruby-black">
                  {business.name}
                </h1>
                {tierBadge && (
                  <span
                    className={`px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider ${tierBadge.className} shadow-md`}
                  >
                    {tierBadge.label}
                  </span>
                )}
                {tier?.attentionBadgeEnabled && !tierBadge && (
                  <span className="px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider bg-teal-500 text-white shadow-md">
                    Attention
                  </span>
                )}
              </div>
              {business.tagline && (
                <p className="text-sm sm:text-base text-gray-500 italic mb-3">
                  {business.tagline}
                </p>
              )}
              {/* Category pills */}
              {categoryTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {categoryTags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] sm:text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-ruby-red"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {/* Rating row */}
              <div className="flex items-center gap-4 text-sm text-gray-700 flex-wrap">
                {ratingValue ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg
                          key={s}
                          className={`w-4 h-4 ${
                            s <= Math.round(Number(ratingValue))
                              ? "text-amber-400"
                              : "text-gray-200"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="font-semibold text-ruby-black">
                      {Number(ratingValue).toFixed(1)}
                    </span>
                    <span className="text-gray-500">
                      ({reviewCount} reviews)
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">
                    No reviews yet — be the first
                  </span>
                )}
                {address?.city && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <svg
                      className="w-3.5 h-3.5"
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
                    {[address.city, address.state]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              {contact?.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="btn-ruby px-5 py-2.5 bg-ruby-red text-white rounded-lg font-semibold text-sm text-center hover:bg-ruby-red/90 transition uppercase tracking-wide"
                >
                  Call now
                </a>
              )}
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 border border-gray-200 text-ruby-black rounded-lg font-semibold text-sm text-center hover:bg-ruby-gray transition"
              >
                Open in app
              </a>
            </div>
          </div>

          {/* Back to home — small link, top-left of card area */}
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-ruby-red transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Ruby+
            </Link>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid md:grid-cols-3 gap-8">
        {/* Left — about + gallery */}
        <div className="md:col-span-2 space-y-10">
          {business.description && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-playfair text-2xl font-bold text-ruby-black">
                  About
                </h2>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {business.description}
              </p>
            </div>
          )}

          {gallery.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-playfair text-2xl font-bold text-ruby-black">
                  Gallery
                </h2>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {gallery
                  .slice(0, 9)
                  .map(
                    (
                      m: { url: string; caption?: string },
                      idx: number,
                    ) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden bg-ruby-gray group"
                      >
                        <Image
                          src={m.url}
                          alt={
                            m.caption ||
                            `${business.name} photo ${idx + 1}`
                          }
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                      </div>
                    ),
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Right — contact + hours + app CTA */}
        <aside className="space-y-5">
          {address && (
            <div className="bg-ruby-gray rounded-2xl p-5 border border-gray-100">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3">
                Location
              </h3>
              <div className="text-ruby-black space-y-1 text-sm leading-relaxed">
                {address.landmark && <div>{address.landmark}</div>}
                {address.street && <div>{address.street}</div>}
                <div>
                  {[address.city, address.state, address.country]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            </div>
          )}

          {contact && (
            <div className="bg-ruby-gray rounded-2xl p-5 border border-gray-100">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3">
                Contact
              </h3>
              <ul className="text-sm space-y-2.5">
                {contact.phone && (
                  <li>
                    <span className="text-gray-400 text-xs uppercase tracking-wider">
                      Phone
                    </span>
                    <a
                      href={`tel:${contact.phone}`}
                      className="block text-ruby-red font-semibold mt-0.5"
                    >
                      {contact.phone}
                    </a>
                  </li>
                )}
                {contact.email && (
                  <li>
                    <span className="text-gray-400 text-xs uppercase tracking-wider">
                      Email
                    </span>
                    <a
                      href={`mailto:${contact.email}`}
                      className="block text-ruby-red font-semibold break-all mt-0.5"
                    >
                      {contact.email}
                    </a>
                  </li>
                )}
                {contact.website && (
                  <li>
                    <span className="text-gray-400 text-xs uppercase tracking-wider">
                      Website
                    </span>
                    <a
                      href={
                        contact.website.startsWith("http")
                          ? contact.website
                          : `https://${contact.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-ruby-red font-semibold break-all mt-0.5"
                    >
                      {contact.website}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* App CTA — mirrors the brand red gradient from RedStrip */}
          <div
            className="rounded-2xl p-5 text-white relative overflow-hidden"
            style={{
              background:
                "linear-gradient(59.68deg, #97201C -49.52%, #FD362F 182.5%)",
            }}
          >
            <h3 className="font-playfair text-xl font-bold mb-1">
              Best on mobile
            </h3>
            <p className="text-xs text-white/80 mb-4 leading-relaxed">
              Open Ruby+ on iOS or Android to order, book, chat, and earn rewards.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-lg text-xs font-semibold border border-white/20 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                </svg>
                Download on the App Store
              </a>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-lg text-xs font-semibold border border-white/20 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" />
                </svg>
                Get it on Google Play
              </a>
            </div>
          </div>
        </aside>
      </section>

      <Footer />
    </main>
  );
}
