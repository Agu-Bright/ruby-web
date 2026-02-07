import Image from 'next/image';

export default function AboutHero() {
  return (
    <section className="relative min-h-[50vh] flex items-center justify-center">
      <div className="absolute inset-0">
        <Image
          src="/images/hero.png"
          alt="About Ruby+"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
        <p className="font-playfair text-lg sm:text-xl text-ruby-red font-bold italic mb-2">
          About Ruby+
        </p>
        <h1 className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.16] tracking-[-0.02em] mb-6">
          Connecting Nigeria<br />to the World.
        </h1>
        <p className="font-medium text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
          A New Era of Connection, Evolving our platform to better serve the global Ruby+ Community with enhanced tools and deeper connections.
        </p>
      </div>
    </section>
  );
}