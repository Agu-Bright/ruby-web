import ScrollReveal from "../landing/ScrollReveal";
import { UserPlus, Store, ShoppingBag, Banknote } from "lucide-react";

/**
 * 4-step horizontal flow describing the merchant journey from signup to
 * first payout. Distilled from the 16-step in-app onboarding into 4
 * mental milestones a stranger can scan in 10 seconds.
 *
 * The horizontal "connector line" between steps only renders on lg+
 * because on mobile the cards stack vertically and a line would look
 * out of place.
 */
const steps = [
  {
    n: "01",
    icon: UserPlus,
    title: "Sign up + verify",
    body: "Create your account, upload your CAC, and pick the categories you operate in. Takes about 5 minutes.",
  },
  {
    n: "02",
    icon: Store,
    title: "Set up your store",
    body: "Add your products or services, opening hours, branches, and bank account. We resolve the account name automatically.",
  },
  {
    n: "03",
    icon: ShoppingBag,
    title: "Get orders + bookings",
    body: "Customers find you through search, recommendations, and our AI concierge. Accept and fulfil from the app.",
  },
  {
    n: "04",
    icon: Banknote,
    title: "Get paid daily",
    body: "Earnings auto-payout to your bank account each day. No withdrawal requests, no waiting for admin approval.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-ruby-black tracking-wide uppercase">
              How it works
            </h2>
            <div className="mt-2 w-12 h-1 bg-ruby-red mx-auto rounded-full" />
            <p className="mt-4 text-sm sm:text-base text-gray-500 max-w-xl mx-auto">
              From signup to first payout, four steps. No hidden process.
            </p>
          </div>
        </ScrollReveal>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
          {/* Connector line behind the cards on lg+. Sits below the
              icon row, runs the full width of the grid. */}
          <div
            className="hidden lg:block absolute top-[44px] left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-ruby-red/40 to-transparent"
            aria-hidden="true"
          />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <ScrollReveal key={step.n} delay={i + 1}>
                <div className="relative flex flex-col items-center text-center px-4">
                  {/* Icon disc with the step number floating top-right */}
                  <div className="relative mb-5">
                    <div className="w-[88px] h-[88px] rounded-2xl bg-red-50 flex items-center justify-center transition-colors duration-300 group-hover:bg-ruby-red">
                      <Icon className="w-9 h-9 text-ruby-red" />
                    </div>
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-ruby-red text-white text-xs font-bold shadow-lg shadow-ruby-red/30">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-ruby-black mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-xs">
                    {step.body}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
