'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { configureLeafletIcons, createRubyMapMarkerIcon, type RubyMapMarkerKind } from './leaflet-icons';

export type LatLng = [number, number];

export interface LeafletMarker {
  id: string;
  position: LatLng;
  title?: string;
  description?: string;
  icon?: L.Icon | L.DivIcon;
  kind?: RubyMapMarkerKind;
  draggable?: boolean;
}

export interface LeafletCircle {
  center: LatLng;
  radius: number;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

export interface LeafletMapProps {
  center: LatLng;
  zoom?: number;
  markers?: LeafletMarker[];
  polylines?: LatLng[][];
  circle?: LeafletCircle;
  onMapClick?: (position: LatLng) => void;
  onMarkerDragEnd?: (id: string, position: LatLng) => void;
  fitToMarkers?: boolean;
  className?: string;
}

function FitBounds({ markers }: { markers: LeafletMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length < 2) return;
    map.fitBounds(L.latLngBounds(markers.map((marker) => marker.position)), {
      padding: [36, 36],
      maxZoom: 15,
    });
  }, [map, markers]);
  return null;
}

function ClickHandler({ onClick }: { onClick?: (position: LatLng) => void }) {
  useMapEvents({
    click(event) {
      onClick?.([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

export default function LeafletMap({
  center,
  zoom = 13,
  markers = [],
  polylines = [],
  circle,
  onMapClick,
  onMarkerDragEnd,
  fitToMarkers = false,
  className = 'h-72 w-full rounded-2xl',
}: LeafletMapProps) {
  configureLeafletIcons();

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className={className}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={onMapClick} />
      {fitToMarkers && <FitBounds markers={markers} />}
      {polylines.map((positions, index) => (
        <Polyline key={index} positions={positions} pathOptions={{ color: '#FD362F', weight: 4 }} />
      ))}
      {circle && (
        <Circle
          center={circle.center}
          radius={circle.radius}
          pathOptions={{
            color: circle.color ?? '#FD362F',
            fillColor: circle.fillColor ?? '#FD362F',
            fillOpacity: circle.fillOpacity ?? 0.12,
          }}
        />
      )}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={marker.position}
          // Always use an explicit SVG icon. This avoids Next.js asset-path
          // issues with Leaflet defaults and gives live delivery points
          // distinct visual identities.
          icon={marker.icon ?? createRubyMapMarkerIcon(marker.kind)}
          draggable={marker.draggable}
          eventHandlers={{
            dragend: (event) => {
              const position = event.target.getLatLng();
              onMarkerDragEnd?.(marker.id, [position.lat, position.lng]);
            },
          }}
        >
          {(marker.title || marker.description) && (
            <Popup>
              {marker.title && <strong>{marker.title}</strong>}
              {marker.description && <p className="mt-1">{marker.description}</p>}
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
