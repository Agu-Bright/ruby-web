'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCreateOrganicReel } from '@/lib/business-api/ads';

export default function CreateOrganicReelPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const reel = useCreateOrganicReel(() => { toast.success('Your reel has been submitted'); router.push('/business/dashboard/ruby-ads'); });
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => { const selected = event.target.files?.[0] ?? null; if (preview) URL.revokeObjectURL(preview); setFile(selected); setPreview(selected ? URL.createObjectURL(selected) : null); };
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!file) return toast.error('Choose a video first'); const uploaded = await api.media.upload(file, 'ads/reels'); const url = (uploaded.data as { url?: string; secureUrl?: string }).url ?? (uploaded.data as { secureUrl?: string }).secureUrl; if (!url) return toast.error('The video could not be uploaded'); await reel.mutate({ media: [{ url, type: 'VIDEO' }], caption: caption.trim() || undefined, hashtags: hashtags.split(',').map((tag) => tag.trim()).filter(Boolean) }); };
  return <main className="mx-auto max-w-2xl p-6"><Link href="/business/dashboard/ruby-ads" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft size={16} /> Back to ads</Link><h1 className="mt-5 text-2xl font-bold">Create an organic reel</h1><p className="mt-1 text-sm text-gray-500">Share a short video with customers without creating a paid campaign.</p><form onSubmit={submit} className="mt-5 space-y-5 rounded-xl border bg-white p-5"><label className="block rounded-xl border border-dashed p-5 text-center text-sm font-medium text-gray-600"><Upload className="mx-auto mb-2 text-ruby-red" size={20} />{file ? file.name : 'Choose a video'}<input className="sr-only" type="file" accept="video/*" onChange={selectFile} /></label>{preview && <video controls className="max-h-[420px] w-full rounded-xl bg-black" src={preview} />}<label className="block text-sm font-medium">Caption<textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border p-3 font-normal" placeholder="Tell customers what they are seeing…" /></label><label className="block text-sm font-medium">Hashtags <span className="font-normal text-gray-400">(comma separated)</span><input value={hashtags} onChange={(event) => setHashtags(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" placeholder="food, port-harcourt, new-menu" /></label><button disabled={reel.isLoading} className="rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white">{reel.isLoading ? 'Uploading…' : 'Publish reel'}</button></form></main>;
}
