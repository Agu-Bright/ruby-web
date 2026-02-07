import Image from "next/image";

const quickLinks = ["Home", "About Us", "Partner", "Blogs", "Contact Us"];
const utilityPages = [
  "FAQs",
  "Get Support",
  "Terms Of Service",
  "Privacy Policy",
  "Cookie Policy",
];

function SocialIcon({ d }: { d: string }) {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d={d} />
    </svg>
  );
}

const socialPaths = [
  {
    label: "Facebook",
    d: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z",
  },
  {
    label: "Twitter",
    d: "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z",
  },
  {
    label: "Instagram",
    d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  {
    label: "LinkedIn",
    d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
];

function SocialLinks() {
  return (
    <div className="flex items-center gap-2.5 mt-5">
      {socialPaths.map((s) => {
        return (
          <a
            key={s.label}
            href="#"
            aria-label={s.label}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-ruby-red hover:text-white transition-colors"
          >
            <SocialIcon d={s.d} />
          </a>
        );
      })}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative">
      <div className="absolute inset-0 bg-cover bg-center" />
      <div
        className="absolute inset-0"
        style={{ background: "black" }}
      />

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
            {/* Column 1 — Logo + Newsletter */}
            <div className="lg:col-span-1">
              <Image
                src="/images/logo.png"
                alt="Ruby+"
                width={120}
                height={40}
                className="h-8 w-auto brightness-0 invert mb-4"
              />
              <p className="text-[11px] text-white/50 leading-relaxed mb-6">
                Connecting Diaspora Nigerians And Tourists With Authentic
                Nigerian Experiences. Your Trusted Platform For Discovering,
                Exploring And Enjoying Nigeria.
              </p>
              <h4 className="text-sm font-semibold text-white mb-3">
                Join Our Newsletter
              </h4>
              <div className="flex items-stretch">
                <input
                  type="email"
                  placeholder="Enter your mail"
                  className="flex-1 min-w-0 px-3 py-2 text-xs bg-white/10 border border-white/20 rounded-l-lg text-white placeholder-white/30 outline-none focus:border-white/40 transition-colors"
                />
                <button className="px-3 py-2 bg-ruby-red rounded-r-lg hover:bg-red-600 transition-colors">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </button>
              </div>
              <SocialLinks />
            </div>

            {/* Column 2 — Quick Links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">
                Quick Links
              </h4>
              <ul className="space-y-2.5">
                {quickLinks.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-xs text-white/50 hover:text-ruby-red transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 — Utility Pages */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">
                Utility Pages
              </h4>
              <ul className="space-y-2.5">
                {utilityPages.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-xs text-white/50 hover:text-ruby-red transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4 — Information */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">
                Information
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 text-ruby-red shrink-0 mt-0.5"
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
                  <span className="text-xs text-white/50 leading-relaxed">
                    E1B Got Oboh Drive,
                    <br />
                    VI, Lagos.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 text-ruby-red shrink-0 mt-0.5"
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
                  <span className="text-xs text-white/50 leading-relaxed">
                    +234-816-903-8184,
                    <br />
                    +1-647-461-8728
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 text-ruby-red shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-xs text-white/50 leading-relaxed">
                    Mon – Sat: 8 Am – 5 Pm,
                    <br />
                    Sunday: CLOSED
                  </span>
                </li>
              </ul>
            </div>

            {/* Column 5 — Download App */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">
                Download App
              </h4>
              <div className="space-y-3">
                <a
                  href="#"
                  className="flex items-center gap-2.5 w-fit px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div>
                    <div className="text-[9px] text-white/50 leading-none">
                      Coming Soon on
                    </div>
                    <div className="text-xs font-semibold text-white leading-tight">
                      App Store
                    </div>
                  </div>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2.5 w-fit px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 01-.609-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.4 13.195l2.298-3.687zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z" />
                  </svg>
                  <div>
                    <div className="text-[9px] text-white/50 leading-none">
                      Coming Soon on
                    </div>
                    <div className="text-xs font-semibold text-white leading-tight">
                      Google Play
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <p className="text-center text-[11px] text-white/40">
              Copyright © 2026 Ruby+. All Rights Reserved. Proudly Connecting
              Nigeria With The World.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
