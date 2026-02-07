"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";

const people = [
  { name: "Peter", image: "https://picsum.photos/seed/av1/80/80" },
  { name: "Osinachi", image: "https://picsum.photos/seed/av2/80/80" },
  { name: "Nura Acholo", image: "https://picsum.photos/seed/av3/80/80" },
  { name: "Kieus", image: "https://picsum.photos/seed/av4/80/80" },
  { name: "Bryan", image: "https://picsum.photos/seed/av5/80/80" },
  { name: "Victor", image: "https://picsum.photos/seed/av6/80/80" },
];

const testimonials = [
  {
    text: '"I had the most incredible vacation experience thanks to the amazing team at XYZ Travel Agency! From the moment I contacted them, they were friendly and knowledgeable and helped me plan the perfect itinerary. They took care of every detail, from booking flights and accommodations to arranging local tours and connections."',
    author: "Nura Acholo",
    role: "Traveler",
    index: 2,
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(2);

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-ruby-red uppercase tracking-widest mb-2">
              Testimonials
            </p>
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-ruby-black"
              style={{ fontStyle: "italic" }}
            >
              Don&apos;t take our word for it
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={1}>
          <div className="text-center max-w-3xl mx-auto">
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  className="w-5 h-5 star-filled"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <p className="text-sm sm:text-base text-gray-600 leading-relaxed italic">
              {testimonials[0].text}
            </p>
          </div>
        </ScrollReveal>

        {/* Avatar row */}
        <ScrollReveal delay={2}>
          <div className="mt-10 flex items-center justify-center gap-4 sm:gap-6">
            {people.map((p, i) => (
              <button
                key={p.name}
                onClick={() => setActive(i)}
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active === i ? "scale-110" : "opacity-50 hover:opacity-80"}`}
              >
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 ${active === i ? "border-ruby-red" : "border-transparent"} transition-colors`}
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-gray-600">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
