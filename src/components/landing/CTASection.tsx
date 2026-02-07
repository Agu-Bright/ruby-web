import ScrollReveal from "./ScrollReveal";

export default function CTASection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(https://picsum.photos/seed/ctabg/1920/600)",
        }}
      />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <ScrollReveal>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Ready To Connect With Nigeria
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
            Join thousands of discovering authentic Nigerian culture,
            businesses, and businesses through verified platforms.
          </p>
          <button className="btn-ruby mt-8 inline-flex items-center gap-2 px-8 py-3.5 bg-ruby-red text-white font-semibold rounded-lg text-sm">
            GET STARTED
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </button>
        </ScrollReveal>
      </div>
    </section>
  );
}
