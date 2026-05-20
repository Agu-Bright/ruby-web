import ScrollReveal from "../landing/ScrollReveal";
import { Quote } from "lucide-react";

/**
 * 3 merchant quotes with placeholder avatars + business names. The
 * consumer landing's Testimonials component is patron-shaped — these
 * are merchant-shaped (talking about orders, payouts, growth).
 *
 * TODO: replace with real merchant quotes once collected. Names,
 * businesses, and avatars are illustrative until then. Avatar URLs
 * use Pravatar (deterministic Unsplash mirror) so they render reliably
 * without us hosting placeholder images.
 */
const quotes = [
  {
    quote:
      "I used to spend Saturdays chasing customers for payment. With Ruby+, the money lands in my account before I've finished cleaning the grill.",
    name: "Tunde A.",
    business: "Mama T's Kitchen · Lekki",
    avatar: "https://i.pravatar.cc/120?img=12",
  },
  {
    quote:
      "Three branches, one app. I see exactly what's selling in VI vs Ikoyi without juggling spreadsheets. Honestly the multi-branch view is what sold me.",
    name: "Bisi O.",
    business: "Glow Beauty Bar · 3 locations",
    avatar: "https://i.pravatar.cc/120?img=49",
  },
  {
    quote:
      "Signed up in the morning, took my first booking by lunch. The CAC verification was the only step I had to plan around — everything else just worked.",
    name: "Chukwuma E.",
    business: "Crystal Suites · Abuja",
    avatar: "https://i.pravatar.cc/120?img=33",
  },
];

export default function MerchantTestimonials() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-ruby-black tracking-wide uppercase">
              What our merchants say
            </h2>
            <div className="mt-2 w-12 h-1 bg-ruby-red mx-auto rounded-full" />
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {quotes.map((q, i) => (
            <ScrollReveal key={q.name} delay={i + 1}>
              <article className="relative h-full bg-white border border-gray-100 rounded-2xl p-7 sm:p-8 transition-shadow duration-300 hover:shadow-lg">
                {/* Soft quote-mark watermark in the corner */}
                <Quote
                  className="absolute top-4 right-4 w-10 h-10 text-ruby-red/10"
                  strokeWidth={1.5}
                />

                <p className="text-sm sm:text-base text-gray-700 leading-relaxed italic relative z-10">
                  &ldquo;{q.quote}&rdquo;
                </p>

                <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={q.avatar}
                    alt={q.name}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ruby-black truncate">
                      {q.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {q.business}
                    </div>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
