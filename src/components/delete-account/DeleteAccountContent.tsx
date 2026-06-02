import ScrollReveal from "../landing/ScrollReveal";

const CONTACT_EMAIL = "it@rubyplus.net";
const SUPPORT_PHONE = "+234 813 664 7819";

export default function DeleteAccountContent() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Intro */}
        <ScrollReveal>
          <div className="mb-12">
            <p className="text-sm text-gray-500 mb-2">
              App: <span className="font-semibold text-ruby-black">Ruby+ Customer App</span>{" "}
              · Developer:{" "}
              <span className="font-semibold text-ruby-black">
                Ruby Aggregators Limited
              </span>
            </p>
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-ruby-black mb-4">
              How to delete your Ruby+ account
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              You can ask us to delete your Ruby+ Customer App account and the
              personal data associated with it at any time. There are two ways
              to request deletion: directly from inside the app, or by emailing
              our privacy team. Both methods are processed within{" "}
              <span className="font-semibold text-ruby-black">30 days</span> of
              receipt, in line with the Nigeria Data Protection Act 2023.
            </p>
          </div>
        </ScrollReveal>

        {/* Option 1: In-app */}
        <ScrollReveal>
          <div className="mb-10">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-ruby-red flex items-center justify-center shrink-0 font-bold">
                1
              </div>
              <div>
                <h3 className="font-playfair text-xl sm:text-2xl font-bold text-ruby-black mb-1">
                  Option A — Delete from inside the app (recommended)
                </h3>
                <p className="text-sm text-gray-500">
                  The fastest way. Takes about 30 seconds.
                </p>
              </div>
            </div>

            <ol className="ml-14 space-y-2.5 text-sm sm:text-base text-gray-700 leading-relaxed list-decimal list-outside pl-2">
              <li>
                Open the <span className="font-semibold">Ruby+ Customer App</span> on your
                phone.
              </li>
              <li>
                Sign in to the account you want to delete.
              </li>
              <li>
                Tap the <span className="font-semibold">Profile</span> tab at the
                bottom of the screen.
              </li>
              <li>
                Tap <span className="font-semibold">Settings</span>, then{" "}
                <span className="font-semibold">Account</span>.
              </li>
              <li>
                Tap{" "}
                <span className="font-semibold text-ruby-red">
                  Delete my account
                </span>
                .
              </li>
              <li>
                Confirm the action when prompted. You will receive an in-app
                confirmation that your deletion request has been logged.
              </li>
            </ol>
          </div>
        </ScrollReveal>

        {/* Option 2: Email */}
        <ScrollReveal>
          <div className="mb-12">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-ruby-red flex items-center justify-center shrink-0 font-bold">
                2
              </div>
              <div>
                <h3 className="font-playfair text-xl sm:text-2xl font-bold text-ruby-black mb-1">
                  Option B — Email our privacy team
                </h3>
                <p className="text-sm text-gray-500">
                  Use this if you no longer have access to the app or your
                  account.
                </p>
              </div>
            </div>

            <div className="ml-14 space-y-3 text-sm sm:text-base text-gray-700 leading-relaxed">
              <p>
                Send an email to{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Account%20Deletion%20Request%20%E2%80%94%20Ruby%2B%20Customer%20App`}
                  className="text-ruby-red font-semibold hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>{" "}
                from the email address registered to your Ruby+ account, with
                the following information:
              </p>
              <ul className="list-disc list-outside pl-5 space-y-1.5">
                <li>Subject line: <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">Account Deletion Request — Ruby+ Customer App</span></li>
                <li>Your registered email address</li>
                <li>Your registered phone number (for identity verification)</li>
                <li>Your full name as it appears on the account</li>
                <li>
                  A brief confirmation: <em>&ldquo;I request deletion of my
                  Ruby+ Customer App account and personal data.&rdquo;</em>
                </li>
              </ul>
              <p className="text-xs text-gray-500 italic">
                We may contact you once to verify your identity before
                processing the request. Verification keeps your account safe
                from unauthorised deletion.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* What gets deleted */}
        <ScrollReveal>
          <div className="mb-10 p-6 sm:p-8 rounded-2xl border border-red-100 bg-red-50/40">
            <h3 className="font-playfair text-xl sm:text-2xl font-bold text-ruby-black mb-3">
              What we delete immediately
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The following personal data is permanently deleted from our active
              systems within 30 days of your request:
            </p>
            <ul className="space-y-2 text-sm sm:text-base text-gray-700 leading-relaxed">
              {[
                "Profile information (name, email, phone, date of birth, profile photo, saved addresses)",
                "Login credentials, sessions, refresh tokens, and password hash",
                "Saved favourites, bookmarks, and recently-viewed businesses",
                "Search and browsing history within the app",
                "Push-notification device tokens",
                "Stored payment cards and saved bank account details (tokens deleted from our systems and our payment processors)",
                "Wallet balance — refunded to your registered bank account before the wallet is closed",
                "App preferences, notification settings, and language/currency choices",
                "Personalisation signals (recommendation embeddings, behavioural data used by Ask Ruby and other features)",
                "Reviews you authored — your name is removed and the review is anonymised",
                "Conversation history with the Ask Ruby AI concierge",
                "Direct messages with merchants and Ruby+ support",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-ruby-red shrink-0 mt-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>

        {/* What's kept */}
        <ScrollReveal>
          <div className="mb-10 p-6 sm:p-8 rounded-2xl border border-amber-100 bg-amber-50/40">
            <h3 className="font-playfair text-xl sm:text-2xl font-bold text-ruby-black mb-3">
              What we are required to keep (and for how long)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Nigerian tax, accounting, and consumer-protection laws require
              us to retain some records even after account deletion. These
              records are anonymised (your name and contact details are
              removed) and held only for the periods below:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-amber-200">
                    <th className="text-left py-3 pr-4 font-semibold text-ruby-black">
                      Data type
                    </th>
                    <th className="text-left py-3 pr-4 font-semibold text-ruby-black">
                      Retention period
                    </th>
                    <th className="text-left py-3 font-semibold text-ruby-black">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {[
                    {
                      type: "Order and booking records (anonymised)",
                      period: "Up to 7 years",
                      reason: "Tax law (FIRS) and accounting obligations",
                    },
                    {
                      type: "Payment transaction records (anonymised)",
                      period: "Up to 7 years",
                      reason: "Anti-money-laundering (CBN) and audit",
                    },
                    {
                      type: "Dispute and refund records",
                      period: "Up to 7 years",
                      reason:
                        "Consumer protection and ongoing dispute resolution",
                    },
                    {
                      type: "Reviews left for businesses (anonymised)",
                      period: "Indefinite",
                      reason:
                        "Protect other users who rely on review history",
                    },
                    {
                      type: "Security and fraud-prevention logs",
                      period: "Up to 12 months",
                      reason:
                        "Detect and investigate fraudulent activity on the platform",
                    },
                    {
                      type: "Aggregate analytics (non-identifiable)",
                      period: "Indefinite",
                      reason:
                        "Platform improvement — cannot be linked back to you",
                    },
                  ].map((row) => (
                    <tr
                      key={row.type}
                      className="border-b border-amber-100 last:border-b-0"
                    >
                      <td className="py-3 pr-4 align-top">{row.type}</td>
                      <td className="py-3 pr-4 align-top font-semibold whitespace-nowrap">
                        {row.period}
                      </td>
                      <td className="py-3 align-top text-gray-600">
                        {row.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>

        {/* Before you delete */}
        <ScrollReveal>
          <div className="mb-10">
            <h3 className="font-playfair text-xl sm:text-2xl font-bold text-ruby-black mb-4">
              Before you delete — a few things to check
            </h3>
            <ul className="space-y-3 text-sm sm:text-base text-gray-700 leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-ruby-red mt-2.5 shrink-0" />
                <span>
                  <span className="font-semibold">Withdraw any wallet
                  balance.</span>{" "}
                  Any positive balance remaining at the time of deletion will
                  be refunded to your registered bank account before the wallet
                  is closed. Refunds typically settle within 5 working days.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-ruby-red mt-2.5 shrink-0" />
                <span>
                  <span className="font-semibold">
                    Complete or cancel active orders and bookings.
                  </span>{" "}
                  We cannot delete an account that has open orders, bookings,
                  or unresolved disputes. Please complete or cancel them first.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-ruby-red mt-2.5 shrink-0" />
                <span>
                  <span className="font-semibold">Account deletion is
                  permanent.</span>{" "}
                  Once deleted, your account cannot be restored. You are free
                  to create a new account at any time, but past favourites,
                  history, and wallet balance cannot be carried over.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-ruby-red mt-2.5 shrink-0" />
                <span>
                  <span className="font-semibold">
                    Business owners — note.
                  </span>{" "}
                  If you also operate a business on the Ruby+ Business App,
                  that is a separate account with its own deletion process.
                  This page covers customer accounts only.
                </span>
              </li>
            </ul>
          </div>
        </ScrollReveal>

        {/* Help / contact */}
        <ScrollReveal>
          <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-ruby-black text-white">
            <h3 className="font-playfair text-xl sm:text-2xl font-bold mb-3">
              Need help or have questions?
            </h3>
            <p className="text-sm text-white/70 mb-5 leading-relaxed">
              If you have questions about deletion, your data, or your rights
              under the Nigeria Data Protection Act 2023, our team is here to
              help.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">
                  Email
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-white hover:text-ruby-red transition-colors font-medium"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">
                  Phone (Mon–Fri, 9am–5pm WAT)
                </p>
                <a
                  href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
                  className="text-white hover:text-ruby-red transition-colors font-medium"
                >
                  {SUPPORT_PHONE}
                </a>
              </div>
            </div>
            <p className="text-xs text-white/40 mt-6">
              Ruby Aggregators Limited · E1B Gat Oboh Drive, Victoria Island,
              Oniru, Lagos, Nigeria.
            </p>
          </div>
        </ScrollReveal>

        {/* Last updated */}
        <ScrollReveal>
          <p className="mt-8 text-xs text-gray-400 text-center">
            Last updated: April 2026 · This page applies to the Ruby+ Customer
            App on iOS and Android.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
