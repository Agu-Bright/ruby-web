'use client';

import L from 'leaflet';

export type RubyMapMarkerKind = 'pickup' | 'rider' | 'destination' | 'default';

/**
 * SVG div-icons avoid Next.js asset-path issues and make each operational
 * point instantly recognisable: Ruby+ pickup, moving rider, and customer.
 */
export function createRubyMapMarkerIcon(kind: RubyMapMarkerKind = 'default'): L.DivIcon {
  const artwork: Record<RubyMapMarkerKind, string> = {
    pickup: '<path d="M16 2C9.4 2 4 7.2 4 13.7c0 9.2 12 18.3 12 18.3s12-9.1 12-18.3C28 7.2 22.6 2 16 2Z" fill="#FD362F"/><path d="M11 14h10M13 11v6M19 11v6" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    rider: '<circle cx="16" cy="16" r="14" fill="#1267D6" stroke="white" stroke-width="3"/><path d="M8.5 18.5h2.2l2.4-5h4.3l2.2 5H23M11 13.5 9.5 11M17.5 13.5l1.2-2.5M12.2 20.5a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2Zm8 0a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2Z" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    destination: '<path d="M16 2C9.4 2 4 7.2 4 13.7c0 9.2 12 18.3 12 18.3s12-9.1 12-18.3C28 7.2 22.6 2 16 2Z" fill="#6D28D9"/><circle cx="16" cy="14" r="4.5" fill="white"/><path d="m14.1 14 1.3 1.3 2.7-3" fill="none" stroke="#6D28D9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    default: '<path d="M16 2C9.4 2 4 7.2 4 13.7c0 9.2 12 18.3 12 18.3s12-9.1 12-18.3C28 7.2 22.6 2 16 2Z" fill="#FD362F"/><circle cx="16" cy="14" r="4.5" fill="white"/>',
  };
  return L.divIcon({
    className: 'ruby-map-marker',
    html: `<svg width="38" height="42" viewBox="0 0 32 34" fill="none" aria-hidden="true">${artwork[kind]}</svg>`,
    iconSize: [38, 42],
    iconAnchor: [19, kind === 'rider' ? 19 : 40],
    popupAnchor: [0, kind === 'rider' ? -20 : -40],
  });
}

/**
 * Leaflet's default marker URLs are not resolved correctly by Next.js bundles.
 * Apply this once from the SSR-disabled map component before rendering markers.
 */
let configured = false;

export function configureLeafletIcons() {
  if (configured || typeof window === 'undefined') return;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
  configured = true;
}
