import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import DeleteAccountHero from "@/components/delete-account/DeleteAccountHero";
import DeleteAccountContent from "@/components/delete-account/DeleteAccountContent";
import { CTASection } from "@/components/landing";

export const metadata = {
  title: "Delete Your Account | Ruby+",
  description:
    "Request deletion of your Ruby+ Customer App account and associated data. Learn what is deleted, what is retained, and how long retention applies.",
};

export default function DeleteAccountPage() {
  return (
    <>
      <Navbar />
      <main>
        <DeleteAccountHero />
        <DeleteAccountContent />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
