import Image from "next/image";
import ScrollReveal from "./ScrollReveal";

const features = [
  {
    icon: "/images/discover.png",
    title: "Discover and Navigate",
    desc: "Browse verified restaurants, clubs, hotels, events, and services. Get directions and book rides with one tap.",
  },
  {
    icon: "/images/pay.png",
    title: "Pay with Ease",
    desc: "Use Apple Pay or your foreign debit/credit cards to make payments directly from the app. No currency exchange hassles, no local bank account needed.",
  },
  {
    icon: "/images/fast.png",
    title: "Feel Confident Anywhere",
    desc: "From everyday hangouts to new experiences, Patrons helps you navigate safely and confidently, whether you're a local or just passing through.",
  },
];

export default function ForPatrons() {
  return (
    <section
      className="relative py-16 sm:py-20 bg-white overflow-hidden"
      id="patrons"
    >
      {/* Background map — bottom left */}
      <div
        className="absolute left-0 bottom-0 w-[300px] sm:w-[400px] lg:w-[500px] h-[300px] sm:h-[400px] lg:h-[500px] bg-contain bg-no-repeat bg-left-bottom"
        style={{ backgroundImage: "url(/images/map.png)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Content */}
          <div className="flex-1 max-w-lg">
            <ScrollReveal>
              <p className="font-playfair text-sm sm:text-base text-ruby-red italic mb-2">
                Explore More Of What&apos;s Around You
              </p>
              <h2
                className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-ruby-black uppercase leading-tight mb-4"
                style={{ fontVariant: "small-caps" }}
              >
                For Patrons
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-8">
                Whether You&apos;re Discovering Your City Or Visiting Somewhere
                New, Patrons Helps You Find Trusted Places, Services, And
                Experiences—Without The Guesswork.
              </p>
            </ScrollReveal>

            {/* Features */}
            <div className="space-y-6">
              {features.map((feat, i) => (
                <ScrollReveal key={feat.title} delay={i + 1}>
                  <div className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 flex items-start justify-center pt-0.5">
                      <Image
                        src={feat.icon}
                        alt={feat.title}
                        width={32}
                        height={32}
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-ruby-black mb-1">
                        {feat.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* CTA */}
            <ScrollReveal delay={4}>
              <button className="btn-ruby mt-8 inline-flex items-center gap-2 px-8 py-3 bg-ruby-red text-white text-sm font-semibold rounded-lg uppercase tracking-wide">
                Get Started
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </button>
            </ScrollReveal>
          </div>

          {/* Right — Patron Image */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <ScrollReveal delay={2}>
              <div className="relative w-[320px] sm:w-[400px] lg:w-[460px]">
                <Image
                  src="/images/patron.png"
                  alt="Patrons enjoying Nigerian businesses"
                  width={460}
                  height={520}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
