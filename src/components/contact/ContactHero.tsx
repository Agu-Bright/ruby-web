import Image from "next/image";

export default function ContactHero() {
  return (
    <section className="relative min-h-[50vh] flex items-center">
      <div className="absolute inset-0">
        <Image
          src="/images/hero.png"
          alt="Contact Ruby+"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.16] tracking-[-0.04em] mb-6">
            <span className="text-ruby-red font-bold italic">Contact Us</span>
            <span className="text-white"> – We&apos;d Love to</span>
            <br />
            <span className="text-white">Hear From You</span>
          </h1>
          <p className="font-medium text-base sm:text-lg text-white/80 max-w-2xl leading-relaxed">
            Questions, feedback, or partnership enquiries? Send us a message and
            we&apos;ll respond as soon as possible.
          </p>
        </div>
      </div>
    </section>
  );
}
