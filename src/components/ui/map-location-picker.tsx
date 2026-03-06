'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { useGeocoding, reverseGeocode, type ReverseGeocodeResult } from '@/lib/geocoding';
import 'leaflet/dist/leaflet.css';

// Custom red marker icon (ruby brand)
const createMarkerIcon = () =>
  L.divIcon({
    className: '',
    html: `<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26C32 7.163 24.837 0 16 0z" fill="#FD362F"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });

export interface MapLocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  onAddressResolved?: (address: ReverseGeocodeResult) => void;
  height?: string;
  zoom?: number;
  countryCode?: string;
}

// Sub-component: handles map click events
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Sub-component: recenters map when coordinates change externally
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevRef = useRef({ lat, lng });

  useEffect(() => {
    if (prevRef.current.lat !== lat || prevRef.current.lng !== lng) {
      map.flyTo([lat, lng], map.getZoom(), { duration: 0.5 });
      prevRef.current = { lat, lng };
    }
  }, [lat, lng, map]);

  return null;
}

// Sub-component: invalidates map size when it becomes visible
function MapSizeInvalidator() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Sub-component: draggable marker
function DraggableMarker({
  position,
  onDragEnd,
}: {
  position: [number, number];
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const icon = useMemo(() => createMarkerIcon(), []);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const { lat, lng } = marker.getLatLng();
          onDragEnd(lat, lng);
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      draggable
      position={position}
      ref={markerRef}
      eventHandlers={eventHandlers}
      icon={icon}
    />
  );
}

// Search overlay component
function SearchOverlay({
  countryCode,
  onSelect,
}: {
  countryCode?: string;
  onSelect: (lat: number, lng: number, displayName: string) => void;
}) {
  const { query, setQuery, results, isSearching, setCountryCode, clearResults } =
    useGeocoding(400);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (countryCode) setCountryCode(countryCode);
  }, [countryCode, setCountryCode]);

  useEffect(() => {
    setIsOpen(results.length > 0);
  }, [results]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute top-3 left-3 right-3 z-[1000]"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-ruby-500/30 focus:border-ruby-400"
          placeholder="Search for an address..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
        {!isSearching && query && (
          <button
            onClick={() => { clearResults(); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-2"
              onClick={() => {
                onSelect(r.lat, r.lng, r.displayName);
                clearResults();
                setIsOpen(false);
              }}
            >
              <MapPin className="w-3.5 h-3.5 text-ruby-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 line-clamp-2">{r.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MapLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  onAddressResolved,
  height = '300px',
  zoom = 13,
  countryCode = 'ng',
}: MapLocationPickerProps) {
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLocationChange = useCallback(
    (lat: number, lng: number) => {
      onLocationChange(lat, lng);

      // Debounced reverse geocode
      if (onAddressResolved) {
        if (reverseTimer.current) clearTimeout(reverseTimer.current);
        reverseTimer.current = setTimeout(async () => {
          const result = await reverseGeocode(lat, lng);
          if (result) onAddressResolved(result);
        }, 600);
      }
    },
    [onLocationChange, onAddressResolved]
  );

  const handleSearchSelect = useCallback(
    (lat: number, lng: number, _displayName: string) => {
      handleLocationChange(lat, lng);
    },
    [handleLocationChange]
  );

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-200" style={{ height }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DraggableMarker
          position={[latitude, longitude]}
          onDragEnd={(lat, lng) => handleLocationChange(lat, lng)}
        />
        <MapClickHandler onClick={(lat, lng) => handleLocationChange(lat, lng)} />
        <MapRecenter lat={latitude} lng={longitude} />
        <MapSizeInvalidator />
      </MapContainer>

      <SearchOverlay countryCode={countryCode} onSelect={handleSearchSelect} />

      {/* Coordinate display */}
      <div className="absolute bottom-2 right-2 z-[1000] bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[11px] text-gray-500 shadow-sm">
        {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </div>
    </div>
  );
}
