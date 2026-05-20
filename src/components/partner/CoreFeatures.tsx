import ScrollReveal from "../landing/ScrollReveal";
import {
  ListOrdered,
  CalendarClock,
  Building2,
  Banknote,
  Megaphone,
  LineChart,
} from "lucide-react";

/**
 * 6 benefit cards in a 3×2 grid (2-col on tablet, 1-col on mobile).
 * Each title + body maps to a real feature in the business mobile app
 * (see plan Phase 19's "Headline features" inventory).
 *
 * The icons are deliberately solid Lucide glyphs in ruby-red — same
 * visual weight as the category icons on the consumer landing, so a
 * visitor moving between /partner and / sees the same iconography
 * language.
 */
const features = [
  {
    icon: ListOrdered,
    title: "Live order management",
    body: "Accept, prep, and dispatch orders from one screen. Real-time status updates flow back to your customer automatically — no manual SMSing.",
  },
  {
    icon: CalendarClock,
    title: "Service bookings",
    body: "Take reservations and appointments with built-in lifecycle tracking — pending, confirmed, in-progress, completed. Customers see live status; you see your day at a glance.",
  },
  {
    icon: Building2,
    title: "Multi-branch from one app",
    body: "Run several locations from a single login. Shared catalogue, independent inventory, or mixed — your choice per branch.",
  },
  {
    icon: Banknote,
    title: "Daily auto-payout",
    body: "Earnings settle to your bank account every day via Paystack. No withdrawal requests. No admin approvals. The money moves itself.",
  },
  {
    icon: Megaphone,
    title: "Ruby Ads",
    body: "Boost your visibility with paid campaigns. Set a daily budget, watch impressions and clicks live, and pause anytime.",
  },
  {
    icon: LineChart,
    title: "Earnings analytics",
    body: "See your revenue, order count, and booking volume over 7, 30, or 90 days. Spot growth, spot dips, act on both.",
  },
];

export default function CoreFeatures() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-ruby-black tracking-wide uppercase">
              Everything you need to run your business
            </h2>
            <div className="mt-2 w-12 h-1 bg-ruby-red mx-auto rounded-full" />
            <p className="mt-4 text-sm sm:text-base text-gray-500 max-w-2xl mx-auto">
              Six tools, one app, zero extra subscriptions.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <ScrollReveal key={f.title} delay={Math.min(i + 1, 10)}>
                <div className="card-hover bg-white border border-gray-100 rounded-2xl p-6 sm:p-7 group h-full transition-shadow duration-300 hover:shadow-lg">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4 group-hover:bg-ruby-red transition-colors duration-300">
                    <Icon className="w-6 h-6 text-ruby-red group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-ruby-black mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {f.body}
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
