'use client';

import { useState, useEffect, useRef } from 'react';
import ScrollReveal from './ScrollReveal';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const services = [
  {
    image: 'https://picsum.photos/seed/svc1/400/260',
    title: 'Top New Wedding Vendors',
    tags: ['Events', 'Premium'],
    rating: 4.5,
    reviews: 128,
    location: 'Lagos, Nigeria',
  },
  {
    image: 'https://picsum.photos/seed/svc2/400/260',
    title: 'Family & Home in Office',
    tags: ['Home Services', 'Verified'],
    rating: 4.8,
    reviews: 86,
    location: 'Lagos, Nigeria',
  },
  {
    image: 'https://picsum.photos/seed/svc3/400/260',
    title: 'Restaurant and Bar Guide',
    tags: ['Restaurant', 'Nightlife'],
    rating: 4.3,
    reviews: 210,
    location: 'Lagos, Nigeria',
  },
  {
    image: 'https://picsum.photos/seed/svc4/400/260',
    title: 'Professional Photography',
    tags: ['Creative', 'Events'],
    rating: 4.9,
    reviews: 156,
    location: 'Lagos, Nigeria',
  },
];

const TARGET_DATE = new Date('2026-03-06T00:00:00').getTime();

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calc() {
      const now = Date.now();
      const diff = Math.max(TARGET_DATE - now, 0);
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    }
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, []);

  return timeLeft;
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

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
        <span className="font-playfair text-lg sm:text-2xl lg:text-3xl font-bold text-white">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="mt-1.5 sm:mt-2 text-[8px] sm:text-[10px] lg:text-xs text-white/60 uppercase tracking-widest font-medium">
        {label}
      </span>
    </div>
  );
}

export default function FeaturedServices() {
  const { days, hours, minutes, seconds } = useCountdown();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="relative py-12 sm:py-16 lg:py-20 bg-ruby-gray overflow-hidden" id="about">
      {/* Background content — blurred and dimmed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 blur-[2px] opacity-40 select-none pointer-events-none">
        <div className="text-center sm:text-left">
          <p className="text-xs font-semibold text-ruby-red uppercase tracking-widest mb-1">
            Discover the Best
          </p>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-ruby-black uppercase tracking-wide">
            Featured Services
          </h2>
          <div className="mt-2 w-12 h-1 bg-ruby-red rounded-full mx-auto sm:mx-0" />
        </div>

        {/* Horizontal Scrolling Cards */}
        <div className="mt-8 sm:mt-10 relative">
          <div
            ref={scrollRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {services.map((svc) => (
              <div
                key={svc.title}
                className="flex-shrink-0 w-[280px] sm:w-[320px] lg:w-[340px] bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 snap-start"
              >
                <div className="relative h-36 sm:h-44 lg:h-48 overflow-hidden">
                  <img
                    src={svc.image}
                    alt={svc.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="text-sm sm:text-base font-semibold text-ruby-black mb-2 line-clamp-1">{svc.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {svc.tags.map((t) => (
                      <span key={t} className="text-[10px] sm:text-[11px] font-medium px-2 sm:px-2.5 py-0.5 rounded-full bg-red-50 text-ruby-red">{t}</span>
                    ))}
                  </div>
                  <div className="mb-3">
                    <Stars rating={svc.rating} reviews={svc.reviews} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {svc.location}
                    </span>
                    <button className="text-[10px] sm:text-xs font-semibold px-3 sm:px-4 py-1.5 bg-ruby-red text-white rounded-full hover:bg-ruby-red/90 transition-colors">
                      Book Visit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scroll Indicators (dots) - Mobile only */}
          <div className="flex justify-center gap-1.5 mt-4 sm:hidden">
            {services.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            ))}
          </div>
        </div>

        {/* Write Review CTA */}
        <div className="mt-8 sm:mt-12 bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between p-5 sm:p-6 lg:p-8 gap-4">
          <div className="text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-bold text-ruby-black">Write a Review</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Help others find the best in town.</p>
          </div>
          <button className="w-full sm:w-auto px-6 py-2.5 bg-ruby-red text-white text-sm font-semibold rounded-lg whitespace-nowrap hover:bg-ruby-red/90 transition-colors">
            Leave a Review
          </button>
        </div>
      </div>

      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(59.68deg, #97201C -49.52%, #FD362F 182.5%)', opacity: 0.85 }}
        />

        {/* Diamond decorations - hidden on small mobile */}
        <div
          className="hidden md:block absolute left-0 bottom-0 -translate-x-[20%] translate-y-[15%] w-36 lg:w-64 h-36 lg:h-64 bg-contain bg-no-repeat bg-center brightness-[0.4]"
          style={{ backgroundImage: 'url(/images/diamond1.png)' }}
          aria-hidden="true"
        />
        <div
          className="hidden md:block absolute right-0 top-0 translate-x-[15%] -translate-y-[15%] w-28 lg:w-52 h-28 lg:h-52 bg-contain bg-no-repeat bg-center brightness-[0.4]"
          style={{ backgroundImage: 'url(/images/diamond2.png)' }}
          aria-hidden="true"
        />

        <ScrollReveal className="relative z-10 text-center w-full max-w-lg">
          <p className="text-[10px] sm:text-xs lg:text-sm font-semibold text-white/70 uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-2 sm:mb-3">
            Featured Services
          </p>
          <h2 className="font-playfair text-2xl sm:text-3xl lg:text-5xl font-bold text-white italic mb-2">
            Coming Soon
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-white/60 mb-6 sm:mb-8 lg:mb-10 max-w-sm mx-auto px-4">
            We&apos;re putting the finishing touches on something amazing. Stay tuned.
          </p>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 lg:gap-5">
            <CountdownUnit value={days} label="Days" />
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white/40 mt-[-16px] sm:mt-[-20px]">:</div>
            <CountdownUnit value={hours} label="Hours" />
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white/40 mt-[-16px] sm:mt-[-20px]">:</div>
            <CountdownUnit value={minutes} label="Min" />
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white/40 mt-[-16px] sm:mt-[-20px]">:</div>
            <CountdownUnit value={seconds} label="Sec" />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}