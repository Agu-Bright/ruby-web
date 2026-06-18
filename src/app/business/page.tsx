import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import PartnerHero from '@/components/partner/PartnerHero';
import PartnerTrustStrip from '@/components/partner/PartnerTrustStrip';
import HowItWorks from '@/components/partner/HowItWorks';
import CoreFeatures from '@/components/partner/CoreFeatures';
import AppShowcase from '@/components/partner/AppShowcase';
import CategoriesSupported from '@/components/partner/CategoriesSupported';
import PricingPromise from '@/components/partner/PricingPromise';
import MerchantTestimonials from '@/components/partner/MerchantTestimonials';
import PartnerFAQ from '@/components/partner/PartnerFAQ';
import FinalCTA from '@/components/partner/FinalCTA';

/**
 * Business landing page — rendered AT `business.rubyplus.net` (the
 * middleware rewrites that host's root to `/business`, which this file
 * serves).
 *
 * Previously this `redirect('/register')`d, dumping first-time merchants
 * onto a bare signup form with no context. Now the business subdomain
 * shows the full landing: hero, trust strip, how-it-works, feature grid,
 * app showcase, supported categories, pricing promise, testimonials,
 * FAQ, and a closing CTA.
 *
 * P107 — "Register your business" web-flow CTAs removed from PartnerHero
 * and FinalCTA. Merchant onboarding flows through the mobile apps; the
 * App Store / Google Play badges on the landing are the only entry point.
 * The web `/register` route still works (deep links / business app
 * fallback) but is no longer surfaced from the landing.
 *
 * This reuses the EXACT same section components as `rubyplus.net/partner`
 * — one set of marketing sections, two hosts that surface them. The only
 * difference is `crossDomain` on the shared Navbar + Footer: on this
 * subdomain their marketing nav items (Home / About / Partner / Contact /
 * Quick Links) point at the apex `rubyplus.net` with absolute URLs,
 * because a relative `/about` here would 404 under the business
 * subdomain's middleware rewrite (`/business/about`).
 *
 * Architecture:
 *   rubyplus.net           → consumer landing  (app/page.tsx)
 *   rubyplus.net/partner   → business landing  (app/partner/page.tsx)
 *   business.rubyplus.net  → business landing  (THIS file — same sections)
 *
 * Keeping `/partner` alive means in-site links from the consumer nav
 * ("Partner") still work, and SEO / existing backlinks to /partner are
 * preserved. Both surfaces render identical content.
 */
export const metadata = {
  title: 'Sell on Ruby+ | Grow Your Business in Nigeria',
  description:
    'Sell more, manage less. Daily auto-payout, multi-branch support, live order management, paid promotion via Ruby Ads. No setup fees. No monthly fees.',
  openGraph: {
    title: 'Sell on Ruby+ | Grow Your Business in Nigeria',
    description:
      'Sell more, manage less. Daily auto-payout, multi-branch support, live order management, paid promotion via Ruby Ads.',
    type: 'website',
  },
};

export default function BusinessLandingPage() {
  return (
    <>
      <Navbar crossDomain />
      <main>
        <PartnerHero />
        <PartnerTrustStrip />
        <HowItWorks />
        <CoreFeatures />
        <AppShowcase />
        <CategoriesSupported />
        <PricingPromise />
        <MerchantTestimonials />
        <PartnerFAQ />
        <FinalCTA />
      </main>
      <Footer crossDomain />
    </>
  );
}
