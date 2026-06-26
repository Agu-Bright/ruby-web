import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import RedStrip from '@/components/landing/RedStrip';
import Categories from '@/components/landing/Categories';
import StatsStrip from '@/components/landing/StatsStrip';
import FeaturedServices from '@/components/landing/FeaturedServices';
import PrimeBannerCarousel from '@/components/landing/PrimeBannerCarousel';
import WhyChoose from '@/components/landing/WhyChoose';
import ForPatrons from '@/components/landing/ForPatrons';
import ExploreRuby from '@/components/landing/ExploreRuby';
import ForBusinessOwners from '@/components/landing/ForBusinessOwners';
import CTASection from '@/components/landing/CTASection';
import Testimonials from '@/components/landing/Testimonials';
import Footer from '@/components/landing/Footer';
// P128-LAND — shared "currently picked city" state for the location
// picker in RedStrip + the Lagos-by-default data fetches in
// FeaturedServices + ExploreRuby. Defaults to Lagos on first load.
import { SelectedLocationProvider } from '@/lib/selected-location';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <SelectedLocationProvider>
        <Navbar />
        <Hero />
        <RedStrip />
        <Categories />
        <StatsStrip />
        <FeaturedServices />
        {/* P120-E2 — Prime tier banner carousel. Renders nothing when no
            Prime merchants in any city have an approved banner. */}
        <PrimeBannerCarousel />
        <WhyChoose />
        <ForPatrons />
        <ExploreRuby />
        <ForBusinessOwners />
        <CTASection />
        <Testimonials />
        <Footer />
      </SelectedLocationProvider>
    </main>
  );
}