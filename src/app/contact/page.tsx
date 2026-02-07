import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ContactHero from "@/components/contact/ContactHero";
import RedStrip from "@/components/landing/RedStrip";
import ContactInfo from "@/components/contact/ContactInfo";
import ContactForm from "@/components/contact/ContactForm";
import { CTASection } from "@/components/landing";

export const metadata = {
  title: "Contact Us | Ruby+",
  description:
    "Get in touch with Ruby+. Questions, feedback, or partnership enquiries — we'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <ContactHero />
        <RedStrip />
        <ContactInfo />
        <ContactForm />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
