/**
 * P153 web parity — build the wa.me URL for the CAC-registration
 * WhatsApp lead thread. Mirrors the mobile helper
 * `buildCacRegistrationWhatsAppUrl` in `ruby-business-app/src/constants/support.ts`.
 *
 * The message identifies as "Hi rubyplus team" — the customer thinks
 * they're talking to Ruby+ throughout even though internal routing may
 * hand it off to a registration partner.
 */

export interface CacRegistrationConfig {
  whatsappPhone?: string;
  cacRegistrationWhatsAppNumber?: string;
}

export interface CacRegistrationContext {
  businessName?: string | null;
  phone?: string | null;
  city?: string | null;
}

export function buildCacRegistrationWhatsAppUrl(
  config: CacRegistrationConfig,
  context: CacRegistrationContext,
): string {
  // Prefer the dedicated CAC number; fall back to the main support
  // number so the offer works even when ops hasn't set a separate
  // WhatsApp for it yet.
  const rawPhone =
    config.cacRegistrationWhatsAppNumber || config.whatsappPhone || '';
  const phone = rawPhone.replace(/\D/g, '');

  const name = context.businessName?.trim();
  const merchantPhone = context.phone?.trim();
  const city = context.city?.trim();

  const parts = ['Hi rubyplus team, I want to register'];
  parts.push(name ? name : 'my business');
  parts.push('on CAC.');
  if (merchantPhone) parts.push(`My phone: ${merchantPhone}.`);
  if (city) parts.push(`City: ${city}.`);
  parts.push('Please help me start the process.');

  const text = encodeURIComponent(parts.join(' '));
  return `https://wa.me/${phone}?text=${text}`;
}
