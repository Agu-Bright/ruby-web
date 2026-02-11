"use client";

import ScrollReveal from "./ScrollReveal";

export default function RedStrip() {
  return (
    <section className="relative">
      {/* Search Bar — floating on top, overlapping hero and red */}
      <div className="absolute top-0 left-0 right-0 z-30 -translate-y-1/2">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile: stacked card layout */}
          <div className="sm:hidden bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.10)] p-4 space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <svg
                className="w-5 h-5 text-gray-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="What do you want to do?"
                className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <svg
                className="w-5 h-5 text-gray-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Where do you wanna go?"
                className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
              />
            </div>
            <button className="btn-ruby w-full flex items-center justify-center gap-2 bg-ruby-red hover:bg-red-500 text-white font-semibold text-sm px-7 py-3.5 rounded-xl">
              Search
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>

          {/* Desktop: horizontal pill layout */}
          <div className="hidden sm:flex items-stretch bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.10)] overflow-hidden p-2">
            <div className="flex-1 flex items-center gap-3 px-5 py-3.5 border-r border-gray-200">
              <svg
                className="w-5 h-5 text-gray-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="What do you want to do?"
                className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
              />
            </div>
            <div className="flex-1 flex items-center gap-3 px-5 py-3.5">
              <svg
                className="w-5 h-5 text-gray-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Where do you wanna go?"
                className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
              />
            </div>
            <button className="btn-ruby flex items-center gap-2 bg-ruby-red hover:bg-red-500 text-white font-semibold text-sm px-7 py-3.5 rounded-xl shrink-0">
              Search
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Red Background */}
      <div
        className="relative overflow-hidden pt-36 sm:pt-20 pb-12 sm:pb-12"
        style={{
          background:
            "linear-gradient(59.68deg, #97201C -49.52%, #FD362F 182.5%)",
        }}
      >
        {/* Diamond 1 — left, smaller, shifted down */}
        <div
          className="hidden sm:block absolute left-0 bottom-0 -translate-x-[15%] translate-y-[10%] w-28 sm:w-36 lg:w-48 h-28 sm:h-36 lg:h-48 bg-contain bg-no-repeat bg-center brightness-[0.4]"
          style={{ backgroundImage: "url(/images/diamond1.png)" }}
          aria-hidden="true"
        />

        {/* Diamond 2 — right, bigger */}
        <div
          className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-[5%] w-44 sm:w-60 lg:w-80 h-44 sm:h-60 lg:h-80 bg-contain bg-no-repeat bg-center brightness-[0.4]"
          style={{ backgroundImage: "url(/images/diamond2.png)" }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="font-playfair text-xl sm:text-2xl lg:text-3xl font-bold text-white italic leading-snug">
              “A Discovery & Connection Point For Tourists, Local Residents,
              Diasporas And Local Businesses”
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-white/60 tracking-wide">
              Experience Nigeria Like Never Before
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
