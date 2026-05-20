import ScrollReveal from "../landing/ScrollReveal";

/**
 * Side-by-side phone-mockup gallery showing 3 screens of the business
 * app. On mobile they stack; on desktop they sit in a 3-col row.
 *
 * The mockups are placeholder gradient cards in V1 — real screenshots
 * will replace them. Until then, each card has a labelled "screen" so
 * the section still communicates its intent (here's what the merchant
 * actually sees in the app).
 *
 * Image paths are reserved at `/images/partner/screen-{orders,payout,analytics}.png`
 * — drop the screenshots in `public/images/partner/` and they'll render
 * automatically when present. Until then the gradient placeholder shows.
 */
const screens = [
  {
    label: "Orders",
    caption: "Accept and fulfil orders in real-time",
    img: "/images/partner/screen-orders.png",
    accent: "from-blue-500 to-blue-700",
  },
  {
    label: "Payout",
    caption: "Track every payout to your bank",
    img: "/images/partner/screen-payout.png",
    accent: "from-emerald-500 to-emerald-700",
  },
  {
    label: "Analytics",
    caption: "See what's working — and what isn't",
    img: "/images/partner/screen-analytics.png",
    accent: "from-violet-500 to-violet-700",
  },
];

export default function AppShowcase() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-ruby-black tracking-wide uppercase">
              The business app in your pocket
            </h2>
            <div className="mt-2 w-12 h-1 bg-ruby-red mx-auto rounded-full" />
            <p className="mt-4 text-sm sm:text-base text-gray-500 max-w-2xl mx-auto">
              Built for the way you already work — from your phone, between
              customers, on the move.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 lg:gap-10">
          {screens.map((s, i) => (
            <ScrollReveal key={s.label} delay={i + 1}>
              <div className="flex flex-col items-center">
                {/* Phone mockup frame */}
                <div className="relative w-[220px] sm:w-[200px] lg:w-[240px] aspect-[9/19] rounded-[2.5rem] bg-gray-900 p-2.5 shadow-2xl shadow-gray-300/50">
                  {/* Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-b-2xl z-10" />
                  {/* Screen */}
                  <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.img}
                      alt={`Business app ${s.label} screen`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // If the real screenshot isn't in /public yet,
                        // hide the broken img and let the gradient
                        // placeholder behind show through.
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    {/* Gradient placeholder — sits behind the img.
                        Visible only when the img fails to load. */}
                    <div
                      className={`absolute inset-0 -z-10 bg-gradient-to-br ${s.accent} flex flex-col items-center justify-center text-white`}
                    >
                      <div className="text-3xl font-playfair font-bold italic">
                        {s.label}
                      </div>
                      <div className="text-[10px] mt-2 px-3 opacity-70 text-center">
                        Screenshot coming soon
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="mt-6 text-base sm:text-lg font-semibold text-ruby-black">
                  {s.label}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 text-center max-w-[200px]">
                  {s.caption}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
