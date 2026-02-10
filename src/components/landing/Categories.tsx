'use client';

import { useState } from 'react';
import Image from 'next/image';
import ScrollReveal from './ScrollReveal';

const categories = [
  {
    icon: '/images/concierge.png',
    title: 'Concierge Services',
    desc: 'Your wish is our command. From airport pickups, private security to special requests and last-minute reservations, our verified concierge partners handle the details so you can focus on living your best life.',
  },
  {
    icon: '/images/restaurant.png',
    title: 'Restaurants',
    desc: 'Taste cities like never before. Discover hidden gems and iconic spots serving everything from authentic suya to world-class fine dining. Your next favorite meal is waiting.',
  },
  {
    icon: '/images/MoonStars.png',
    title: 'Nightlife',
    desc: 'Where the city comes alive. Rooftop lounges, pulsing clubs, beach bars—find the hottest spots and skip the velvet rope with Ruby+ verified venues.',
  },
  {
    icon: '/images/health.png',
    title: 'Health & Wellness',
    desc: "Glow up, inside and out. Spas, gyms, salons, and wellness retreats—all vetted, all premium. Because self-care isn't optional, it's essential.",
  },
  {
    icon: '/images/home.png',
    title: 'Home Services',
    desc: 'Your home, handled. Cleaners, electricians, plumbers, and more—trusted professionals at your fingertips. Reliable service, zero stress.',
  },
  {
    icon: '/images/shopping.png',
    title: 'Shopping',
    desc: 'Discover. Desire. Deliver. From boutique fashion to local artisan finds, shop verified merchants and get it delivered straight to your doorstep.',
  },
  {
    icon: '/images/local.png',
    title: 'Local Services',
    desc: 'Get it done, the easy way. Tailors, laundry, car wash, repairs—whatever you need, whenever you need it. City life, simplified.',
  },
  {
    icon: '/images/Buildings.png',
    title: 'Professional Services',
    desc: 'Expertise on demand. Legal, financial, consulting—connect with verified professionals who get things done right the first time.',
  },
  {
    icon: '/images/Crown.png',
    title: 'Arts & Entertainment',
    desc: 'Culture. Concerts. Unforgettable moments. Galleries, live shows, festivals, and experiences that feed your soul. Never miss what\'s happening.',
  },
  {
    icon: '/images/Suitcase.png',
    title: 'Hotels & Travel',
    desc: 'Stay somewhere extraordinary. From luxury hotels to stunning shortlets, find your perfect stay—verified, reviewed, and ready for you.',
  },
];

export default function Categories() {
  const [showAll, setShowAll] = useState(false);

  // Desktop: 2 rows × 3 cols = 6, Mobile: 3 rows × 2 cols = 6
  const visibleCount = 6;
  const visible = showAll ? categories : categories.slice(0, visibleCount);
  const hasMore = categories.length > visibleCount;

  return (
    <section className="py-16 sm:py-20 bg-white" id="discoveries">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-ruby-black tracking-wide uppercase">
              Categories
            </h2>
            <div className="mt-2 w-12 h-1 bg-ruby-red mx-auto rounded-full" />
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {visible.map((cat, i) => (
            <ScrollReveal key={cat.title} delay={Math.min(i + 1, 10)}>
              <div className="card-hover bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 cursor-pointer group shadow-sm h-full">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-50 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-ruby-red transition-colors duration-300 overflow-hidden">
                  <Image
                    src={cat.icon}
                    alt={cat.title}
                    width={24}
                    height={24}
                    className="w-5 h-5 sm:w-6 sm:h-6 object-contain group-hover:brightness-0 group-hover:invert transition-all duration-300"
                  />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-ruby-black mb-1 sm:mb-2">
                  {cat.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed line-clamp-3">
                  {cat.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* See More / See Less */}
        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={() => setShowAll(!showAll)}
              className="btn-ruby inline-flex items-center gap-2 px-8 py-3 bg-ruby-red text-white text-sm font-semibold rounded-lg"
            >
              {showAll ? 'See Less' : 'See More'}
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}