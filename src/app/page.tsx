import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import RedStrip from '@/components/landing/RedStrip';
import Categories from '@/components/landing/Categories';
import StatsStrip from '@/components/landing/StatsStrip';
import FeaturedServices from '@/components/landing/FeaturedServices';
import WhyChoose from '@/components/landing/WhyChoose';
import ForPatrons from '@/components/landing/ForPatrons';
import ExploreRuby from '@/components/landing/ExploreRuby';
import ForBusinessOwners from '@/components/landing/ForBusinessOwners';
import CTASection from '@/components/landing/CTASection';
import Testimonials from '@/components/landing/Testimonials';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <RedStrip />
      <Categories />
      <StatsStrip />
      <FeaturedServices />
      <WhyChoose />
      <ForPatrons />
      <ExploreRuby />
      <ForBusinessOwners />
      <CTASection />
      <Testimonials />
      <Footer />
    </main>
  );
}