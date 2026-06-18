import ScrollReveal from "../landing/ScrollReveal";

/**
 * Full-bleed final CTA section. Black background with ruby-red accents
 * to give the page a strong visual close before the footer.
 *
 * P107 — Primary "Register your business" CTA removed. Merchant onboarding
 * now flows through the mobile apps, so the App Store + Google Play badges
 * (App Store ID 6760118324 / Play package com.rubyplus.business) are the
 * only entry point on the landing.
 */
export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-black py-20 sm:py-24 lg:py-28">
      {/* Ambient glow circles — subtle, brand-coloured */}
      <div
        className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-ruby-red/20 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-40 -right-32 w-96 h-96 rounded-full bg-ruby-red/15 blur-[140px]"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-[1.16] tracking-[-0.04em]">
              <span className="text-ruby-red font-bold italic">
                Start in minutes.
              </span>
              <span className="text-white"> Get paid daily.</span>
            </h2>

            <p className="mt-5 text-base sm:text-lg text-white/70 leading-relaxed max-w-xl mx-auto">
              Join thousands of Nigerian businesses already running on Ruby+.
              No setup fees. No monthly fees. Just growth.
            </p>

            {/* P107 — "Register your business" CTA removed. The App Store +
                Google Play badges below are the primary entry point now. */}

            {/* App badges — Business app, live on both stores. */}
            <div className="mt-8 sm:mt-10">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-4">
                Get the app
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="https://apps.apple.com/app/ruby-business/id6760118324"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Get Ruby+ Business app on the App Store"
                  className="flex items-center gap-2.5 px-5 py-2.5 bg-white/5 border border-white/15 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[9px] text-white/60 leading-none">
                      Download on the
                    </div>
                    <div className="text-sm font-semibold text-white leading-tight">
                      App Store
                    </div>
                  </div>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.rubyplus.business"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Get Ruby+ Business app on Google Play"
                  className="flex items-center gap-2.5 px-5 py-2.5 bg-white/5 border border-white/15 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 01-.609-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.4 13.195l2.298-3.687zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[9px] text-white/60 leading-none">
                      Get it on
                    </div>
                    <div className="text-sm font-semibold text-white leading-tight">
                      Google Play
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
