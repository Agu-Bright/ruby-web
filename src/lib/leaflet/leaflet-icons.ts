'use client';

import L from 'leaflet';

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
