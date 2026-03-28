import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PrivacyHero from "@/components/privacy/PrivacyHero";
import PrivacyContent from "@/components/privacy/PrivacyContent";
import { CTASection } from "@/components/landing";

export const metadata = {
  title: "Privacy Policy | Ruby+",
  description:
    "Learn how Ruby+ collects, uses, and protects your personal information. Our commitment to data privacy and compliance with Nigerian data protection laws.",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main>
        <PrivacyHero />
        <PrivacyContent />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
