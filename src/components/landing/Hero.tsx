'use client';

import { useState, useEffect, useCallback } from 'react';

const slides = [
  {
    image: '/images/hero.png',
    heading: (
      <>
        <span className="block font-bold text-ruby-red drop-shadow-lg">
          Ruby+,
        </span>
        <span className="block font-semibold text-white drop-shadow-lg mt-1">
          Connecting the World
        </span>
        <span className="block font-semibold text-white drop-shadow-lg mt-1">
          to Verified Nigerian Businesses
        </span>
      </>
    ),
    description:
      'Ruby helps users discover trusted Nigerian brands, products, and services — and enables businesses to reach a global audience, get discovered, and receive seamless payments.',
  },
  {
    image: '/images/hero2.png',
    heading: (
      <>
        <span className="block font-bold text-ruby-red drop-shadow-lg">
          Discover Culture,
        </span>
        <span className="block font-semibold text-white drop-shadow-lg mt-1">
          Patronize Brands,
        </span>
        <span className="block font-semibold text-white drop-shadow-lg mt-1">
          Pay{' '}
          <span className="text-ruby-red font-bold">Seamlessly.</span>
        </span>
      </>
    ),
    description:
      "Explore Nigeria's vibrant culture, connect with verified businesses, and make secure payments — all within the Ruby app.",
  },
  {
    image: '/images/hero3.png',
    heading: (
      <>
        <span className="block font-semibold text-white drop-shadow-lg">
          Become Our Partner, Grow Your
        </span>
        <span className="block font-semibold text-white drop-shadow-lg mt-1">
          Business{' '}
          <span className="text-ruby-red font-bold">Beyond Borders.</span>
        </span>
      </>
    ),
    description:
      "Expand your reach to millions of potential customers, showcase your brand, and accept payments through Ruby's verified platform.",
  },
];

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning || index === current) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 700);
    },
    [current, isTransitioning]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      goToSlide((current + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [current, goToSlide]);

  return (
    <section className="relative pt-16">
      <div className="relative h-[580px] sm:h-[640px] lg:h-[680px] overflow-hidden">
        {/* Background images */}
        {slides.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out"
            style={{
              backgroundImage: `url(${slide.image})`,
              opacity: i === current ? 1 : 0,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />

        {/* Slide content */}
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 z-10 flex items-center transition-all duration-700 ease-in-out ${
              i === current
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pr-12 sm:pr-20 lg:pr-24">
              <h1
                className="max-w-4xl text-3xl sm:text-5xl lg:text-6xl"
                style={{ letterSpacing: '-0.04em', lineHeight: '1.16' }}
              >
                {slide.heading}
              </h1>

              <p className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg text-gray-200/90 max-w-3xl leading-relaxed font-medium">
                {slide.description}
              </p>

              {/* App Store Badges */}
              <div className="flex items-center gap-2 sm:gap-3 mt-6 sm:mt-8">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 sm:gap-2.5 bg-black hover:bg-black/80 text-white pl-2.5 sm:pl-3 pr-4 sm:pr-5 py-2 sm:py-2.5 rounded-lg border border-gray-600/50 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[8px] sm:text-[9px] leading-none uppercase tracking-wider opacity-70">
                      Coming Soon on
                    </div>
                    <div className="text-xs sm:text-sm font-semibold leading-tight mt-0.5">
                      App Store
                    </div>
                  </div>
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 sm:gap-2.5 bg-black hover:bg-black/80 text-white pl-2.5 sm:pl-3 pr-4 sm:pr-5 py-2 sm:py-2.5 rounded-lg border border-gray-600/50 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[8px] sm:text-[9px] leading-none uppercase tracking-wider opacity-70">
                      Coming Soon on
                    </div>
                    <div className="text-xs sm:text-sm font-semibold leading-tight mt-0.5">
                      Google Play
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        ))}

        {/* Vertical dot navigation — right side */}
        <div className="absolute right-3 sm:right-8 lg:right-14 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-3 sm:gap-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="group relative flex items-center justify-center w-5 h-5"
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-3 h-3 bg-ruby-red shadow-[0_0_8px_rgba(253,54,47,0.5)]'
                    : 'w-2.5 h-2.5 bg-white/50 group-hover:bg-white/80'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
