'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Smartphone, Apple, Download } from 'lucide-react';

export default function BusinessSuccessPage() {
  const appStoreUrl = 'https://apps.apple.com/app/ruby-business/id6742752498';
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.rubyplus.business';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto flex items-center">
          <Link href="/" className="flex items-center">
            <Image src="/images/logo.png" alt="Ruby+" width={110} height={36} className="h-9 w-auto object-contain" priority />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg text-center">
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-3">Account created!</h1>
          <p className="text-lg text-gray-600 mb-10">
            Your Ruby+ Business account is ready. Download the app to complete your business setup.
          </p>

          {/* Steps */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 text-left">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Next steps</h2>
            <ol className="space-y-3">
              {[
                'Download the Ruby+ Business app',
                'Sign in with the email and password you just created',
                'Complete your business profile (name, category, location, etc.)',
                'Start accepting orders and bookings',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-ruby-red/10 text-ruby-red font-semibold text-sm flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-gray-700 pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Download buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <a
              href={appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 bg-black text-white px-6 py-4 rounded-xl hover:bg-gray-900 transition-colors"
            >
              <Apple className="w-6 h-6" />
              <div className="text-left">
                <p className="text-[10px] leading-none opacity-80">Download on the</p>
                <p className="text-base font-semibold leading-tight mt-0.5">App Store</p>
              </div>
            </a>
            <a
              href={playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 bg-black text-white px-6 py-4 rounded-xl hover:bg-gray-900 transition-colors"
            >
              <Smartphone className="w-6 h-6" />
              <div className="text-left">
                <p className="text-[10px] leading-none opacity-80">GET IT ON</p>
                <p className="text-base font-semibold leading-tight mt-0.5">Google Play</p>
              </div>
            </a>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <Download className="w-4 h-4" />
            Back to homepage
          </Link>
        </div>
      </main>
    </div>
  );
}
