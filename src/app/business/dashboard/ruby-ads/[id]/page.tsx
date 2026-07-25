'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAdAction, useAdCampaign } from '@/lib/business-api/ads';
import type { AdCampaign } from '@/lib/types';

const money = (value: number | undefined) => `₦${Math.round(value ?? 0).toLocaleString('en-NG')}`;

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaign = useAdCampaign(params.id);
  const refresh = () => campaign.refetch();
  const pause = useAdAction('pause', () => { toast.success('Campaign paused'); refresh(); });
  const resume = useAdAction('resume', () => { toast.success('Campaign resumed'); refresh(); });
  const rerun = useAdAction('rerun', () => { toast.success('Campaign restarted from your wallet'); router.push('/business/dashboard/ruby-ads'); });
  if (campaign.isLoading) return <div className="p-6 text-sm text-gray-500">Loading campaign…</div>;
  const item = campaign.data as AdCampaign | null;
  if (!item) return <div className="p-6"><p className="text-gray-600">Campaign not found.</p><Link href="/business/dashboard/ruby-ads" className="mt-4 inline-block text-sm font-semibold text-ruby-red">Back to campaigns</Link></div>;
  return <main className="mx-auto max-w-3xl p-6"><Link href="/business/dashboard/ruby-ads" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft size={16} /> Back to campaigns</Link><div className="mt-5 rounded-2xl border bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-ruby-red">{item.status.replaceAll('_', ' ')}</p><h1 className="mt-2 text-2xl font-bold text-gray-900">{item.name}</h1><p className="mt-1 text-sm text-gray-500">{item.type.replaceAll('_', ' ')}</p><dl className="mt-6 grid grid-cols-2 gap-4 border-y py-5 text-sm"><div><dt className="text-gray-500">Campaign cost</dt><dd className="mt-1 font-bold">{money(item.totalCost)}</dd></div><div><dt className="text-gray-500">Impressions</dt><dd className="mt-1 font-bold">{(item.impressions ?? 0).toLocaleString('en-NG')}</dd></div><div><dt className="text-gray-500">Clicks</dt><dd className="mt-1 font-bold">{(item.clicks ?? 0).toLocaleString('en-NG')}</dd></div><div><dt className="text-gray-500">Payment</dt><dd className="mt-1 font-bold">{item.paymentStatus}</dd></div></dl>{item.caption && <p className="mt-5 text-sm leading-6 text-gray-600">{item.caption}</p>}<div className="mt-6 flex flex-wrap gap-2">{item.status === 'ACTIVE' && <button disabled={pause.isLoading} onClick={() => pause.mutate(item._id)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold"><Pause size={16} /> Pause</button>}{item.status === 'PAUSED' && <button disabled={resume.isLoading} onClick={() => resume.mutate(item._id)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold"><Play size={16} /> Resume</button>}{['COMPLETED', 'CANCELLED', 'REJECTED'].includes(item.status) && <button disabled={rerun.isLoading} onClick={() => rerun.mutate(item._id)} className="inline-flex items-center gap-2 rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white"><RotateCcw size={16} /> Run again</button>}</div></div></main>;
}
