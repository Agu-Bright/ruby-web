"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ScrollReveal from "../landing/ScrollReveal";

/**
 * 6 FAQ accordions covering the most-asked merchant questions. Each
 * answer is intentionally short — a sentence or two — because long
 * FAQ entries get skipped. Anyone who needs more detail clicks the
 * follow-up support link in the footer.
 *
 * Animation: pure CSS — grid-template-rows from 0fr → 1fr. No JS
 * height-measurement gymnastics, no layout shift on open.
 */
const faqs = [
  {
    q: "How do I sign up?",
    a: "Download the Ruby+ Business app (coming soon to App Store and Google Play) or sign up via our web flow. You'll need your CAC certificate, a business bank account, and 5 minutes.",
  },
  {
    q: "When do I get paid?",
    a: "Earnings auto-payout to your bank account daily. There's no withdrawal request, no admin approval — the money moves itself the next business day after a sale.",
  },
  {
    q: "What does it cost?",
    a: "Nothing to sign up. Nothing per month. We take a small commission only on completed transactions. If you don't sell, you don't pay.",
  },
  {
    q: "Do I need CAC registration?",
    a: "Yes — Ruby+ verifies every business via the Corporate Affairs Commission. This protects both you and customers, and it's why our verified badge actually means something.",
  },
  {
    q: "Can I manage multiple branches?",
    a: "Yes. One login, all your branches. You choose whether each branch shares a catalogue with the others, runs its own, or mixes both.",
  },
  {
    q: "How do customers find my business?",
    a: "Through Ruby+ category search, location-based recommendations, our AI concierge Deolu, and Ruby Ads if you want a paid boost. Verified merchants surface first.",
  },
];

export default function PartnerFAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0); // First one open by default

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-ruby-black tracking-wide uppercase">
              Frequently asked
            </h2>
            <div className="mt-2 w-12 h-1 bg-ruby-red mx-auto rounded-full" />
          </div>
        </ScrollReveal>

        <div className="space-y-3">
          {faqs.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <ScrollReveal key={item.q} delay={Math.min(i + 1, 6)}>
                <div
                  className={`bg-gray-50 border rounded-2xl overflow-hidden transition-all duration-300 ${
                    isOpen
                      ? "border-ruby-red/30 shadow-sm"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm sm:text-base font-semibold text-ruby-black">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`shrink-0 w-5 h-5 text-ruby-red transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {/* CSS-only expand: grid-template-rows trick — no JS
                      height measurement, no layout-shift jitter. */}
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 sm:px-6 pb-5 text-sm text-gray-600 leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
