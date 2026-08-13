'use client';
import { RoomEditor } from '@/components/business/rooms/RoomEditor';
export default function EditRoomPage({ params }: { params: { id: string } }) { return <RoomEditor roomId={params.id} />; }
