"use client";

import { useState, useEffect, useRef } from "react";
import ScrollReveal from "./ScrollReveal";
import { ChevronLeft, ChevronRight } from "lucide-react";

const articles = [
  {
    image: "https://picsum.photos/seed/explore1/400/260",
    title: "10 Must-Visit Destinations for Your Next Adventure to the Northern Europe",
    author: "Naya Kline",
    time: "12 hours ago",
    likes: 187,
    comments: 34,
  },
  {
    image: "https://picsum.photos/seed/explore2/400/260",
    title: "Top destinations in the U.S that should be on every traveler's bucket list",
    author: "Tony Frye",
    time: "2 days ago",
    likes: 187,
    comments: 34,
  },
  {
    image: "https://picsum.photos/seed/explore3/400/260",
    title: "The Ultimate Packing Guide: Packing Essentials for your Stress-Free Travels",
    author: "Eric Knapp",
    time: "3 days ago",
    likes: 187,
    comments: 34,
  },
  {
    image: "https://picsum.photos/seed/explore4/400/260",
    title: "Hidden Gems: Discover Africa's Best Kept Secrets for Adventurous Travelers",
    author: "Amara Obi",
    time: "5 days ago",
    likes: 142,
    comments: 28,
  },
  {
    image: "https://picsum.photos/seed/explore5/400/260",
    title: "How to Travel Nigeria Like a Local: Insider Tips and Cultural Etiquette",
    author: "Chidi Eze",
    time: "1 week ago",
    likes: 203,
    comments: 41,
  },
];

const TARGET_DATE = new Date("2026-03-06T00:00:00Z").getTime();

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

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
        <span className="font-playfair text-base sm:text-xl lg:text-2xl font-bold text-white">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="mt-1 sm:mt-1.5 text-[7px] sm:text-[9px] lg:text-[10px] text-white/60 uppercase tracking-widest font-medium">
        {label}
      </span>
    </div>
  );
}

export default function ExploreRuby() {
  const { days, hours, minutes, seconds } = useCountdown();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          {/* Outer wrapper */}
          <div className="relative">
            {/* String decorations - hidden on mobile */}
            <div
              className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[50%] w-24 xl:w-32 h-56 xl:h-64 bg-contain bg-no-repeat bg-center -scale-x-100 z-20"
              style={{ backgroundImage: "url(/images/string1.png)" }}
              aria-hidden="true"
            />
            <div
              className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-[50%] w-24 xl:w-32 h-56 xl:h-64 bg-contain bg-no-repeat bg-center z-20"
              style={{ backgroundImage: "url(/images/string2.png)" }}
              aria-hidden="true"
            />

            {/* Red container */}
            <div
              className="relative rounded-2xl sm:rounded-[2rem] lg:rounded-[3rem] overflow-hidden px-4 sm:px-8 lg:px-16 py-10 sm:py-12 lg:py-16"
              style={{
                background: "linear-gradient(59.68deg, #97201C -49.52%, #FD362F 182.5%)",
              }}
            >
              {/* Background content — blurred and dimmed */}
              <div className="blur-[2px] opacity-30 select-none pointer-events-none">
                <div className="text-center mb-6 sm:mb-10">
                  <h2
                    className="font-playfair text-xl sm:text-2xl lg:text-4xl font-bold text-white uppercase"
                    style={{ fontVariant: "small-caps" }}
                  >
                    Explore Ruby+
                  </h2>
                  <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs lg:text-sm text-white/60 max-w-xl mx-auto leading-relaxed px-4">
                    Our blog is a trove of travel wisdom, filled with tips, news, and stories to inspire your next expedition.
                  </p>
                </div>

                {/* Horizontal Scrolling Cards */}
                <div
                  ref={scrollRef}
                  className="flex gap-3 sm:gap-4 lg:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {articles.map((article) => (
                    <div
                      key={article.title}
                      className="flex-shrink-0 w-[240px] sm:w-[280px] lg:w-[300px] bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-lg snap-start"
                    >
                      <div className="rounded-lg sm:rounded-xl overflow-hidden mb-3 sm:mb-4">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="w-full h-32 sm:h-36 lg:h-44 object-cover"
                        />
                      </div>
                      <div className="px-0.5 sm:px-1 pb-1">
                        <h3 className="text-xs sm:text-sm font-bold text-ruby-black leading-snug mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-3">
                          {article.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] sm:text-xs font-semibold text-ruby-black">
                              {article.author}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-gray-400">
                              {article.time}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-0.5 sm:gap-1">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-ruby-red" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                              <span className="text-[9px] sm:text-[11px] text-gray-500 font-medium">
                                {article.likes}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 sm:gap-1">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                              </svg>
                              <span className="text-[9px] sm:text-[11px] text-gray-500 font-medium">
                                {article.comments}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Scroll dots - Mobile */}
                <div className="flex justify-center gap-1.5 mt-2 sm:hidden">
                  {articles.slice(0, 4).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  ))}
                </div>
              </div>

              {/* Coming Soon Overlay */}
              <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
                <div className="text-center w-full max-w-md">
                  <p className="text-[10px] sm:text-xs lg:text-sm font-semibold text-white/70 uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-2 sm:mb-3">
                    Explore Ruby+
                  </p>
                  <h2 className="font-playfair text-2xl sm:text-3xl lg:text-5xl font-bold text-white italic mb-2">
                    Coming Soon
                  </h2>
                  <p className="text-[11px] sm:text-sm lg:text-base text-white/50 mb-6 sm:mb-8 max-w-sm mx-auto">
                    Stories, tips, and guides to fuel your next adventure.
                  </p>

                  {/* Countdown */}
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 lg:gap-4">
                    <CountdownUnit value={days} label="Days" />
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-white/30 mt-[-12px] sm:mt-[-16px]">:</div>
                    <CountdownUnit value={hours} label="Hours" />
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-white/30 mt-[-12px] sm:mt-[-16px]">:</div>
                    <CountdownUnit value={minutes} label="Min" />
                    <div className="text-base sm:text-lg lg:text-xl font-bold text-white/30 mt-[-12px] sm:mt-[-16px]">:</div>
                    <CountdownUnit value={seconds} label="Sec" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}