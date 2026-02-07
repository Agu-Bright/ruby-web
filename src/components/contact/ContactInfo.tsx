import ScrollReveal from "../landing/ScrollReveal";

const contactCards = [
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
        />
      </svg>
    ),
    title: "Email",
    desc: "We will reply within 2 working days",
    detail: "founder@rubylabs.onmicrosoft.com",
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
        />
      </svg>
    ),
    title: "Phone",
    desc: "We are available Monday-Friday from 8 AM until 5 PM",
    detail: "(+234) 816-903-8184,\n(+1) 647-451-8728",
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
        />
      </svg>
    ),
    title: "HQ Office",
    desc: "Visit us in our office",
    detail:
      "Nigeria Address:\nE1B Gat Oboh drive, VI, Lagos.\n\nCanada address:\n308 Jarvis Street, Toronto,\nOntario, Canada. M5B 0E3.",
  },
];

export default function ContactInfo() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="mb-10">
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-ruby-black mb-2">
              Contact us
            </h2>
            <p className="text-sm text-gray-500">
              We are here to help you make a first move to greener choice.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {contactCards.map((card, i) => (
            <ScrollReveal key={card.title} delay={i + 1}>
              <div className="h-full">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-red-50 text-ruby-red flex items-center justify-center mb-4">
                  {card.icon}
                </div>

                <h3 className="text-base font-bold text-ruby-black mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  {card.desc}
                </p>

                <p className="text-xs sm:text-sm text-ruby-black font-medium whitespace-pre-line leading-relaxed">
                  {card.detail}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
