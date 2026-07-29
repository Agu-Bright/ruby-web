'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AlertCircle, ImagePlus, Loader2, Star, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { compressImage } from '@/lib/image-compress';
import type { ProductImage } from '@/lib/business-api/products';

const MAX_IMAGES = 8;
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Merchant product photos. Supports selecting or dropping several photos at once. */
export function ProductImageGallery({ value, onChange }: { value: ProductImage[]; onChange: (images: ProductImage[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = async (files: File[]) => {
    const remaining = MAX_IMAGES - value.length;
    if (!remaining) return;
    const selected = files.slice(0, remaining);
    const invalid = selected.find((file) => !ACCEPTED_TYPES.has(file.type) || file.size > MAX_SIZE);
    if (invalid) {
      setError('Use JPEG, PNG or WebP photos up to 5MB each.');
      return;
    }
    setError(null);
    setUploading(selected.length);
    const uploaded: ProductImage[] = [];
    for (const file of selected) {
      try {
        const compressed = await compressImage(file);
        const result = await api.media.upload(compressed, 'products');
        uploaded.push({
          url: result.data.url,
          alt: file.name.replace(/\.[^.]+$/, ''),
          order: value.length + uploaded.length,
          isPrimary: value.length + uploaded.length === 0,
        });
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : `Could not upload ${file.name}.`);
      } finally {
        setUploading((count) => Math.max(0, count - 1));
      }
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
  };

  const onSelect = (event: ChangeEvent<HTMLInputElement>) => {
    void uploadFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void uploadFiles(Array.from(event.dataTransfer.files ?? []));
  };
  const remove = (index: number) => {
    const next = value.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, order: itemIndex, isPrimary: itemIndex === 0 }));
    onChange(next);
  };

  return <div>
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <div><p className="text-sm font-semibold text-gray-900">Product photos</p><p className="mt-1 text-xs text-gray-500">Add up to 8 JPEG, PNG or WebP photos. Select the star for the main image.</p></div>
      <span className="text-xs font-medium text-gray-500">{value.length}/{MAX_IMAGES}</span>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {value.map((image, index) => <div key={`${image.url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        <img src={image.url} alt={image.alt || `Product photo ${index + 1}`} className="h-full w-full object-cover" />
        <button type="button" onClick={() => onChange(value.map((item, itemIndex) => ({ ...item, isPrimary: itemIndex === index })))} className={`absolute left-2 top-2 rounded-lg p-1.5 shadow-sm ${image.isPrimary ? 'bg-amber-400 text-white' : 'bg-white/95 text-gray-500'}`} title="Make main photo"><Star size={14} fill={image.isPrimary ? 'currentColor' : 'none'} /></button>
        <button type="button" onClick={() => remove(index)} className="absolute right-2 top-2 rounded-lg bg-white/95 p-1.5 text-rose-600 shadow-sm" title="Remove photo"><Trash2 size={14} /></button>
        {image.isPrimary && <span className="absolute bottom-2 left-2 rounded bg-gray-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">MAIN PHOTO</span>}
      </div>)}
      {value.length < MAX_IMAGES && <div onDrop={onDrop} onDragOver={(event) => event.preventDefault()} onClick={() => !uploading && inputRef.current?.click()} className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-3 text-center transition hover:border-ruby-red hover:bg-ruby-red/5">
        {uploading ? <><Loader2 className="mb-2 animate-spin text-ruby-red" size={22} /><span className="text-xs font-medium text-gray-600">Uploading {uploading}…</span></> : <><Upload className="mb-2 text-gray-400" size={22} /><span className="text-xs font-semibold text-gray-700">Add photos</span><span className="mt-1 text-[10px] text-gray-500">Click or drop files</span></>}
      </div>}
    </div>
    <input ref={inputRef} className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={onSelect} />
    {error && <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-rose-600"><AlertCircle size={14} />{error}</p>}
    {!value.length && !uploading && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500"><ImagePlus size={14} />Product photos help customers make a confident choice.</p>}
  </div>;
}
