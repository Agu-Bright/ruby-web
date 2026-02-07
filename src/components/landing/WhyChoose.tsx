import Image from 'next/image';
import ScrollReveal from './ScrollReveal';

const features = [
  {
    icon: '/images/ruby.png',
    title: 'Verified Businesses',
    desc: 'Every restaurant, hotel, club, and service is thoroughly verified to ensure quality and authenticity.',
    points: [
      'Background checks for all merchants',
      'Customer reviews and ratings',
      'Regular quality assessments',
    ],
  },
  {
    icon: '/images/payment.png',
    title: 'Seamless Payments',
    desc: 'Pay with your international cards while merchants receive payments in their local accounts.',
    points: [
      'No currency conversion needed',
      'Secure, encrypted transactions',
      'Instant payment confirmations',
    ],
  },
];

export default function WhyChoose() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-ruby-black uppercase" style={{ fontVariant: 'small-caps' }}>
              Why Choose Ruby+?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-500 max-w-md mx-auto leading-relaxed">
              The most comprehensive platform for discovering and experiencing Nigerian culture
            </p>
          </div>
        </ScrollReveal>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feat, i) => (
            <ScrollReveal key={feat.title} delay={i + 1}>
              <div className="flex items-stretch gap-4 h-[200px]">
                {/* Icon — fixed 200×200 square */}
                <div className="shrink-0 w-[200px] h-[200px] rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.08)] flex items-center justify-center">
                  <Image
                    src={feat.icon}
                    alt={feat.title}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-contain"
                  />
                </div>

                {/* Content — fixed 200px height, everything fits inside */}
                <div className="flex-1 min-w-0 h-[200px] flex flex-col justify-center">
                  <h3 className="text-sm font-bold text-ruby-black mb-1">
                    {feat.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 leading-snug mb-3">
                    {feat.desc}
                  </p>

                  <ul className="space-y-1.5">
                    {feat.points.map((point) => (
                      <li key={point} className="flex items-center gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-red-50 border border-ruby-red/30 flex items-center justify-center">
                          <svg className="w-2 h-2 text-ruby-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="text-[11px] text-gray-600">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}