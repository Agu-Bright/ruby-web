import Image from "next/image";

export default function PartnerHero() {
  return (
    <section className="relative min-h-[580px] flex items-center">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero.png"
          alt="Partner with Ruby+"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.16] tracking-[-0.04em] mb-6">
            <span className="text-ruby-red font-bold italic">
              Partner with Us
            </span>
            <span className="text-white"> – Grow Your Business.</span>
            <br />
            <span className="text-white">Reach More Customers.</span>
          </h1>

          <p className="font-medium text-base sm:text-lg text-white/80 max-w-2xl mb-10 leading-relaxed">
            Ruby+ helps you manage your online presence, track performance, and
            reach more customers—both nearby and beyond.
          </p>

          {/* App Store Badges */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center cursor-pointer gap-2.5 px-5 py-2.5 bg-black border border-white/20 rounded-lg">
              <svg
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div>
                <div className="text-[9px] text-white/60 leading-none">
                  Coming Soon on
                </div>
                <div className="text-sm font-semibold text-white leading-tight">
                  App Store
                </div>
              </div>
            </div>
            <div className="flex items-center cursor-pointe gap-2.5 px-5 py-2.5 bg-black border border-white/20 rounded-lg">
              <svg
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 01-.609-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.4 13.195l2.298-3.687zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z" />
              </svg>
              <div>
                <div className="text-[9px] text-white/60 leading-none">
                  Coming Soon on
                </div>
                <div className="text-sm font-semibold text-white leading-tight">
                  Google Play
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
