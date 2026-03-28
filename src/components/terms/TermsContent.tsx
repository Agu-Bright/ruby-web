"use client";

import { ScrollReveal } from "@/components/landing";

const EFFECTIVE_DATE = "March 28, 2026";
const LAST_UPDATED = "March 28, 2026";

const TOC = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "definitions", label: "Definitions" },
  { id: "accounts", label: "Account Registration" },
  { id: "platform-use", label: "Use of the Platform" },
  { id: "business-listings", label: "Business Listings" },
  { id: "orders-bookings", label: "Orders & Bookings" },
  { id: "delivery", label: "Delivery Services" },
  { id: "payments", label: "Payments" },
  { id: "reviews", label: "Reviews & Content" },
  { id: "ip", label: "Intellectual Property" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "disputes", label: "Dispute Resolution" },
  { id: "termination", label: "Termination" },
  { id: "governing-law", label: "Governing Law" },
  { id: "contact", label: "Contact" },
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

export default function TermsContent() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          {/* Table of Contents */}
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

            <Section id="acceptance" title="1. Acceptance of Terms">
              <p>
                By creating an account, accessing, or using the Ruby+ platform
                (website, mobile applications, and related services), you agree to be
                bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not
                agree, you must not use the Platform.
              </p>
              <p>
                These Terms constitute a legally binding agreement between you and
                <strong> Ruby Aggregators Limited</strong> (&ldquo;Ruby+&rdquo;,
                &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), a company
                incorporated under the laws of the Federal Republic of Nigeria.
              </p>
            </Section>

            <Section id="definitions" title="2. Definitions">
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>
                  <strong>&ldquo;Platform&rdquo;</strong> refers to the Ruby+ website,
                  mobile apps (Customer App and Business App), and all related services.
                </li>
                <li>
                  <strong>&ldquo;User&rdquo; or &ldquo;Customer&rdquo;</strong> refers to
                  any individual who creates a customer account to browse, order, or book
                  services.
                </li>
                <li>
                  <strong>&ldquo;Business&rdquo; or &ldquo;Business Owner&rdquo;</strong>{" "}
                  refers to any entity or individual that registers a business listing on
                  the Platform.
                </li>
                <li>
                  <strong>&ldquo;Services&rdquo;</strong> refers to all features provided
                  through the Platform, including business discovery, ordering, booking,
                  delivery, payments, and messaging.
                </li>
                <li>
                  <strong>&ldquo;Content&rdquo;</strong> refers to text, images, videos,
                  reviews, and other materials uploaded to the Platform by users or
                  businesses.
                </li>
              </ul>
            </Section>

            <Section id="accounts" title="3. Account Registration">
              <p>To use certain features of the Platform, you must create an account. You agree to:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Provide accurate, current, and complete information during registration.</li>
                <li>Maintain the security of your account credentials and not share them with others.</li>
                <li>Notify us immediately of any unauthorized access to your account.</li>
                <li>Be at least 18 years of age to create an account.</li>
              </ul>
              <p>
                You are responsible for all activities that occur under your account.
                Ruby+ reserves the right to suspend or terminate accounts that violate
                these Terms.
              </p>
            </Section>

            <Section id="platform-use" title="4. Use of the Platform">
              <p className="font-semibold text-gray-700">You agree NOT to:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Use the Platform for any unlawful purpose or in violation of Nigerian law.</li>
                <li>Impersonate any person or entity, or misrepresent your affiliation.</li>
                <li>Upload harmful, offensive, or misleading content.</li>
                <li>Attempt to gain unauthorized access to the Platform or its systems.</li>
                <li>Scrape, mine, or extract data from the Platform without written permission.</li>
                <li>Interfere with or disrupt the Platform&apos;s functionality.</li>
                <li>Use the Platform to harass, spam, or defraud other users or businesses.</li>
                <li>Create fake reviews, orders, or bookings.</li>
              </ul>
            </Section>

            <Section id="business-listings" title="5. Business Listings">
              <p>
                Businesses registered on the Platform must provide accurate and
                up-to-date information, including business name, address, operating
                hours, and product/service details.
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>
                  All new business listings are subject to admin review and approval before
                  becoming visible to customers.
                </li>
                <li>
                  Businesses may be required to provide CAC (Corporate Affairs Commission)
                  registration for verification.
                </li>
                <li>
                  Ruby+ reserves the right to reject, suspend, or remove any business
                  listing that violates these Terms or our community guidelines.
                </li>
                <li>
                  Product/service prices must be accurate and displayed in Nigerian Naira
                  (NGN).
                </li>
              </ul>
            </Section>

            <Section id="orders-bookings" title="6. Orders & Bookings">
              <p className="font-semibold text-gray-700">a) Orders (Products)</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Orders are placed between you (the customer) and the business. Ruby+ facilitates the transaction but is not a party to the sale.</li>
                <li>Prices are set by businesses and displayed in NGN. A service fee may apply.</li>
                <li>Orders can only be cancelled before the business accepts them, unless otherwise agreed.</li>
              </ul>

              <p className="font-semibold text-gray-700 mt-4">b) Bookings (Services)</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Service bookings are subject to availability and the business&apos;s cancellation policy.</li>
                <li>A deposit may be required at the time of booking.</li>
                <li>Cancellation fees apply as specified by each business&apos;s policy.</li>
              </ul>

              <p className="font-semibold text-gray-700 mt-4">c) Refunds</p>
              <p>
                Refund eligibility depends on the circumstances (e.g., order not
                fulfilled, service not provided as described). Disputes are handled
                through our in-app dispute resolution system.
              </p>
            </Section>

            <Section id="delivery" title="7. Delivery Services">
              <p>
                Ruby+ partners with third-party delivery providers (including
                Glovo/PandaGo and Kwik) to facilitate last-mile delivery for product
                orders.
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Delivery fees are calculated based on distance, vehicle type, and provider pricing.</li>
                <li>Estimated delivery times are provided as guidelines and are not guaranteed.</li>
                <li>Ruby+ is not liable for delays, damages, or losses caused by third-party delivery providers.</li>
                <li>Delivery availability depends on your location and the coverage area of delivery partners.</li>
              </ul>
            </Section>

            <Section id="payments" title="8. Payments">
              <p>
                All payments on the Platform are processed securely through
                <strong> Paystack</strong>, a PCI-DSS compliant payment processor.
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Supported payment methods include bank cards, bank transfers, USSD, and the Ruby+ Wallet.</li>
                <li>All prices are displayed and transacted in Nigerian Naira (NGN).</li>
                <li>The Ruby+ Wallet allows users to store funds for quick payments and receive refunds.</li>
                <li>Business payouts are processed to verified bank accounts on a regular schedule.</li>
                <li>Ruby+ charges a platform service fee on applicable transactions.</li>
              </ul>
            </Section>

            <Section id="reviews" title="9. Reviews & User Content">
              <p>Users may post reviews, ratings, reels (short videos), and comments on the Platform. By posting content, you:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Grant Ruby+ a non-exclusive, royalty-free, worldwide license to display, distribute, and promote your content on the Platform.</li>
                <li>Confirm that your content is truthful, not defamatory, and does not violate any third-party rights.</li>
                <li>Acknowledge that reviews and reels may be subject to admin review before being published.</li>
                <li>Agree that Ruby+ may remove content that violates community guidelines.</li>
              </ul>
            </Section>

            <Section id="ip" title="10. Intellectual Property">
              <p>
                The Ruby+ name, logo, branding, design, and software are the
                intellectual property of Ruby Aggregators Limited. You may not copy,
                reproduce, modify, or distribute any part of the Platform without prior
                written consent.
              </p>
              <p>
                Business logos, product images, and content uploaded by businesses remain
                the property of the respective business owners.
              </p>
            </Section>

            <Section id="liability" title="11. Limitation of Liability">
              <p>
                To the maximum extent permitted by Nigerian law:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>
                  Ruby+ acts as a marketplace facilitator and is not liable for the quality,
                  safety, or legality of products/services listed by businesses.
                </li>
                <li>
                  We are not responsible for disputes between customers and businesses, though
                  we provide a dispute resolution mechanism.
                </li>
                <li>
                  Ruby+ is not liable for any indirect, incidental, special, or consequential
                  damages arising from your use of the Platform.
                </li>
                <li>
                  Our total liability for any claim shall not exceed the amount you paid to
                  Ruby+ in the 12 months preceding the claim.
                </li>
              </ul>
            </Section>

            <Section id="disputes" title="12. Dispute Resolution">
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>
                  Disputes between customers and businesses should first be raised through the
                  in-app dispute system.
                </li>
                <li>
                  Ruby+ will review disputes and may mediate, but final resolution rests with
                  the parties involved.
                </li>
                <li>
                  If a dispute cannot be resolved informally, it shall be referred to
                  mediation or arbitration in accordance with Nigerian law.
                </li>
              </ul>
            </Section>

            <Section id="termination" title="13. Termination">
              <p>
                Ruby+ may suspend or terminate your account at any time, with or without
                notice, for violation of these Terms or for any other reason. Upon
                termination:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Your right to use the Platform ceases immediately.</li>
                <li>Outstanding orders, bookings, or payments will be handled on a case-by-case basis.</li>
                <li>You may request export of your personal data in accordance with our Privacy Policy.</li>
              </ul>
              <p>
                You may delete your account at any time through the app settings. Some
                data may be retained as required by law.
              </p>
            </Section>

            <Section id="governing-law" title="14. Governing Law">
              <p>
                These Terms are governed by and construed in accordance with the laws of
                the <strong>Federal Republic of Nigeria</strong>. Any legal proceedings
                shall be subject to the exclusive jurisdiction of Nigerian courts.
              </p>
            </Section>

            <Section id="contact" title="15. Contact">
              <p>
                For questions about these Terms, please contact us:
              </p>
              <div className="bg-gray-50 rounded-xl p-6 mt-3">
                <p className="font-semibold text-gray-800 mb-2">
                  Ruby Aggregators Limited
                </p>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>
                    Email:{" "}
                    <a
                      href="mailto:legal@rubyaggregators.com"
                      className="text-ruby-red hover:underline"
                    >
                      legal@rubyaggregators.com
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
