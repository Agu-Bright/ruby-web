import ScrollReveal from "../landing/ScrollReveal";
import { CircleCheck, XCircle, Wallet } from "lucide-react";

/**
 * Vague-transparent pricing block — three promise cards. NO specific
 * commission percentages so we don't lock the business publicly into
 * numbers that may evolve. The point is to communicate the model
 * (we only earn when you earn) without baking in tier figures.
 */
const promises = [
  {
    icon: XCircle,
    title: "No setup fees",
    body: "Sign up, get verified, start selling. Listing on Ruby+ doesn't cost you a Naira up front.",
  },
  {
    icon: Wallet,
    title: "No monthly fees",
    body: "No subscriptions. No platform charges. You keep what you earn, minus a small commission per sale.",
  },
  {
    icon: CircleCheck,
    title: "Pay only when you earn",
    body: "We take a small commission per completed transaction. No sale, no charge. Your costs scale with your revenue, not the other way around.",
  },
];

export default function PricingPromise() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-ruby-black tracking-wide uppercase">
              Honest pricing
            </h2>
            <div className="mt-2 w-12 h-1 bg-ruby-red mx-auto rounded-full" />
            <p className="mt-4 text-sm sm:text-base text-gray-500 max-w-xl mx-auto">
              The way it should be — pay for results, never for promises.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto">
          {promises.map((p, i) => {
            const Icon = p.icon;
            return (
              <ScrollReveal key={p.title} delay={i + 1}>
                <div className="relative h-full bg-gradient-to-br from-red-50 via-white to-white border border-gray-100 rounded-2xl p-6 sm:p-7 overflow-hidden">
                  {/* Decorative accent in the corner */}
                  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-ruby-red/5" />

                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-ruby-red flex items-center justify-center mb-4 shadow-lg shadow-ruby-red/30">
                      <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-ruby-black mb-2">
                      {p.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {p.body}
                    </p>
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
