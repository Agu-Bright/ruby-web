'use client';

/**
 * CacRegistrationCard — web parity of mobile `HelpMeRegisterCard` (P153).
 *
 * Renders a purple "Register your business with CAC" card that opens
 * WhatsApp with a pre-filled message when tapped. The Ruby+ ops team
 * takes over from there — no in-app form, no payment, no queue.
 *
 * Visibility: unconditionally shown for the current rollout — every
 * merchant sees the offer regardless of admin toggle or existing CAC
 * status. Reintroduce `config.cacRegistrationEnabled` + `hasCac` gates
 * here later if we want to hide it for merchants who've already
 * registered or if ops disables the offer.
 */

import { useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from '@/lib/business-api/hooks';
import { api } from '@/lib/api';
import { buildCacRegistrationWhatsAppUrl } from '@/lib/business-support/cac-registration';
import { CacIllustration } from './CacIllustration';

type Surface = 'home' | 'pending_review';

interface Props {
  surface: Surface;
}

export function CacRegistrationCard({ surface }: Props) {
  const { business } = useBusinessAuth();

  const fetcher = useCallback(() => api.businessMerchantSupport.config(), []);
  const { data: config } = useBusinessQuery(fetcher, []);

  const handleClick = () => {
    const url = buildCacRegistrationWhatsAppUrl(
      {
        whatsappPhone: config?.whatsappPhone,
        cacRegistrationWhatsAppNumber: config?.cacRegistrationWhatsAppNumber,
      },
      {
        businessName: business?.name,
        phone: business?.phone,
        city: business?.city,
      },
    );
    try {
      // eslint-disable-next-line no-console
      console.info('[cac] opening whatsapp lead', {
        surface,
        businessId: business?._id,
      });
    } catch {
      // Analytics/logging must never block the WhatsApp hand-off.
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const pitch =
    config?.cacRegistrationPitch ||
    'No CAC yet? The Ruby+ team can register your business for you. Tap to chat.';

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mt-4 flex w-full items-center gap-4 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/40 to-white p-4 text-left transition hover:border-purple-300 hover:shadow-sm"
    >
      <CacIllustration size={64} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="mb-0.5 block text-sm font-semibold text-gray-900">
          Register your business with CAC
        </span>
        <span className="block text-xs leading-relaxed text-gray-500">
          {pitch}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-gray-400" />
    </button>
  );
}
