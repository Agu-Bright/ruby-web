'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteService, useServices, useToggleServiceStatus } from '@/lib/business-api/services';

export default function ServicesPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const query = useServices(status || undefined);
  const remove = useDeleteService(() => {
    toast.success('Service deleted');
    query.refetch();
  });
  const toggle = useToggleServiceStatus(() => query.refetch());
  const items = (query.data ?? []).filter((service) => service.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ruby-red">Catalogue</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Services</h1>
          <p className="mt-1 text-sm text-gray-500">Manage appointments and services customers can book.</p>
        </div>
        <Link href="/business/dashboard/services/create" className="inline-flex items-center justify-center gap-2 rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white">
          <Plus size={16} /> Add service
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services" className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:w-auto">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-48 rounded-xl" />)}</div>
      ) : items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((service) => (
            <article key={service._id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-gray-900">{service.name}</h2>
                  <p className="mt-1 text-sm font-bold">{service.pricing.type === 'QUOTE_REQUIRED' ? 'Quote required' : `₦${Math.round(service.pricing.basePrice).toLocaleString('en-NG')}`}</p>
                </div>
                <span className="h-fit shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold">{service.status}</span>
              </div>
              <p className="mt-3 text-xs text-gray-500">{service.duration.minutes} min · {service.fulfillmentMode.replace('_', ' ')}</p>
              <div className="mt-4 flex gap-2">
                <Link href={`/business/dashboard/services/${service._id}`} className="flex-1 rounded-lg border border-gray-200 py-2 text-center text-xs font-semibold"><Pencil size={13} className="mr-1 inline" /> Edit</Link>
                <button type="button" onClick={() => toggle.mutate({ id: service._id, isActive: !service.isActive })} className="rounded-lg border border-gray-200 px-3 text-xs">{service.isActive ? 'Pause' : 'Activate'}</button>
                <button type="button" onClick={() => { if (window.confirm(`Delete ${service.name}?`)) remove.mutate(service._id); }} className="rounded-lg border border-rose-200 px-3 text-rose-600"><Trash2 size={14} /></button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center sm:p-12"><Briefcase size={32} className="mx-auto text-gray-300" /><p className="mt-3 font-semibold">No services yet</p><p className="text-sm text-gray-500">Create your first booking service.</p></div>
      )}
    </main>
  );
}
