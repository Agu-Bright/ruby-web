import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import DeleteAccountContent from "@/components/account-deletion/DeleteAccountContent";

export const metadata = {
  title: "Delete Account | Ruby+",
  description:
    "Request deletion of your Ruby+ account and associated data. Learn what happens when you delete your account.",
};

export default function AccountDeletionPage() {
  return (
    <>
      <Navbar />
      <main>
        <DeleteAccountContent />
      </main>
      <Footer />
    </>
  );
}
