import ScrollReveal from "../landing/ScrollReveal";
import { ShieldCheck, Banknote, MapPin, Building2 } from "lucide-react";

/**
 * Thin business-focused stats strip — replaces the consumer-shaped
 * StatsStrip on the /partner page. Each stat is paired with an icon
 * so the trust signal lands faster than a number alone.
 *
 * Numbers here are placeholders; swap in live values from
 * /admin/health aggregates in V1.1 (see the "Out of scope" note in
 * the plan).
 */
const trustItems = [
  {
    icon: Building2,
    value: "10,000+",
    label: "Businesses onboarded",
  },
  {
    icon: Banknote,
    value: "Daily",
    label: "Auto-payout to your bank",
  },
  {
    icon: ShieldCheck,
    value: "CAC",
    label: "Verified merchants only",
  },
  {
    icon: MapPin,
    value: "4 cities",
    label: "Lagos · Abuja · PH · Abeokuta",
  },
];

export default function PartnerTrustStrip() {
  return (
    <section
      className="relative overflow-hidden py-10 sm:py-12 lg:py-14"
      style={{
        background:
          "linear-gradient(59.68deg, #97201C -49.52%, #FD362F 182.5%)",
      }}
    >
      {/* Diamonds — same brand motif as the consumer StatsStrip so the
          two pages feel cohesive. */}
      <div
        className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[30%] w-44 sm:w-60 lg:w-80 h-44 sm:h-60 lg:h-80 bg-contain bg-no-repeat bg-center brightness-[0.4]"
        style={{ backgroundImage: "url(/images/diamond1.png)" }}
        aria-hidden="true"
      />
      <div
        className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-[5%] w-28 sm:w-36 lg:w-48 h-28 sm:h-36 lg:h-48 bg-contain bg-no-repeat bg-center brightness-[0.4]"
        style={{ backgroundImage: "url(/images/diamond2.png)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <ScrollReveal
                key={item.label}
                delay={i + 1}
                className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-3"
              >
                <div className="shrink-0 w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="font-playfair text-xl sm:text-2xl lg:text-3xl font-bold text-white italic leading-tight">
                    {item.value}
                  </div>
                  <div className="text-xs sm:text-sm text-white/80 font-medium leading-snug mt-0.5">
                    {item.label}
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
