'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  useCreateHotelRoom,
  useHotelRoom,
  useUpdateHotelRoom,
  type BedType,
  type CreateHotelRoomPayload,
  type HotelRoom,
  type RoomStatus,
} from '@/lib/business-api/hotel-rooms';

const BED_TYPES: BedType[] = ['KING', 'QUEEN', 'DOUBLE', 'SINGLE', 'BUNK', 'SOFA_BED'];
const STATUSES: RoomStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];
const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-ruby-red focus:ring-2 focus:ring-ruby-red/15';
const asNumber = (value: string, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>{children}{hint ? <span className="mt-1 block text-xs text-gray-500">{hint}</span> : null}</label>;
}

export function RoomEditor({ roomId }: { roomId?: string }) {
  const router = useRouter();
  const detail = useHotelRoom(roomId ?? '');
  const existing = detail.data as HotelRoom | null;
  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [maxGuests, setMaxGuests] = useState('2');
  const [totalUnits, setTotalUnits] = useState('1');
  const [amenitiesText, setAmenitiesText] = useState('');
  const [bedType, setBedType] = useState<BedType>('QUEEN');
  const [bedCount, setBedCount] = useState('1');
  const [sizeSqm, setSizeSqm] = useState('');
  const [minStay, setMinStay] = useState('1');
  const [maxStay, setMaxStay] = useState('');
  const [freeCancellationHours, setFreeCancellationHours] = useState('');
  const [cancellationFee, setCancellationFee] = useState('');
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [status, setStatus] = useState<RoomStatus>('DRAFT');

  useEffect(() => {
    if (!existing) return;
    setName(existing.name); setRoomType(existing.roomType); setDescription(existing.description ?? '');
    setPhotoUrls((existing.media ?? []).map((item) => item.url));
    setPrice(String(existing.pricePerNightNgn)); setCompareAtPrice(existing.compareAtPricePerNightNgn ? String(existing.compareAtPricePerNightNgn) : '');
    setMaxGuests(String(existing.maxGuests)); setTotalUnits(String(existing.totalUnits)); setAmenitiesText((existing.amenities ?? []).join(', '));
    setBedType(existing.bedConfig?.beds?.[0]?.type ?? 'QUEEN'); setBedCount(String(existing.bedConfig?.beds?.[0]?.count ?? 1));
    setSizeSqm(existing.sizeSqm ? String(existing.sizeSqm) : ''); setMinStay(String(existing.minStayNights ?? 1));
    setMaxStay(existing.maxStayNights ? String(existing.maxStayNights) : '');
    setFreeCancellationHours(existing.cancellationPolicy?.freeCancellationHours !== undefined ? String(existing.cancellationPolicy.freeCancellationHours) : '');
    setCancellationFee(existing.cancellationPolicy?.cancellationFeePercent !== undefined ? String(existing.cancellationPolicy.cancellationFeePercent) : '');
    setSmokingAllowed(!!existing.smokingAllowed); setStatus(existing.status);
  }, [existing]);

  const payload = useMemo<CreateHotelRoomPayload>(() => ({
    name: name.trim(), roomType: roomType.trim(), description: description.trim() || undefined,
    media: photoUrls.map((url, order) => ({ url, type: 'IMAGE', order })), pricePerNightNgn: asNumber(price),
    compareAtPricePerNightNgn: compareAtPrice ? asNumber(compareAtPrice) : undefined,
    bedConfig: { beds: [{ type: bedType, count: Math.max(1, asNumber(bedCount, 1)) }] },
    maxGuests: Math.max(1, asNumber(maxGuests, 1)), totalUnits: Math.max(1, asNumber(totalUnits, 1)),
    amenities: amenitiesText.split(',').map((item) => item.trim()).filter(Boolean), sizeSqm: sizeSqm ? asNumber(sizeSqm) : undefined,
    smokingAllowed, minStayNights: Math.max(1, asNumber(minStay, 1)), maxStayNights: maxStay ? Math.max(1, asNumber(maxStay)) : undefined,
    cancellationPolicy: freeCancellationHours || cancellationFee ? { freeCancellationHours: freeCancellationHours ? asNumber(freeCancellationHours) : undefined, cancellationFeePercent: cancellationFee ? asNumber(cancellationFee) : undefined } : undefined,
    status,
  }), [name, roomType, description, photoUrls, price, compareAtPrice, bedType, bedCount, maxGuests, totalUnits, amenitiesText, sizeSqm, smokingAllowed, minStay, maxStay, freeCancellationHours, cancellationFee, status]);

  const onSuccess = () => { toast.success(roomId ? 'Room updated.' : 'Room created.'); router.replace('/business/dashboard/rooms'); router.refresh(); };
  const create = useCreateHotelRoom(onSuccess);
  const update = useUpdateHotelRoom(onSuccess);
  const busy = create.isLoading || update.isLoading;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!payload.name || !payload.roomType || payload.pricePerNightNgn <= 0 || !payload.media.length) {
      toast.error('Add a room name, room type, valid nightly price and at least one photo.');
      return;
    }
    if (payload.maxStayNights && payload.maxStayNights < payload.minStayNights!) { toast.error('Maximum stay cannot be less than the minimum stay.'); return; }
    if (roomId) await update.mutate({ roomId, data: payload }); else await create.mutate(payload);
  };

  if (roomId && detail.isLoading) return <div className="p-6"><div className="h-96 animate-pulse rounded-2xl bg-gray-100" /></div>;
  if (roomId && detail.error) return <div className="p-6 text-sm text-rose-700">Could not load this room: {detail.error}</div>;

  return <form onSubmit={submit} className="mx-auto max-w-5xl p-4 sm:p-6">
    <button type="button" onClick={() => router.back()} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-950"><ArrowLeft size={17} /> Back to rooms</button>
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-ruby-red">Hotel inventory</p><h1 className="mt-1 text-2xl font-bold text-gray-950">{roomId ? 'Edit room' : 'Add a room'}</h1><p className="mt-1 text-sm text-gray-500">Add the exact room details customers need before they book.</p></div><button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><Save size={16} />{busy ? 'Saving…' : 'Save room'}</button></div>
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="grid gap-4 md:grid-cols-2"><Field label="Room name"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lagoon View Suite" className={inputClass} /></Field><Field label="Room type"><input required maxLength={80} value={roomType} onChange={(e) => setRoomType(e.target.value)} placeholder="e.g. Garden Cottage, Executive King" className={inputClass} /></Field></div>
      <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the room, view and inclusions…" className={inputClass} /></Field>
      <Field label="Room photos" hint="At least one photo is required. The first photo is the customer-facing cover."><div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">{photoUrls.map((url, index) => <div key={`${url}-${index}`} className="relative"><ImageUpload value={url} onChange={(next) => setPhotoUrls((current) => next ? current.map((photo, i) => i === index ? next : photo) : current.filter((_, i) => i !== index))} folder="hotel-rooms" /><span className="mt-1 block text-center text-[11px] text-gray-500">{index === 0 ? 'Cover photo' : `Photo ${index + 1}`}</span></div>)}{photoUrls.length < 8 ? <ImageUpload onChange={(url) => { if (url) setPhotoUrls((current) => [...current, url]); }} folder="hotel-rooms" helpText="Up to 8 photos" /> : null}</div></Field>
      <div className="grid gap-4 md:grid-cols-4"><Field label="Price per night (₦)"><input required type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} /></Field><Field label="Compare-at price (₦)"><input type="number" min="0" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} className={inputClass} /></Field><Field label="Maximum guests"><input required type="number" min="1" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} className={inputClass} /></Field><Field label="Number of units"><input required type="number" min="1" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} className={inputClass} /></Field></div>
      <div className="grid gap-4 md:grid-cols-3"><Field label="Bed type"><select value={bedType} onChange={(e) => setBedType(e.target.value as BedType)} className={inputClass}>{BED_TYPES.map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select></Field><Field label="Beds"><input type="number" min="1" value={bedCount} onChange={(e) => setBedCount(e.target.value)} className={inputClass} /></Field><Field label="Room size (m²)"><input type="number" min="0" value={sizeSqm} onChange={(e) => setSizeSqm(e.target.value)} className={inputClass} /></Field></div>
      <Field label="Amenities" hint="Separate each amenity with a comma."><input value={amenitiesText} onChange={(e) => setAmenitiesText(e.target.value)} placeholder="Wi-Fi, Air conditioning, Breakfast, Ocean view" className={inputClass} /></Field>
      <div className="grid gap-4 md:grid-cols-4"><Field label="Minimum stay (nights)"><input type="number" min="1" value={minStay} onChange={(e) => setMinStay(e.target.value)} className={inputClass} /></Field><Field label="Maximum stay (nights)"><input type="number" min="1" value={maxStay} onChange={(e) => setMaxStay(e.target.value)} className={inputClass} /></Field><Field label="Free cancellation (hours)"><input type="number" min="0" value={freeCancellationHours} onChange={(e) => setFreeCancellationHours(e.target.value)} className={inputClass} /></Field><Field label="Cancellation fee (%)"><input type="number" min="0" max="100" value={cancellationFee} onChange={(e) => setCancellationFee(e.target.value)} className={inputClass} /></Field></div>
      <div className="flex flex-wrap items-center gap-5 border-t border-gray-100 pt-5"><label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={smokingAllowed} onChange={(e) => setSmokingAllowed(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-ruby-red focus:ring-ruby-red" /> Smoking permitted</label><Field label="Visibility"><select value={status} onChange={(e) => setStatus(e.target.value as RoomStatus)} className="min-w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm">{STATUSES.map((item) => <option key={item} value={item}>{item[0] + item.slice(1).toLowerCase()}</option>)}</select></Field></div>
    </div>
  </form>;
}
