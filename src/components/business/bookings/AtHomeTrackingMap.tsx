'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin, Radio, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { DynamicMap } from '@/lib/leaflet/DynamicMap';
import type { LatLng } from '@/lib/leaflet/LeafletMap';
import type { BusinessBooking } from '@/lib/business-api/bookings';
import { api } from '@/lib/api';
import { useBookingTrackingRealtime } from '@/lib/business-sockets';

function point(value?: { lat?: number; lng?: number }): LatLng | null {
  if (!value || typeof value.lat !== 'number' || typeof value.lng !== 'number') return null;
  return [value.lat, value.lng];
}

export function AtHomeTrackingMap({ booking, onRefresh }: { booking: BusinessBooking; onRefresh: () => void }) {
  const [providerLocation, setProviderLocation] = useState(point(booking.providerLastLocation));
  const [sharing, setSharing] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const customer = point(booking.address);

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
  }, []);
  useBookingTrackingRealtime({
    id: booking._id,
    onChange: onRefresh,
    onProviderLocation: (location) => setProviderLocation([location.lat, location.lng]),
  });

  const stopSharing = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setSharing(false);
  }, []);

  const startSharing = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Live location is not supported in this browser.');
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setProviderLocation([lat, lng]);
        const last = lastSent.current;
        if (last && Date.now() - last.at < 10_000) return;
        lastSent.current = { lat, lng, at: Date.now() };
        try {
          await api.businessBookings.updateProviderLocation(booking._id, { lat, lng });
        } catch {
          toast.error('Live location could not be shared. Retrying on the next update.');
        }
      },
      () => {
        toast.error('Location permission is required to share your live route.');
        stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
    setSharing(true);
  }, [booking._id, stopSharing]);

  const markers = [
    providerLocation && { id: 'provider', position: providerLocation, title: 'Your live location', description: sharing ? 'Sharing with the customer' : 'Last known location' },
    customer && { id: 'customer', position: customer, title: 'Customer', description: booking.address?.street ?? booking.address?.address ?? 'Service address' },
  ].filter(Boolean) as Array<{ id: string; position: LatLng; title: string; description: string }>;
  const center = providerLocation ?? customer ?? ([6.5244, 3.3792] as LatLng);

  return (
    <section className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">At-home service route</p><p className="mt-1 text-sm text-gray-700">Share your location while travelling so the customer sees your progress.</p></div>
        <button type="button" onClick={sharing ? stopSharing : startSharing} className={`shrink-0 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold ${sharing ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-ruby-red text-white hover:opacity-95'}`}>
          {sharing ? <Crosshair size={16} /> : <Share2 size={16} />} {sharing ? 'Stop sharing' : 'Share live location'}
        </button>
      </div>
      {customer ? <DynamicMap center={center} markers={markers} polylines={providerLocation ? [[providerLocation, customer]] : []} fitToMarkers className="h-72 w-full" /> : <div className="m-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 inline-flex items-start gap-2"><MapPin size={16} className="mt-0.5" />The customer address has no map coordinates yet.</div>}
      <div className="px-4 py-3 text-xs text-gray-500 inline-flex items-center gap-1.5"><Radio size={13} className={sharing ? 'text-emerald-600' : 'text-gray-400'} />{sharing ? 'Live location is being shared securely for this booking.' : 'Location sharing is off.'}</div>
    </section>
  );
}
