'use client';

import ScrollReveal from './ScrollReveal';

export default function Hero() {
  return (
    <section className="relative pt-16">
      {/* Hero Image Background */}
      <div className="relative min-h-[580px] sm:min-h-[640px] lg:min-h-[680px] flex flex-col justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/hero.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 pb-32 sm:pb-36 lg:pb-40">
          <ScrollReveal>
            <h1 className="max-w-4xl" style={{ letterSpacing: '-0.04em' }}>
              <span
                className="block font-bold text-ruby-red drop-shadow-lg text-4xl sm:text-5xl lg:text-6xl"
                style={{ lineHeight: '1.16' }}
              >
                Ruby+,
              </span>
              <span
                className="block font-semibold text-white drop-shadow-lg mt-1 text-4xl sm:text-5xl lg:text-6xl"
                style={{ lineHeight: '1.16' }}
              >
                Connecting the World
              </span>
              <span
                className="block font-semibold text-white drop-shadow-lg mt-1 text-4xl sm:text-5xl lg:text-6xl"
                style={{ lineHeight: '1.16' }}
              >
                to Verified Nigerian Businesses
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={1}>
            <p className="mt-6 text-base sm:text-lg text-gray-200/90 max-w-3xl leading-relaxed font-medium">
              Ruby helps users discover trusted Nigerian brands, products, and
              services — and enables businesses to reach a global audience, get
              discovered, and receive seamless payments.
            </p>
          </ScrollReveal>

          {/* App Store Badges */}
          <ScrollReveal delay={2}>
            <div className="flex items-center gap-3 mt-8">
              <a href="#" className="inline-flex items-center gap-2.5 bg-black hover:bg-black/80 text-white pl-3 pr-5 py-2.5 rounded-lg border border-gray-600/50 transition-all duration-200 hover:-translate-y-0.5">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>
                <div className="text-left">
                  <div className="text-[9px] leading-none uppercase tracking-wider opacity-70">Coming Soon on</div>
                  <div className="text-sm font-semibold leading-tight mt-0.5">App Store</div>
                </div>
              </a>
              <a href="#" className="inline-flex items-center gap-2.5 bg-black hover:bg-black/80 text-white pl-3 pr-5 py-2.5 rounded-lg border border-gray-600/50 transition-all duration-200 hover:-translate-y-0.5">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z"/></svg>
                <div className="text-left">
                  <div className="text-[9px] leading-none uppercase tracking-wider opacity-70">Coming Soon on</div>
                  <div className="text-sm font-semibold leading-tight mt-0.5">Google Play</div>
                </div>
              </a>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}