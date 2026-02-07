import type { Metadata } from 'next';
import { Poppins, Playfair_Display } from 'next/font/google';
import '@/styles/globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ruby+ | Connecting the World to Verified Nigerian Businesses',
  description:
    'Discover trusted Nigerian brands, products, and services. Ruby+ enables businesses to reach a global audience.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${playfair.variable}`}>
      <body className="font-poppins antialiased">{children}</body>
    </html>
  );
}