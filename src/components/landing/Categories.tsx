'use client';

import { useState } from 'react';
import Image from 'next/image';
import ScrollReveal from './ScrollReveal';

const categories = [
  {
    icon: '/images/concierge.png',
    title: 'Concierge Services',
    desc: 'Your wish is our command. From airport pickups, private security, event planning, last-minute reservations and verified concierge partners handle the details for you, our focus is giving you the best.',
  },
  {
    icon: '/images/restaurant.png',
    title: 'Restaurant',
    desc: 'Taste cities like never before. Discover hidden gems and trending restaurants, from national delicacies to cocktail fusion, explore the dining scene that tourists need to discover.',
  },
  {
    icon: '/images/MoonStars.png',
    title: 'Nightlife',
    desc: 'Where the city comes alive. Discover the hottest lounges, rooftop bars, clubs, cocktail spots and skip the lines with Ruby+ verified venues.',
  },
  {
    icon: '/images/health.png',
    title: 'Health & Wellness',
    desc: 'Find top spas and gyms, fitness programs and wellness services with real verified reviews and optional pricing transparency.',
  },
  {
    icon: '/images/home.png',
    title: 'Home Services',
    desc: 'Your home, but fixed. Cleaners, electricians, plumbers, painters and handymen. Reliable service near your location.',
  },
  {
    icon: '/images/shopping.png',
    title: 'Shopping',
    desc: 'Discover Trends. Deliver. From boutique fashion to local artisan treasures, explore businesses, check real reviews, and get it delivered straight to you.',
  },
  {
    icon: '/images/local.png',
    title: 'Local Services',
    desc: 'Get it done the easy way. Delivery, courier and rapid response services. Find things near you that make life seamless.',
  },
  {
    icon: '/images/Buildings.png',
    title: 'Professional Services',
    desc: 'Expertise on demand. Legal, consulting and marketing professionals — get matched with verified professionals who deliver.',
  },
  {
    icon: '/images/Crown.png',
    title: 'Arts & Entertainment',
    desc: 'Culture Connects. Live-performances, museums, festivals, galleries, and experiences that inspire and connect every visit.',
  },
  {
    icon: '/images/Suitcase.png',
    title: 'Hotel & Travel',
    desc: 'Adventures and extraordinary experiences await. Let Ruby+ find your next trip, adventure or resort. A travel guide at your fingertips.',
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