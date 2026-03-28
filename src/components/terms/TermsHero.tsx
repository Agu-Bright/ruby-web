import Image from "next/image";

export default function TermsHero() {
  return (
    <section className="relative min-h-[40vh] flex items-center justify-center">
      <div className="absolute inset-0">
        <Image
          src="/images/hero.png"
          alt="Terms of Service"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
        <p className="font-playfair text-lg sm:text-xl text-ruby-red font-bold italic mb-2">
          Our Agreement With You
        </p>
        <h1 className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.16] tracking-[-0.02em] mb-6">
          Terms of Service
        </h1>
        <p className="font-medium text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
          The terms and conditions that govern your use of the Ruby+ platform.
        </p>
      </div>
    </section>
  );
}
