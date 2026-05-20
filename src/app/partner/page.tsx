import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PartnerHero from "@/components/partner/PartnerHero";
import PartnerTrustStrip from "@/components/partner/PartnerTrustStrip";
import HowItWorks from "@/components/partner/HowItWorks";
import CoreFeatures from "@/components/partner/CoreFeatures";
import AppShowcase from "@/components/partner/AppShowcase";
import CategoriesSupported from "@/components/partner/CategoriesSupported";
import PricingPromise from "@/components/partner/PricingPromise";
import MerchantTestimonials from "@/components/partner/MerchantTestimonials";
import PartnerFAQ from "@/components/partner/PartnerFAQ";
import FinalCTA from "@/components/partner/FinalCTA";

/**
 * Business-app landing page (Phase 19). Mirrors the consumer landing's
 * visual rhythm exactly — same Navbar, same Footer, same typography,
 * same ScrollReveal animation pattern, same `max-w-7xl` container,
 * same ruby-red accent. The sections below are merchant-targeted.
 *
 * Section ordering rationale (top → bottom):
 *   1. Hero  — primary CTA in the first frame
 *   2. TrustStrip — 4 quick proof points
 *   3. HowItWorks — 4-step journey from signup to first payout
 *   4. CoreFeatures — 6 benefit cards (the meat of the pitch)
 *   5. AppShowcase — phone mockups (the app made real)
 *   6. CategoriesSupported — "this is for you" breadth statement
 *   7. PricingPromise — the trust-killing question answered before they ask
 *   8. Testimonials — social proof (placeholders for V1)
 *   9. FAQ — handles the predictable follow-up questions
 *   10. FinalCTA — black-background closer with the same primary CTA as Hero
 */
export const metadata = {
  title: "Partner with Ruby+ | Grow Your Business in Nigeria",
  description:
    "Sell more, manage less. Daily auto-payout, multi-branch support, live order management, paid promotion via Ruby Ads. No setup fees. No monthly fees.",
  openGraph: {
    title: "Partner with Ruby+ | Grow Your Business in Nigeria",
    description:
      "Sell more, manage less. Daily auto-payout, multi-branch support, live order management, paid promotion via Ruby Ads.",
    type: "website",
  },
};

export default function PartnerPage() {
  return (
    <>
      <Navbar />
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
      <Footer />
    </>
  );
}
