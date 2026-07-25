'use client';

import { ChangeEvent, useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from '@/lib/business-api/hooks';

const documents = [
  { field: 'cacDocumentUrl', status: 'cacDocumentStatus', label: 'CAC registration', helper: 'Corporate Affairs Commission certificate' },
  { field: 'governmentIdUrl', status: 'governmentIdStatus', label: 'Government ID', helper: 'NIN, voter card or passport' },
  { field: 'businessLicenseUrl', status: 'businessLicenseStatus', label: 'Business licence', helper: 'Trade or sector-specific permit' },
] as const;

export function BusinessVerification() {
  const { business } = useBusinessAuth();
  const id = business?._id ?? '';
  const profile = useBusinessQuery<any>(useCallback(() => api.businessOnboarding.profile(id), [id]), [id], { enabled: !!id });
  const [uploading, setUploading] = useState<string | null>(null);
  const upload = async (field: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;
    setUploading(field);
    try {
      const response = await api.media.upload(file, 'business-verification');
      const url = (response.data as { url?: string; secureUrl?: string }).url ?? (response.data as { secureUrl?: string }).secureUrl;
      if (!url) throw new Error('Upload did not return a URL');
      await api.businessOnboarding.update(id, { [field]: url });
      await profile.refetch();
      toast.success('Verification document uploaded for review');
    } catch { toast.error('Could not upload this document'); }
    finally { setUploading(null); event.target.value = ''; }
  };

  return <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">Business verification</h2><p className="mt-1 text-sm text-gray-500">Upload registration documents for Ruby+ review. Verified documents are locked to protect your business identity.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{documents.map((document) => { const status = profile.data?.[document.status] as string | undefined; const hasDocument = !!profile.data?.[document.field]; return <label key={document.field} className="rounded-xl border border-dashed p-4 text-sm"><span className="font-semibold">{document.label}</span><span className="mt-1 block min-h-9 text-xs text-gray-500">{hasDocument ? status ?? 'PENDING' : document.helper}</span><span className={`mt-3 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{hasDocument ? status ?? 'PENDING' : 'NOT UPLOADED'}</span>{status !== 'VERIFIED' && <span className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-ruby-red"><Upload size={14} />{uploading === document.field ? 'Uploading…' : hasDocument ? 'Replace document' : 'Upload document'}<input disabled={!!uploading} type="file" accept="image/*,.pdf" className="sr-only" onChange={(event) => void upload(document.field, event)} /></span>}</label>; })}</div></section>;
}
