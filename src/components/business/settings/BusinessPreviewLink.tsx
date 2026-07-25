'use client';
import { useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from '@/lib/business-api/hooks';

export function BusinessPreviewLink(){const {business}=useBusinessAuth();const id=business?._id??'';const fetcher=useCallback(()=>api.businessMe.getBusinessProfile(id),[id]);const profile=useBusinessQuery<any>(fetcher,[id],{enabled:!!id});const slug=profile.data?.slug??profile.data?._id??id;return <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">Customer view</h2><p className="mt-1 text-sm text-gray-500">See the public profile customers see before they decide to visit, order or book.</p><a href={`/business/${encodeURIComponent(slug)}`} target="_blank" rel="noreferrer" className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold ${profile.isLoading?'pointer-events-none opacity-50':''}`}><ExternalLink size={16}/>Open public business profile</a></section>}
