import Image from 'next/image';
import ScrollReveal from '../landing/ScrollReveal';
import StatsStrip from '../landing/StatsStrip';

export default function MissionAndStats() {
  return (
    <div className="relative">
      {/* Mission Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
            {/* Left — Text */}
            <div className="flex-1 max-w-xl">
              <ScrollReveal>
                <p className="font-playfair text-sm text-ruby-red italic mb-2">
                  Since 2000
                </p>
                <h2
                  className="font-playfair text-2xl sm:text-3xl font-bold text-ruby-black uppercase mb-6"
                  style={{ fontVariant: 'small-caps' }}
                >
                  Our Mission
                </h2>
              </ScrollReveal>

              <ScrollReveal delay={1}>
                <div className="space-y-4 text-sm sm:text-[13px] text-gray-600 leading-relaxed text-justify">
                  <p>
                    Ruby+ was born from a simple yet powerful vision: to keep the Nigerian diaspora connected to their roots while discovering the vibrant culture that makes Nigeria unique.
                  </p>
                  <p>
                    Ruby+ is a platform that collates premium Nigerian businesses and services for display to diaspora Nigerians and tourists visiting Nigeria to drive tourism and commerce.
                  </p>
                  <p>
                    Our mobile app allows Nigerian brands to have a virtual storefront from where customers can get information, navigate to visit while in Nigeria and order for products and services. Businesses receive payment from Apple Pay and International Cards through the app.
                  </p>
                </div>
              </ScrollReveal>
            </div>

            {/* Right — Phone Mockup (extends into StatsStrip) */}
            <div className="flex-1 flex justify-center lg:justify-end">
              <div className="relative z-30 lg:mb-[-180px]">
                <ScrollReveal delay={2}>
                  <Image
                    src="/images/iphone.png"
                    alt="Ruby+ App"
                    width={320}
                    height={640}
                    className="w-[240px] sm:w-[280px] lg:w-[320px] h-auto drop-shadow-2xl"
                  />
                </ScrollReveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* StatsStrip — phone overlaps into this */}
      <div className="relative z-10">
        <StatsStrip />
      </div>
    </div>
  );
}