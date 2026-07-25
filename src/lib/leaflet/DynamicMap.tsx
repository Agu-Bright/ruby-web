'use client';

import dynamic from 'next/dynamic';
import type { LeafletMapProps } from './LeafletMap';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />,
});

export function DynamicMap(props: LeafletMapProps) {
  return <LeafletMap {...props} />;
}
