import Image from "next/image";
import ScrollReveal from "../landing/ScrollReveal";

/**
 * Visual breadth statement — Ruby+ isn't just for restaurants.
 * 10 tiles, each just icon + name, no body text or CTAs. The point is
 * "if your business fits one of these, we want you".
 *
 * Icons reuse the same files the consumer Categories component pulls
 * from `/public/images/`, so the iconography reads identically across
 * both pages.
 */
const categories = [
  { icon: "/images/concierge.png", name: "Concierge" },
  { icon: "/images/restaurant.png", name: "Restaurants" },
  { icon: "/images/MoonStars.png", name: "Nightlife" },
  { icon: "/images/health.png", name: "Health & Wellness" },
  { icon: "/images/home.png", name: "Home Services" },
  { icon: "/images/shopping.png", name: "Shopping" },
  { icon: "/images/local.png", name: "Local Services" },
  { icon: "/images/Buildings.png", name: "Professional" },
  { icon: "/images/Crown.png", name: "Arts & Entertainment" },
  { icon: "/images/Suitcase.png", name: "Hotels & Travel" },
];

export default function CategoriesSupported() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-ruby-black tracking-wide uppercase">
              Built for every kind of business
            </h2>
            <div className="mt-2 w-12 h-1 bg-ruby-red mx-auto rounded-full" />
            <p className="mt-4 text-sm sm:text-base text-gray-500 max-w-xl mx-auto">
              Whatever you sell, whatever you serve — there's a place for you.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {categories.map((c, i) => (
            <ScrollReveal key={c.name} delay={Math.min(i + 1, 10)}>
              <div className="flex flex-col items-center justify-center gap-3 bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 group hover:border-ruby-red/30 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-ruby-red transition-colors duration-300 overflow-hidden">
                  <Image
                    src={c.icon}
                    alt={c.name}
                    width={28}
                    height={28}
                    className="w-6 h-6 sm:w-7 sm:h-7 object-contain group-hover:brightness-0 group-hover:invert transition-all duration-300"
                  />
                </div>
                <span className="text-xs sm:text-sm font-medium text-ruby-black text-center leading-tight">
                  {c.name}
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
