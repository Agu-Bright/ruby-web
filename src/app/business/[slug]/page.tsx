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
      ? { label: "Prime", className: "bg-amber-600 text-white" }
      : tier?.tier === "GROWTH"
        ? { label: "Growth", className: "bg-blue-600 text-white" }
        : tier?.tier === "STARTER"
          ? { label: "Starter", className: "bg-amber-500 text-white" }
          : null;

  const cover = business.coverImageUrl || business.logoUrl;
  const address = business.address;
  const contact = business.contact;
  const gallery = (business.media || []).filter(
    (m: any) => m.type === "IMAGE" && m.url !== business.logoUrl,
  );

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
      business.averageRating && business.totalReviews
        ? {
            "@type": "AggregateRating",
            ratingValue: business.averageRating,
            reviewCount: business.totalReviews,
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
          <div className="relative w-full aspect-[16/7] md:aspect-[16/5] bg-gray-200">
            <Image
              src={cover}
              alt={business.name}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        ) : (
          <div className="w-full aspect-[16/5] bg-gradient-to-br from-red-500 to-red-700" />
        )}

        <div className="max-w-6xl mx-auto px-6 -mt-24 md:-mt-32 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            {business.logoUrl ? (
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-white shadow-lg flex-none bg-gray-100">
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
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {business.name}
                </h1>
                {tierBadge && (
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full ${tierBadge.className} shadow-md`}
                  >
                    {tierBadge.label}
                  </span>
                )}
                {tier?.attentionBadgeEnabled && !tierBadge && (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-teal-500 text-white shadow-md">
                    Attention
                  </span>
                )}
              </div>
              {business.tagline && (
                <p className="text-gray-600 italic mb-2">{business.tagline}</p>
              )}
              {business.averageRating ? (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-amber-500">★</span>
                  <span className="font-semibold">
                    {Number(business.averageRating).toFixed(1)}
                  </span>
                  <span className="text-gray-500">
                    ({business.totalReviews ?? 0} reviews)
                  </span>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              {contact?.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm text-center hover:bg-red-700 transition"
                >
                  Call {contact.phone}
                </a>
              )}
              <a
                href="https://apps.apple.com/app/ruby-plus"
                className="px-5 py-2.5 border border-gray-300 text-gray-800 rounded-lg font-semibold text-sm text-center hover:bg-gray-50 transition"
              >
                Open in app
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8">
        {/* Left — about + gallery */}
        <div className="md:col-span-2 space-y-8">
          {business.description && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {business.description}
              </p>
            </div>
          )}

          {gallery.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {gallery.slice(0, 9).map((m: any, idx: number) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                  >
                    <Image
                      src={m.url}
                      alt={m.caption || `${business.name} photo ${idx + 1}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — contact + hours */}
        <aside className="space-y-6">
          {address && (
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                Location
              </h3>
              <div className="text-gray-800 space-y-1 text-sm">
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
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                Contact
              </h3>
              <ul className="text-sm space-y-2">
                {contact.phone && (
                  <li>
                    <span className="text-gray-500">Phone: </span>
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-red-600 font-semibold"
                    >
                      {contact.phone}
                    </a>
                  </li>
                )}
                {contact.email && (
                  <li>
                    <span className="text-gray-500">Email: </span>
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-red-600 font-semibold break-all"
                    >
                      {contact.email}
                    </a>
                  </li>
                )}
                {contact.website && (
                  <li>
                    <span className="text-gray-500">Website: </span>
                    <a
                      href={
                        contact.website.startsWith("http")
                          ? contact.website
                          : `https://${contact.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 font-semibold break-all"
                    >
                      {contact.website}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-2">
              Best on mobile
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Open Ruby+ on iOS or Android to order, book, and chat.
            </p>
            <div className="flex gap-2">
              <a
                href="https://apps.apple.com/app/ruby-plus"
                className="flex-1 px-3 py-2 bg-black text-white rounded-lg text-xs font-semibold text-center"
              >
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.rubyplus.app"
                className="flex-1 px-3 py-2 bg-black text-white rounded-lg text-xs font-semibold text-center"
              >
                Google Play
              </a>
            </div>
          </div>
        </aside>
      </section>

      <Footer />
    </main>
  );
}
