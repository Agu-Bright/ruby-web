'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { MapPin, Navigation, Radio, Truck, UserRound } from 'lucide-react';
import { DynamicMap } from '@/lib/leaflet/DynamicMap';
import type { LatLng } from '@/lib/leaflet/LeafletMap';
import type { DeliveryJob } from '@/lib/business-api/delivery';
import { useDeliveryRealtime } from '@/lib/business-sockets';

const STATUS_COPY: Record<string, string> = {
  CREATED: 'Finding a rider',
  ASSIGNED: 'Rider assigned',
  RIDER_ACCEPTED: 'Rider accepted',
  RIDER_AT_PICKUP: 'Rider is at your pickup point',
  PICKED_UP: 'Order picked up',
  IN_TRANSIT: 'Rider is on the way',
  RIDER_AT_DROPOFF: 'Rider has reached the customer',
  DELIVERED: 'Delivery completed',
};

function asPoint(value?: { lat: number; lng: number }): LatLng | null {
  if (!value || !Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return null;
  return [value.lat, value.lng];
}

export function DeliveryTrackingMap({ job, orderId, onRefresh }: {
  job: DeliveryJob;
  orderId: string;
  onRefresh: () => void;
}) {
  const [riderLocation, setRiderLocation] = useState(job.lastKnownLocation);
  useEffect(() => setRiderLocation(job.lastKnownLocation), [job.lastKnownLocation]);
  useDeliveryRealtime({
    id: orderId,
    onChange: onRefresh,
    onLocation: setRiderLocation,
  });

  const pickup = asPoint(job.pickup);
  const dropoff = asPoint(job.dropoff);
  const rider = asPoint(riderLocation);
  const markers = [
    pickup && { id: 'pickup', position: pickup, title: 'Pickup', description: job.pickup.address ?? 'Your business' },
    rider && { id: 'rider', position: rider, title: job.riderInfo?.name ?? 'Rider', description: 'Live rider position' },
    dropoff && { id: 'dropoff', position: dropoff, title: 'Customer', description: job.dropoff.address ?? 'Delivery address' },
  ].filter(Boolean) as Array<{ id: string; position: LatLng; title: string; description: string }>;
  const route = rider && dropoff ? [rider, dropoff] : pickup && dropoff ? [pickup, dropoff] : [];
  const center = rider ?? pickup ?? dropoff ?? ([6.5244, 3.3792] as LatLng);
  const isLive = !['DELIVERED', 'FAILED', 'CANCELLED'].includes(job.status);

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Delivery tracking</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{STATUS_COPY[job.status] ?? job.status.replace(/_/g, ' ')}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isLive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
          <Radio size={12} /> {isLive ? 'Live' : 'Final'}
        </span>
      </div>
      <DynamicMap
        center={center}
        markers={markers}
        polylines={route.length === 2 ? [route] : []}
        fitToMarkers
        className="h-80 w-full"
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        <Info icon={<MapPin size={15} />} label="Pickup" value={job.pickup.address ?? 'Business location'} />
        <Info icon={<Truck size={15} />} label="Rider" value={job.riderInfo?.name ?? 'Awaiting assignment'} />
        <Info icon={<Navigation size={15} />} label="Destination" value={job.dropoff.address ?? 'Customer location'} />
      </div>
      {job.riderInfo?.phone && (
        <a href={`tel:${job.riderInfo.phone}`} className="mx-4 mb-4 inline-flex items-center gap-2 text-sm font-medium text-ruby-red hover:underline">
          <UserRound size={15} /> Call rider {job.riderInfo.phone}
        </a>
      )}
    </section>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="p-4 min-w-0"><p className="text-xs text-gray-500 inline-flex items-center gap-1.5">{icon}{label}</p><p className="text-sm text-gray-800 mt-1 truncate">{value}</p></div>;
}
