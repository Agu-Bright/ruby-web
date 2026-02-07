import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PartnerHero from "@/components/partner/PartnerHero";
import StatsStrip from "@/components/landing/StatsStrip";
import ForBusinessOwners from "@/components/landing/ForBusinessOwners";
import Testimonials from "@/components/landing/Testimonials";

export const metadata = {
  title: "Partner with Ruby+ | Grow Your Business",
  description:
    "Join Ruby+ as a business partner. Manage your online presence, track performance, and reach more customers.",
};

export default function PartnerPage() {
  return (
    <>
      <Navbar />
      <main>
        <PartnerHero />
        <StatsStrip />
        <ForBusinessOwners />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}
