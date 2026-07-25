'use client';

import { ImagePlus, Star, Trash2 } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import type { ProductImage } from '@/lib/business-api/products';

export function ProductImageGallery({ value, onChange }: { value: ProductImage[]; onChange: (images: ProductImage[]) => void }) {
  const add = (url?: string) => { if (url) onChange([...value, { url, order: value.length, isPrimary: value.length === 0 }]); };
  return <div><p className="text-sm font-medium text-gray-700 mb-2">Product images</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{value.map((image, index) => <div key={`${image.url}-${index}`} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200"><img src={image.url} alt="" className="h-full w-full object-cover"/><button type="button" onClick={() => onChange(value.map((item, itemIndex) => ({ ...item, isPrimary: itemIndex === index })))} className={`absolute top-1 left-1 rounded p-1 ${image.isPrimary ? 'bg-amber-400 text-white' : 'bg-white/90 text-gray-500'}`} title="Make primary"><Star size={13}/></button><button type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, order: itemIndex, isPrimary: item.isPrimary || itemIndex === 0 })))} className="absolute top-1 right-1 rounded bg-white/90 p-1 text-rose-600" title="Remove"><Trash2 size={13}/></button></div>)}{value.length < 8 && <div className="aspect-square"><ImageUpload onChange={add} folder="products" label="" helpText="" /></div>}</div>{value.length ? <p className="mt-2 text-xs text-gray-500"><ImagePlus size={12} className="inline mr-1"/>Up to 8 images. The star selects the primary image.</p> : null}</div>;
}
