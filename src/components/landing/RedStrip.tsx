'use client';

import { useEffect, useRef, useState } from 'react';
import ScrollReveal from './ScrollReveal';
import { useSelectedLocation } from '@/lib/selected-location';

// P128-LAND — Floating location picker on the red strip below the hero.
// Replaces the previous "What do you want to do?" + "Where do you wanna
// go?" + Search bar (which never actually searched anything) with a
// single, functional city picker. The picker reads + writes the shared
// SelectedLocationProvider context so changing the city here also
// re-scopes Featured Services + Explore Ruby+ below.
export default function RedStrip() {
  const { selectedLocation, setSelectedLocation, allLocations, loading } =
    useSelectedLocation();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click-outside closes the dropdown
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const buttonLabel = selectedLocation?.name || (loading ? 'Loading…' : 'Pick a city');

  return (
    <section className="relative">
      {/* Floating location picker — overlaps hero and red strip */}
      <div className="absolute top-0 left-0 right-0 z-30 -translate-y-1/2">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={wrapRef}
            className="relative bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.10)] p-2"
          >
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              disabled={loading && allLocations.length === 0}
              aria-haspopup="listbox"
              aria-expanded={open}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              <svg
                className="w-5 h-5 text-ruby-red shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 leading-none">
                  Browsing
                </div>
                <div className="text-sm sm:text-base font-semibold text-ruby-black mt-0.5 truncate">
                  {buttonLabel}
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown */}
            {open && (
              <div
                role="listbox"
                aria-label="Choose a city"
                className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden max-h-80 overflow-y-auto z-40"
              >
                {allLocations.length === 0 && (
                  <div className="px-5 py-4 text-sm text-gray-500">
                    {loading ? 'Loading cities…' : 'No cities available right now.'}
                  </div>
                )}
                {allLocations.map((loc) => {
                  const isSelected = loc._id === selectedLocation?._id;
                  return (
                    <button
                      key={loc._id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedLocation(loc);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-red-50 text-ruby-red'
                          : 'hover:bg-gray-50 text-ruby-black'
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 shrink-0 ${isSelected ? 'text-ruby-red' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-medium">{loc.name}</span>
                      {isSelected && (
                        <svg
                          className="w-4 h-4 ml-auto text-ruby-red"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Red Background */}
      <div
        className="relative overflow-hidden pt-24 sm:pt-20 pb-12 sm:pb-12"
        style={{
          background:
            'linear-gradient(59.68deg, #97201C -49.52%, #FD362F 182.5%)',
        }}
      >
        {/* Diamond 1 — left, smaller, shifted down */}
        <div
          className="hidden sm:block absolute left-0 bottom-0 -translate-x-[15%] translate-y-[10%] w-28 sm:w-36 lg:w-48 h-28 sm:h-36 lg:h-48 bg-contain bg-no-repeat bg-center brightness-[0.4]"
          style={{ backgroundImage: 'url(/images/diamond1.png)' }}
          aria-hidden="true"
        />

        {/* Diamond 2 — right, bigger */}
        <div
          className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-[5%] w-44 sm:w-60 lg:w-80 h-44 sm:h-60 lg:h-80 bg-contain bg-no-repeat bg-center brightness-[0.4]"
          style={{ backgroundImage: 'url(/images/diamond2.png)' }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="font-playfair text-xl sm:text-2xl lg:text-3xl font-bold text-white italic leading-snug">
              &ldquo;A Discovery & Connection Point For Tourists, Local
              Residents, Diasporas And Local Businesses&rdquo;
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
