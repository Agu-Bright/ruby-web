'use client';

import { useRef } from 'react';
import Image from 'next/image';
import ScrollReveal from './ScrollReveal';

const features = [
  {
    icon: '/images/ruby.png',
    title: 'Verified Businesses',
    desc: 'Every restaurant, hotel, club, and service is thoroughly verified to ensure quality and authenticity.',
    points: [
      'Background checks for all merchants',
      'Customer reviews and ratings',
      'Regular quality assessments',
    ],
  },
  {
    icon: '/images/payment.png',
    title: 'Seamless Payments',
    desc: 'Pay with your international cards while merchants receive payments in their local accounts.',
    points: [
      'No currency conversion needed',
      'Secure, encrypted transactions',
      'Instant payment confirmations',
    ],
  },
  {
    icon: '/images/ruby.png',
    title: 'Local Expertise',
    desc: 'Discover hidden gems and local favorites curated by people who know the city best.',
    points: [
      'Curated recommendations',
      'Insider tips and guides',
      'Authentic local experiences',
    ],
  },
  {
    icon: '/images/payment.png',
    title: '24/7 Support',
    desc: 'Our dedicated support team is always ready to help you with any questions or concerns.',
    points: [
      'Round-the-clock assistance',
      'Multi-language support',
      'Quick response times',
    ],
  },
];

export default function WhyChoose() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <ScrollReveal>
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="font-playfair text-xl sm:text-2xl lg:text-3xl font-bold text-ruby-black uppercase" style={{ fontVariant: 'small-caps' }}>
              Why Choose Ruby+?
            </h2>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm lg:text-base text-gray-500 max-w-md mx-auto leading-relaxed">
              The most comprehensive platform for discovering and experiencing Nigerian culture
            </p>
          </div>
        </ScrollReveal>

        {/* Horizontal Scrolling Cards - Mobile & Tablet */}
        <div className="lg:hidden">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {features.map((feat, i) => (
              <ScrollReveal key={feat.title} delay={i + 1}>
                <div className="flex-shrink-0 w-[300px] sm:w-[340px] snap-start">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-5 sm:p-6 h-full">
                    {/* Icon */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                      <Image
                        src={feat.icon}
                        alt={feat.title}
                        width={32}
                        height={32}
                        className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
                      />
                    </div>

                    {/* Content */}
                    <h3 className="text-sm sm:text-base font-bold text-ruby-black mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed mb-4">
                      {feat.desc}
                    </p>

                    <ul className="space-y-2">
                      {feat.points.map((point) => (
                        <li key={point} className="flex items-start gap-2">
                          <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-red-50 border border-ruby-red/30 flex items-center justify-center">
                            <svg className="w-2 h-2 text-ruby-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          <span className="text-[11px] sm:text-xs text-gray-600">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Scroll Indicator Dots - Mobile */}
          <div className="flex justify-center gap-1.5 mt-4 sm:hidden">
            {features.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            ))}
          </div>
        </div>

        {/* Grid Layout - Desktop */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-6 xl:gap-8">
          {features.slice(0, 2).map((feat, i) => (
            <ScrollReveal key={feat.title} delay={i + 1}>
              <div className="flex items-stretch gap-5 xl:gap-6">
                {/* Icon Box */}
                <div className="shrink-0 w-[160px] xl:w-[180px] h-[180px] xl:h-[200px] rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.08)] flex items-center justify-center">
                  <Image
                    src={feat.icon}
                    alt={feat.title}
                    width={72}
                    height={72}
                    className="w-16 xl:w-[72px] h-16 xl:h-[72px] object-contain"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center py-2">
                  <h3 className="text-base xl:text-lg font-bold text-ruby-black mb-1.5">
                    {feat.title}
                  </h3>
                  <p className="text-xs xl:text-sm text-gray-500 leading-relaxed mb-4">
                    {feat.desc}
                  </p>

                  <ul className="space-y-2">
                    {feat.points.map((point) => (
                      <li key={point} className="flex items-center gap-2.5">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-red-50 border border-ruby-red/30 flex items-center justify-center">
                          <svg className="w-2 h-2 text-ruby-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="text-xs xl:text-sm text-gray-600">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}