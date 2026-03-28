"use client";

import { ScrollReveal } from "@/components/landing";

const EFFECTIVE_DATE = "March 28, 2026";
const LAST_UPDATED = "March 28, 2026";

const TOC = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use", label: "How We Use Your Information" },
  { id: "sharing", label: "Sharing Your Information" },
  { id: "data-storage", label: "Data Storage & Security" },
  { id: "your-rights", label: "Your Rights" },
  { id: "cookies", label: "Cookies & Tracking" },
  { id: "children", label: "Children's Privacy" },
  { id: "international", label: "International Data Transfers" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Us" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <ScrollReveal>
      <div id={id} className="scroll-mt-24 mb-12">
        <h2 className="font-playfair text-xl sm:text-2xl font-bold text-ruby-red uppercase mb-4 tracking-wide">
          {title}
        </h2>
        <div className="text-sm sm:text-base text-gray-600 leading-relaxed space-y-4">
          {children}
        </div>
      </div>
    </ScrollReveal>
  );
}

export default function PrivacyContent() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          {/* Table of Contents — sticky sidebar on desktop */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                On this page
              </p>
              <ul className="space-y-2 border-l border-gray-200 pl-4">
                {TOC.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-sm text-gray-500 hover:text-ruby-red transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <div>
            {/* Effective date banner */}
            <div className="bg-gray-50 rounded-xl px-6 py-4 mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">Effective Date:</span>{" "}
                {EFFECTIVE_DATE}
              </p>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">Last Updated:</span>{" "}
                {LAST_UPDATED}
              </p>
            </div>

            <Section id="introduction" title="1. Introduction">
              <p>
                Welcome to Ruby+ (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or
                &ldquo;our&rdquo;), a product of <strong>Ruby Aggregators Limited</strong>,
                a company incorporated under the laws of the Federal Republic of Nigeria.
              </p>
              <p>
                Ruby+ is a marketplace platform that connects Nigerian businesses with
                diaspora Nigerians, tourists, and local customers. This Privacy Policy
                explains how we collect, use, store, and protect your personal information
                when you use our mobile applications (Ruby+ Customer App, Ruby+ Business
                App), website, and related services (collectively, the
                &ldquo;Platform&rdquo;).
              </p>
              <p>
                By accessing or using the Platform, you consent to the collection and use of
                your information as described in this policy, in accordance with the
                <strong> Nigeria Data Protection Act (NDPA) 2023</strong> and the
                <strong> Nigeria Data Protection Regulation (NDPR)</strong>.
              </p>
            </Section>

            <Section id="information-we-collect" title="2. Information We Collect">
              <p className="font-semibold text-gray-700">
                a) Information You Provide Directly
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>
                  <strong>Account Information:</strong> Full name, email address, phone
                  number, date of birth, and profile photo.
                </li>
                <li>
                  <strong>Business Information:</strong> Business name, description,
                  address, CAC registration number, operating hours, and product/service
                  listings.
                </li>
                <li>
                  <strong>Payment Information:</strong> We do not store your full payment
                  card details. All payment processing is handled securely by Paystack, our
                  PCI-DSS compliant payment partner.
                </li>
                <li>
                  <strong>Communication Data:</strong> Messages, reviews, comments, and
                  support requests you submit through the Platform.
                </li>
                <li>
                  <strong>Delivery Information:</strong> Delivery addresses, pickup
                  instructions, and recipient contact details.
                </li>
              </ul>

              <p className="font-semibold text-gray-700 mt-4">
                b) Information Collected Automatically
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>
                  <strong>Location Data:</strong> With your permission, we collect your
                  device&apos;s GPS location to show nearby businesses, enable delivery
                  tracking, and provide location-based services.
                </li>
                <li>
                  <strong>Device Information:</strong> Device type, operating system,
                  unique device identifiers, and push notification tokens.
                </li>
                <li>
                  <strong>Usage Data:</strong> Pages visited, features used, search
                  queries, interaction timestamps, and app performance metrics.
                </li>
              </ul>
            </Section>

            <Section id="how-we-use" title="3. How We Use Your Information">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>
                  Provide, maintain, and improve the Platform and its features.
                </li>
                <li>
                  Process orders, bookings, deliveries, and payments.
                </li>
                <li>
                  Connect you with businesses, delivery riders, and service providers.
                </li>
                <li>
                  Send transactional notifications (order updates, booking confirmations,
                  delivery tracking).
                </li>
                <li>
                  Personalize your experience based on your location, preferences, and
                  browsing history.
                </li>
                <li>
                  Detect, prevent, and address fraud, abuse, and security issues.
                </li>
                <li>
                  Comply with legal obligations, including Nigerian data protection laws.
                </li>
                <li>
                  Send promotional communications (with your consent, which you can withdraw
                  at any time).
                </li>
              </ul>
            </Section>

            <Section id="sharing" title="4. Sharing Your Information">
              <p>
                We do not sell your personal information. We may share your data with
                the following categories of third parties:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>
                  <strong>Businesses on the Platform:</strong> When you place an order or
                  book a service, the relevant business receives your name, contact
                  information, and order/booking details.
                </li>
                <li>
                  <strong>Delivery Partners:</strong> We share pickup and delivery
                  addresses, recipient details, and package descriptions with our delivery
                  partners (e.g., Glovo/PandaGo, Kwik) to fulfill deliveries.
                </li>
                <li>
                  <strong>Payment Processors:</strong> Paystack processes all transactions.
                  Your payment data is handled under their PCI-DSS compliant systems.
                </li>
                <li>
                  <strong>Partner Services:</strong> When you use integrated third-party
                  services (e.g., Chowdeck for food ordering), we share necessary profile
                  information to create your session.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> We may disclose your information
                  when required by law, court order, or government request.
                </li>
              </ul>
            </Section>

            <Section id="data-storage" title="5. Data Storage & Security">
              <p>
                Your data is stored on secure cloud infrastructure (MongoDB Atlas) with
                industry-standard encryption at rest and in transit (TLS/SSL). We
                implement:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Encrypted database connections and data at rest.</li>
                <li>
                  JWT-based authentication with access and refresh token rotation.
                </li>
                <li>Bcrypt password hashing (passwords are never stored in plain text).</li>
                <li>Rate limiting and throttling to prevent brute-force attacks.</li>
                <li>
                  Role-based access control (RBAC) for administrative functions.
                </li>
                <li>Regular security audits and monitoring.</li>
              </ul>
              <p>
                While we take every reasonable precaution, no method of transmission over
                the Internet or electronic storage is 100% secure. We cannot guarantee
                absolute security.
              </p>
            </Section>

            <Section id="your-rights" title="6. Your Rights">
              <p>
                Under the Nigeria Data Protection Act (NDPA) 2023, you have the right to:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>
                  <strong>Access:</strong> Request a copy of the personal data we hold
                  about you.
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate or
                  incomplete data.
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal data, subject
                  to legal retention requirements.
                </li>
                <li>
                  <strong>Data Portability:</strong> Request your data in a structured,
                  machine-readable format.
                </li>
                <li>
                  <strong>Withdraw Consent:</strong> Withdraw consent for marketing
                  communications or optional data processing at any time.
                </li>
                <li>
                  <strong>Object:</strong> Object to processing of your data for certain
                  purposes.
                </li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{" "}
                <a
                  href="mailto:privacy@rubyaggregators.com"
                  className="text-ruby-red hover:underline font-medium"
                >
                  privacy@rubyaggregators.com
                </a>
                . We will respond within 30 days.
              </p>
            </Section>

            <Section id="cookies" title="7. Cookies & Tracking">
              <p>
                Our website uses cookies and similar technologies to enhance your
                browsing experience. These include:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>
                  <strong>Essential Cookies:</strong> Required for the website to function
                  (authentication, security).
                </li>
                <li>
                  <strong>Analytics Cookies:</strong> Help us understand how visitors use
                  our website to improve performance and content.
                </li>
                <li>
                  <strong>Preference Cookies:</strong> Remember your settings and
                  preferences (e.g., selected location, theme).
                </li>
              </ul>
              <p>
                Our mobile apps use device identifiers and push notification tokens for
                functionality and analytics. You can manage notification preferences in
                your device settings.
              </p>
              <p>
                You can control cookies through your browser settings. Disabling certain
                cookies may affect the functionality of the website.
              </p>
            </Section>

            <Section id="children" title="8. Children's Privacy">
              <p>
                The Platform is not intended for children under the age of 18. We do not
                knowingly collect personal information from children. If we become aware
                that we have collected data from a child under 18, we will take steps to
                delete such information promptly.
              </p>
            </Section>

            <Section id="international" title="9. International Data Transfers">
              <p>
                Ruby+ serves diaspora Nigerians and tourists worldwide. Your data may be
                processed and stored in jurisdictions outside Nigeria, including cloud
                servers operated by our service providers. We ensure that any
                international transfers comply with applicable data protection laws and
                that adequate safeguards are in place.
              </p>
            </Section>

            <Section id="changes" title="10. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in
                our practices, technology, or legal requirements. We will notify you of
                significant changes through:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>In-app push notifications.</li>
                <li>Email notification to your registered email address.</li>
                <li>A prominent notice on the Platform.</li>
              </ul>
              <p>
                Your continued use of the Platform after the effective date of any
                changes constitutes acceptance of the updated policy.
              </p>
            </Section>

            <Section id="contact" title="11. Contact Us">
              <p>
                If you have any questions, concerns, or requests regarding this Privacy
                Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 rounded-xl p-6 mt-3">
                <p className="font-semibold text-gray-800 mb-2">
                  Ruby Aggregators Limited
                </p>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>
                    Email:{" "}
                    <a
                      href="mailto:privacy@rubyaggregators.com"
                      className="text-ruby-red hover:underline"
                    >
                      privacy@rubyaggregators.com
                    </a>
                  </li>
                  <li>
                    Website:{" "}
                    <a
                      href="https://rubyaggregators.com"
                      className="text-ruby-red hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      rubyaggregators.com
                    </a>
                  </li>
                  <li>Address: Port Harcourt, Rivers State, Nigeria</li>
                </ul>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </section>
  );
}
