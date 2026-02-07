import ScrollReveal from './ScrollReveal';

const stats = [
  { value: '2K+', label: 'Active Users' },
  { value: '500+', label: 'Verified Businesses' },
  { value: '24/7', label: 'Standby Support' },
];

export default function StatsStrip() {
  return (
    <section
      className="relative overflow-hidden py-8 sm:py-10 lg:py-14"
      style={{ background: 'linear-gradient(59.68deg, #97201C -49.52%, #FD362F 182.5%)' }}
    >
      {/* Diamond 1 — left, bigger, partially visible */}
      <div
        className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[30%] w-44 sm:w-60 lg:w-80 h-44 sm:h-60 lg:h-80 bg-contain bg-no-repeat bg-center brightness-[0.4]"
        style={{ backgroundImage: 'url(/images/diamond1.png)' }}
        aria-hidden="true"
      />

      {/* Diamond 2 — right, smaller */}
      <div
        className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-[5%] w-28 sm:w-36 lg:w-48 h-28 sm:h-36 lg:h-48 bg-contain bg-no-repeat bg-center brightness-[0.4]"
        style={{ backgroundImage: 'url(/images/diamond2.png)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile: horizontal row, no dividers. Tablet+: dividers */}
        <div className="flex items-center justify-center gap-6 sm:gap-0 sm:divide-x sm:divide-white/30">
          {stats.map((stat, i) => (
            <ScrollReveal
              key={stat.label}
              delay={i + 1}
              className="flex-1 sm:flex-none sm:px-12 lg:px-16 text-center"
            >
              <div className="font-playfair text-2xl sm:text-4xl lg:text-5xl font-bold text-white italic">
                {stat.value}
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm lg:text-base text-white/70 font-medium">
                {stat.label}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}