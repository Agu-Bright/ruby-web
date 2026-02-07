'use client';

import { useState, useEffect } from 'react';
import ScrollReveal from './ScrollReveal';

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
];

// Target: 28 days from Feb 6, 2026 = March 6, 2026
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
          className={`w-4 h-4 ${s <= Math.round(rating) ? 'star-filled' : 'star-empty'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1.5 text-xs text-gray-500">({reviews})</span>
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
        <span className="font-playfair text-2xl sm:text-3xl font-bold text-white">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="mt-2 text-[10px] sm:text-xs text-white/60 uppercase tracking-widest font-medium">
        {label}
      </span>
    </div>
  );
}

export default function FeaturedServices() {
  const { days, hours, minutes, seconds } = useCountdown();

  return (
    <section className="relative py-16 sm:py-20 bg-ruby-gray overflow-hidden" id="about">
      {/* Background content — blurred and dimmed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 blur-[2px] opacity-40 select-none pointer-events-none">
        <div>
          <p className="text-xs font-semibold text-ruby-red uppercase tracking-widest mb-1">
            Discover the Best
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-ruby-black uppercase tracking-wide">
            Featured Services
          </h2>
          <div className="mt-2 w-12 h-1 bg-ruby-red rounded-full" />
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc) => (
            <div key={svc.title} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={svc.image}
                  alt={svc.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="text-base font-semibold text-ruby-black mb-2">{svc.title}</h3>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {svc.tags.map((t) => (
                    <span key={t} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-ruby-red">{t}</span>
                  ))}
                </div>
                <div className="mb-3">
                  <Stars rating={svc.rating} reviews={svc.reviews} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                    {svc.location}
                  </span>
                  <button className="text-xs font-semibold px-4 py-1.5 bg-ruby-red text-white rounded-full">Book Visit</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between p-6 sm:p-8 gap-4">
          <div>
            <h3 className="text-lg font-bold text-ruby-black">Write a Review</h3>
            <p className="text-sm text-gray-500 mt-0.5">Help others find the best in town.</p>
          </div>
          <button className="px-6 py-2.5 bg-ruby-red text-white text-sm font-semibold rounded-lg whitespace-nowrap">Leave a Review</button>
        </div>
      </div>

      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(59.68deg, #97201C -49.52%, #FD362F 182.5%)', opacity: 0.85 }}
        />

        {/* Diamond decorations */}
        <div
          className="hidden sm:block absolute left-0 bottom-0 -translate-x-[20%] translate-y-[15%] w-36 sm:w-48 lg:w-64 h-36 sm:h-48 lg:h-64 bg-contain bg-no-repeat bg-center brightness-[0.4]"
          style={{ backgroundImage: 'url(/images/diamond1.png)' }}
          aria-hidden="true"
        />
        <div
          className="hidden sm:block absolute right-0 top-0 translate-x-[15%] -translate-y-[15%] w-28 sm:w-40 lg:w-52 h-28 sm:h-40 lg:h-52 bg-contain bg-no-repeat bg-center brightness-[0.4]"
          style={{ backgroundImage: 'url(/images/diamond2.png)' }}
          aria-hidden="true"
        />

        <ScrollReveal className="relative z-10 text-center px-4">
          <p className="text-xs sm:text-sm font-semibold text-white/70 uppercase tracking-[0.2em] mb-3">
            Featured Services
          </p>
          <h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-white italic mb-2">
            Coming Soon
          </h2>
          <p className="text-sm sm:text-base text-white/60 mb-10 max-w-md mx-auto">
            We&apos;re putting the finishing touches on something amazing. Stay tuned.
          </p>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <CountdownUnit value={days} label="Days" />
            <div className="text-2xl font-bold text-white/40 mt-[-20px]">:</div>
            <CountdownUnit value={hours} label="Hours" />
            <div className="text-2xl font-bold text-white/40 mt-[-20px]">:</div>
            <CountdownUnit value={minutes} label="Minutes" />
            <div className="text-2xl font-bold text-white/40 mt-[-20px]">:</div>
            <CountdownUnit value={seconds} label="Seconds" />
          </div>

          {/* Notify CTA */}
          {/* <div className="mt-10 flex items-stretch justify-center max-w-sm mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 text-sm bg-white/10 backdrop-blur-sm border border-white/20 rounded-l-xl text-white placeholder-white/40 outline-none focus:border-white/40 transition-colors"
            />
            <button className="btn-ruby px-6 py-3 bg-white text-ruby-red text-sm font-semibold rounded-r-xl hover:bg-white/90 transition-colors whitespace-nowrap">
              Notify Me
            </button>
          </div> */}
        </ScrollReveal>
      </div>
    </section>
  );
}