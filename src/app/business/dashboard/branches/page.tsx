'use client';

import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { LocationSelector } from '@/components/business/onboarding/LocationSelector';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBranches, useCatalogMode, useCreateBranch, useEnableMultiBranch } from '@/lib/business-api/organization';

type BranchForm = { branchLabel: string; locationId: string; latitude: string; longitude: string; street: string; city: string; state: string; country: string; phone: string; catalogMode: string };
const initial: BranchForm = { branchLabel: '', locationId: '', latitude: '', longitude: '', street: '', city: '', state: '', country: 'Nigeria', phone: '', catalogMode: 'INHERIT' };

export default function BranchesPage() {
  const { business } = useBusinessAuth();
  const branches = useBranches();
  const [label, setLabel] = useState('Main branch');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<BranchForm>(initial);
  const refresh = () => void branches.refetch();
  const enable = useEnableMultiBranch(() => { toast.success('Multi-branch enabled'); refresh(); });
  const create = useCreateBranch(() => { toast.success('Branch created'); setForm(initial); setShowCreate(false); refresh(); });
  const catalog = useCatalogMode(() => { toast.success('Catalog mode updated'); refresh(); });
  const multiBranchEnabled = business?.isParent === true || !!business?.parentBusinessId;
  const set = (key: keyof BranchForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const pin: [number, number] = [Number(form.latitude) || 4.8156, Number(form.longitude) || 7.0498];
  const enableSubmit = (event: FormEvent) => { event.preventDefault(); void enable.mutate({ branchLabel: label.trim() || 'Main branch' }); };
  const createSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.locationId) return toast.error('Choose the Ruby+ city for this branch');
    if (!Number.isFinite(Number(form.latitude)) || !Number.isFinite(Number(form.longitude))) return toast.error('Enter valid branch coordinates');
    void create.mutate({ branchLabel: form.branchLabel, locationId: form.locationId, latitude: Number(form.latitude), longitude: Number(form.longitude), address: { street: form.street, city: form.city, state: form.state, country: form.country }, contact: form.phone ? { phone: form.phone } : undefined, catalogMode: form.catalogMode });
  };

  return <main className="mx-auto max-w-5xl p-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Branches</h1><p className="mt-1 text-sm text-gray-500">Manage locations and whether each branch shares your catalog.</p></div>
      {multiBranchEnabled && <button onClick={() => setShowCreate((value) => !value)} className="rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white">{showCreate ? 'Close form' : 'Add branch'}</button>}
    </div>
    {!multiBranchEnabled && <form onSubmit={enableSubmit} className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Enable a branch network</h2><p className="mt-1 text-sm text-gray-500">Start by naming your current location. You can then add new locations.</p><div className="mt-4 flex gap-2"><input value={label} onChange={(event) => setLabel(event.target.value)} className="min-w-0 flex-1 rounded-lg border p-3" placeholder="e.g. Main branch" /><button disabled={enable.isLoading} className="rounded-lg bg-ruby-red px-4 text-sm font-semibold text-white">{enable.isLoading ? 'Enabling…' : 'Enable'}</button></div></form>}
    {showCreate && <form onSubmit={createSubmit} className="mt-6 grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-2"><h2 className="md:col-span-2 font-semibold">New branch details</h2><input required value={form.branchLabel} onChange={(event) => set('branchLabel', event.target.value)} placeholder="Branch label" className="rounded-lg border p-3" /><div className="md:col-span-2"><label className="text-sm font-medium">Ruby+ city</label><LocationSelector value={form.locationId} onChange={(value) => set('locationId', value)} pin={pin} /></div><input required type="number" step="any" value={form.latitude} onChange={(event) => set('latitude', event.target.value)} placeholder="Latitude" className="rounded-lg border p-3" /><input required type="number" step="any" value={form.longitude} onChange={(event) => set('longitude', event.target.value)} placeholder="Longitude" className="rounded-lg border p-3" /><input required value={form.street} onChange={(event) => set('street', event.target.value)} placeholder="Street address" className="rounded-lg border p-3" /><input value={form.city} onChange={(event) => set('city', event.target.value)} placeholder="City" className="rounded-lg border p-3" /><input value={form.state} onChange={(event) => set('state', event.target.value)} placeholder="State" className="rounded-lg border p-3" /><input value={form.phone} onChange={(event) => set('phone', event.target.value)} placeholder="Contact phone (optional)" className="rounded-lg border p-3" /><select value={form.catalogMode} onChange={(event) => set('catalogMode', event.target.value)} className="rounded-lg border p-3"><option value="INHERIT">Inherit parent catalog</option><option value="INDEPENDENT">Independent catalog</option><option value="MIXED">Mixed catalog</option></select><button disabled={create.isLoading} className="rounded-lg bg-ruby-red p-3 text-sm font-semibold text-white">{create.isLoading ? 'Creating…' : 'Create branch'}</button></form>}
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white"><div className="flex justify-between border-b px-5 py-4"><b>Branch network</b><span className="text-sm text-gray-500">{(branches.data ?? []).length} additional branches</span></div>{branches.isLoading ? <p className="p-5 text-sm text-gray-500">Loading branches…</p> : <div className="divide-y">{(branches.data ?? []).map((branch: any) => <div key={branch._id} className="flex flex-wrap items-center gap-3 p-5"><div className="min-w-48 flex-1"><b>{branch.branchLabel ?? branch.name}</b><p className="mt-1 text-sm text-gray-500">{branch.address?.street ?? branch.address?.city ?? 'Address pending'} · {branch.status}</p></div><select aria-label="Catalog mode" value={branch.catalogMode ?? 'INHERIT'} onChange={(event) => void catalog.mutate({ branchId: branch._id, catalogMode: event.target.value })} disabled={catalog.isLoading} className="rounded-lg border p-2 text-sm"><option value="INHERIT">Inherit</option><option value="INDEPENDENT">Independent</option><option value="MIXED">Mixed</option></select></div>)}</div>}</section>
  </main>;
}
