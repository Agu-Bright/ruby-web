'use client';
import { use } from 'react';
import { RoomEditor } from '@/components/business/rooms/RoomEditor';
export default function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RoomEditor roomId={id} />;
}
