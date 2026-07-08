'use client';

/**
 * Businesses cluster map.
 *
 * Renders every LIVE (or filtered) business on a Leaflet map, clustered
 * by proximity so a Lagos-density blob doesn't collapse into a solid
 * cluster of pins. Each cluster shows its count; on click it zooms in.
 * Individual markers pop a small card with the business name, status,
 * category, and a link back to the list-view detail modal.
 *
 * Kept as a standalone client component so `next/dynamic` can import it
 * with `{ ssr: false }` from the admin page — Leaflet touches `window`
 * on mount and blows up under Next.js server rendering otherwise.
 */

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Marker-cluster styles ship with the underlying `leaflet.markercluster`
// package. `react-leaflet-cluster` used to re-export them at
// `react-leaflet-cluster/lib/assets/*`, but v3 dropped that path and
// Next.js webpack fails the production build ("Module not found"). Use
// the canonical path from the peer package instead — always works,
// works for future versions.
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Business, BusinessStatus } from '@/lib/types';
import {
  getCategoryName,
  getLocationName,
  getOwnerName,
} from '@/lib/utils';

export interface BusinessesClusterMapProps {
  businesses: Business[];
  /** Fires when a marker's popup "View details" is tapped. Parent can
   *  route to the list page with `?openId=<id>` so the existing detail
   *  modal opens on return. */
  onSelectBusiness?: (business: Business) => void;
  /** Height of the map container. Default fills the parent. */
  height?: string;
}

/**
 * Nigeria center — used as the default view when we have no
 * businesses to fit to (empty state, still-loading). Roughly the
 * geographic centroid of the country.
 */
const NIGERIA_CENTER: [number, number] = [9.082, 8.6753];
const DEFAULT_ZOOM = 6;

/**
 * Status → hex colour lookup for the marker fill. Matches the existing
 * StatusBadge palette so admins get consistent visual cues across
 * list, detail, and map views.
 */
const STATUS_COLOURS: Record<BusinessStatus, string> = {
  DRAFT: '#6B7280', // gray-500
  PENDING_REVIEW: '#F59E0B', // amber-500
  APPROVED: '#3B82F6', // blue-500
  LIVE: '#10B981', // emerald-500
  REJECTED: '#EF4444', // red-500
  SUSPENDED: '#B91C1C', // red-700
};

/** Builds a colour-coded circular divIcon per business status. */
function buildMarkerIcon(status: BusinessStatus): L.DivIcon {
  const colour = STATUS_COLOURS[status] || '#6B7280';
  return L.divIcon({
    className: 'ruby-business-marker',
    html: `
      <span style="
        display:block;
        width:22px;
        height:22px;
        border-radius:50%;
        background:${colour};
        border:3px solid #ffffff;
        box-shadow:0 1px 4px rgba(0,0,0,0.35);
      "></span>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

/**
 * FitBounds sub-component. On mount + when the marker set changes,
 * pans/zooms the map so every marker is visible. Runs inside the
 * MapContainer so it can grab the map instance via `useMap()`.
 */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const prevKey = useRef<string>('');

  useEffect(() => {
    if (points.length === 0) return;
    // Cheap change-detection key — join lat/lng pairs so we only refit
    // when the actual points move. Prevents refit-thrash when the parent
    // re-renders for unrelated reasons.
    const key = points.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join('|');
    if (key === prevKey.current) return;
    prevKey.current = key;

    if (points.length === 1) {
      map.setView(points[0], 13, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);

  return null;
}

export function BusinessesClusterMap({
  businesses,
  onSelectBusiness,
  height = '100%',
}: BusinessesClusterMapProps) {
  // Filter to businesses that have a real geoPoint. Anything else can't
  // be plotted — the parent counts them separately for the health card.
  const plottable = useMemo(
    () =>
      businesses.filter((b) => {
        const c = b.geoPoint?.coordinates;
        return (
          Array.isArray(c) &&
          c.length === 2 &&
          typeof c[0] === 'number' &&
          typeof c[1] === 'number' &&
          !Number.isNaN(c[0]) &&
          !Number.isNaN(c[1]) &&
          // Nigeria-ish sanity check — any coord outside [-90,90] lat or
          // [-180,180] lng is corrupt data (we've seen a business with
          // 8961 km away). Silently drop it here rather than throwing
          // the marker somewhere in the North Atlantic.
          Math.abs(c[1]) <= 90 &&
          Math.abs(c[0]) <= 180
        );
      }),
    [businesses],
  );

  const points = useMemo<[number, number][]>(
    () =>
      plottable.map((b) => [
        b.geoPoint!.coordinates[1], // lat (GeoJSON is [lng, lat])
        b.geoPoint!.coordinates[0], // lng
      ]),
    [plottable],
  );

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        center={NIGERIA_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', borderRadius: 8 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
          {plottable.map((b) => {
            const lat = b.geoPoint!.coordinates[1];
            const lng = b.geoPoint!.coordinates[0];
            const status = b.status || 'DRAFT';
            const icon = buildMarkerIcon(status);
            const categoryName = getCategoryName(b.categoryId);
            const locationName = getLocationName(b.locationId);
            const ownerName = getOwnerName(b.ownerId);
            return (
              // We render Leaflet Markers as raw L.marker() instances
              // via the plugin's Marker; using MarkerClusterGroup + our
              // own Popup handling would require react-leaflet primitives
              // inside the cluster group, which the current plugin
              // supports. Import the primitive at usage time.
              <ClusterMarker
                key={b._id}
                lat={lat}
                lng={lng}
                icon={icon}
                title={b.name}
                onClick={() => onSelectBusiness?.(b)}
              >
                <div style={{ minWidth: 220 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: '#111827',
                      marginBottom: 4,
                    }}
                  >
                    {b.name}
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#ffffff',
                      background: STATUS_COLOURS[status] || '#6B7280',
                      marginBottom: 8,
                    }}
                  >
                    {status.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
                    <div>
                      <strong>Category:</strong> {categoryName || '—'}
                    </div>
                    <div>
                      <strong>Location:</strong> {locationName || '—'}
                    </div>
                    <div>
                      <strong>Owner:</strong> {ownerName || '—'}
                    </div>
                    {typeof b.averageRating === 'number' && (
                      <div>
                        <strong>Rating:</strong> {b.averageRating.toFixed(1)}★ (
                        {b.totalReviews ?? 0} reviews)
                      </div>
                    )}
                  </div>
                  {onSelectBusiness && (
                    <button
                      type="button"
                      onClick={() => onSelectBusiness(b)}
                      style={{
                        marginTop: 10,
                        width: '100%',
                        padding: '6px 10px',
                        background: '#FD362F',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View details
                    </button>
                  )}
                </div>
              </ClusterMarker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

/**
 * Wrapper around the raw react-leaflet Marker that accepts our
 * custom icon and renders a Popup with the children. Exists as a
 * separate component so React's key-based reconciliation is cheap
 * inside the cluster group.
 */
function ClusterMarker({
  lat,
  lng,
  icon,
  title,
  onClick,
  children,
}: {
  lat: number;
  lng: number;
  icon: L.DivIcon;
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  // Lazy-import via the parent's react-leaflet package. We need Marker +
  // Popup at usage site.
  const { Marker, Popup } = require('react-leaflet');
  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      title={title}
      eventHandlers={{ click: () => onClick?.() }}
    >
      <Popup>{children}</Popup>
    </Marker>
  );
}
