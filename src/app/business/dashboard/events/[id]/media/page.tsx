'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChangeEvent, useState } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useEventDetail, useUpdateEvent } from '@/lib/business-api/events';

export default function EventMediaPage() {
  const { id } = useParams<{ id: string }>(); const detail = useEventDetail(id); const [busy, setBusy] = useState(false);
  const update = useUpdateEvent(id, () => { toast.success('Event media saved'); detail.refetch(); }); const item = detail.data;
  const upload = async (event: ChangeEvent<HTMLInputElement>, kind: 'cover' | 'gallery' | 'tier', index?: number) => { const file = event.target.files?.[0]; if (!file || !item) return; setBusy(true); try { const response = await api.media.upload(file, 'events'); const url = (response.data as any)?.url ?? (response.data as any)?.secureUrl; if (!url) throw new Error('Upload did not return a URL'); if (kind === 'cover') update.mutate({ coverImageUrl: url }); else if (kind === 'gallery') update.mutate({ galleryUrls: [...((item as any).galleryUrls ?? []), url] }); else { const ticketTiers = item.ticketTiers.map((tier: any, tierIndex: number) => tierIndex === index ? { ...tier, imageUrl: url } : tier); update.mutate({ ticketTiers }); } } catch { toast.error('Could not upload media'); } finally { setBusy(false); event.target.value = ''; } };
  if (detail.isLoading) return <p className="p-6 text-sm text-gray-500">Loading event…</p>; if (!item) return <main className="p-6">Event not found.</main>;
  return <main className="mx-auto max-w-3xl p-6"><Link href={`/business/dashboard/events/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft size={16} /> Back to event</Link><h1 className="mt-5 text-2xl font-bold">Event media</h1><p className="mt-1 text-sm text-gray-500">Upload a cover, gallery photos and ticket-tier artwork.</p><section className="mt-5 space-y-5 rounded-2xl border bg-white p-5"><MediaInput label="Cover image" busy={busy} onChange={(event) => upload(event, 'cover')} />{item.coverImageUrl && <img src={item.coverImageUrl} alt="Event cover" className="h-44 w-full rounded-xl object-cover" />}<MediaInput label="Add gallery image" busy={busy} onChange={(event) => upload(event, 'gallery')} /><div className="grid grid-cols-2 gap-3">{((item as any).galleryUrls ?? []).map((url: string) => <img key={url} src={url} alt="Event gallery" className="h-28 w-full rounded-xl object-cover" />)}</div><div className="border-t pt-5"><h2 className="font-semibold">Ticket-tier artwork</h2><div className="mt-3 space-y-3">{item.ticketTiers.map((tier: any, index: number) => <div key={tier.name} className="rounded-xl bg-gray-50 p-3"><p className="text-sm font-semibold">{tier.name}</p><MediaInput label="Upload tier image" busy={busy} onChange={(event) => upload(event, 'tier', index)} />{tier.imageUrl && <img src={tier.imageUrl} alt={tier.name} className="mt-3 h-28 w-40 rounded-lg object-cover" />}</div>)}</div></div></section></main>;
}
function MediaInput({ label, busy, onChange }: { label: string; busy: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) { return <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ruby-red"><Upload size={16} />{busy ? 'Uploading…' : label}<input disabled={busy} type="file" accept="image/*" className="sr-only" onChange={onChange} /></label>; }
