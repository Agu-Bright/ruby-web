import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AboutHero from "@/components/about/AboutHero";
import MissionAndStats from "@/components/about/MissionAndStats";
import OurValues from "@/components/about/OurValues";
import { CTASection } from "@/components/landing";

export const metadata = {
  title: "About Us | Ruby+",
  description:
    "Learn about Ruby+ — Connecting Nigeria to the World. Our mission, values, and vision for diaspora Nigerians and tourists.",
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <AboutHero />
        <MissionAndStats />
        <OurValues />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
