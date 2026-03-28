import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import TermsHero from "@/components/terms/TermsHero";
import TermsContent from "@/components/terms/TermsContent";
import { CTASection } from "@/components/landing";

export const metadata = {
  title: "Terms of Service | Ruby+",
  description:
    "Read the terms and conditions that govern your use of the Ruby+ marketplace platform. Understand your rights and responsibilities as a user or business.",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main>
        <TermsHero />
        <TermsContent />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
