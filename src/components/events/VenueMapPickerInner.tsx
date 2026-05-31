'use client';

import React, { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Phase 60 — inner Leaflet map. Separated from VenueMapPicker so the
 * parent stays SSR-safe (dynamic({ ssr: false }) wraps THIS file).
 *
 * Two interactions:
 *   - Click anywhere on the map → place / move the pin
 *   - Drag the existing pin → fine-tune position
 *
 * When `value` updates from the parent (e.g. geocoder search hit), we
 * also imperatively pan the map to the new pin so the admin sees it.
 */

// Leaflet's default marker icon URLs reference paths from inside its
// own dist folder, which break under Next.js's bundler. Override with
// CDN-hosted icons so the marker actually renders.
const DEFAULT_ICON = L.icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  value: [number, number] | null; // [lng, lat]
  onChange: (coords: [number, number] | null) => void;
  center: { lat: number; lng: number };
}

function ClickToPin({
  onChange,
}: {
  onChange: (coords: [number, number]) => void;
}) {
  useMapEvents({
    click: (e) => {
      onChange([e.latlng.lng, e.latlng.lat]);
    },
  });
  return null;
}

function PanTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const last = useRef<string>('');
  useEffect(() => {
    const key = `${lat},${lng}`;
    if (key === last.current) return;
    last.current = key;
    // setView keeps the current zoom level so the admin doesn't lose
    // their orientation when a geocoder hit lands.
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
  }, [lat, lng, map]);
  return null;
}

const VenueMapPickerInner: React.FC<Props> = ({ value, onChange, center }) => {
  const pin = value ? { lat: value[1], lng: value[0] } : null;

  return (
    <div
      className="rounded-md overflow-hidden border border-gray-300"
      style={{ height: 280 }}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={pin ? 15 : 12}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPin onChange={onChange} />
        {pin && (
          <>
            <PanTo lat={pin.lat} lng={pin.lng} />
            <Marker
              position={[pin.lat, pin.lng]}
              icon={DEFAULT_ICON}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const ll = m.getLatLng();
                  onChange([ll.lng, ll.lat]);
                },
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default VenueMapPickerInner;
