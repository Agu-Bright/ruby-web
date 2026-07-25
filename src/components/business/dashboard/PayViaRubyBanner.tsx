'use client';

/**
 * PayViaRubyBanner — merchant-facing "receive customer payments via Ruby+" nudge.
 *
 * Mirror of mobile `PayViaRubyBanner.tsx`. Links to the wallet QR (once M6
 * ships that page); for M1 it links to `/business/dashboard/wallet` and
 * the wallet page shows a "coming soon" until M6 lands.
 */

import Link from 'next/link';
import { QrCode, ArrowRight } from 'lucide-react';

export function PayViaRubyBanner() {
  return (
    <Link
      href="/business/dashboard/wallet/qr-code"
      className="block bg-gradient-to-br from-ruby-red to-red-700 rounded-xl p-5 text-white hover:opacity-95 transition"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <QrCode size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold mb-1">
            Receive customer payments through Ruby+
          </p>
          <p className="text-xs text-white/85 leading-relaxed">
            Share your Ruby Pay QR — customers scan, pay, and it lands
            in your wallet instantly. Zero card-machine fees.
          </p>
        </div>
        <ArrowRight size={20} className="shrink-0 opacity-80" />
      </div>
    </Link>
  );
}
