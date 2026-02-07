'use client';

import { useState, useCallback } from 'react';
import { MapPin, Search, Plus, Power, PowerOff, Globe, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, type Column } from '@/components/ui';
import type { Location, CreateLocationRequest, LocationFilterParams } from '@/lib/types';

export default function LocationsPage() {
  const { isSuperAdmin } = useAuth();
  const [filters, setFilters] = useState<LocationFilterParams>({ page: 1, limit: 20 });
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: locations, meta, isLoading, refetch } = useApi<Location[]>(
    () => api.locations.list(filters),
    [filters]
  );

  const { mutate: activateLocation } = useMutation((id: string) => api.locations.activate(id));
  const { mutate: deactivateLocation } = useMutation((id: string) => api.locations.deactivate(id));

  const handleActivate = useCallback(async (id: string) => {
    const result = await activateLocation(id);
    if (result) {
      toast.success('Location activated');
      refetch();
    }
  }, [activateLocation, refetch]);

  const handleDeactivate = useCallback(async (id: string) => {
    const result = await deactivateLocation(id);
    if (result) {
      toast.success('Location deactivated');
      refetch();
    }
  }, [deactivateLocation, refetch]);

  const columns: Column<Location>[] = [
    {
      key: 'name',
      header: 'Location',
      render: (loc) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{loc.name}</div>
            <div className="text-xs text-gray-500">{loc.type} · {loc.countryCode}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (loc) => <StatusBadge status={loc.status} />,
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (loc) => <span className="text-gray-600">{loc.defaultCurrency}</span>,
    },
    {
      key: 'language',
      header: 'Language',
      render: (loc) => <span className="text-gray-600">{loc.defaultLanguage}</span>,
    },
    {
      key: 'timezone',
      header: 'Timezone',
      render: (loc) => (
        <span className="flex items-center gap-1.5 text-gray-600">
          <Clock className="w-3 h-3" />
          {loc.timezone}
        </span>
      ),
    },
    {
      key: 'coordinates',
      header: 'Center',
      render: (loc) => (
        <span className="text-xs text-gray-500 font-mono">
          {loc.centerLat.toFixed(4)}, {loc.centerLng.toFixed(4)}
        </span>
      ),
    },
    ...(isSuperAdmin
      ? [{
          key: 'actions' as const,
          header: 'Actions',
          render: (loc: Location) => (
            <div className="flex items-center gap-2">
              {loc.status === 'INACTIVE' ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleActivate(loc._id); }}
                  className="btn-primary btn-sm gap-1"
                >
                  <Power className="w-3 h-3" /> Activate
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeactivate(loc._id); }}
                  className="btn-ghost btn-sm gap-1 text-red-600 hover:bg-red-50"
                >
                  <PowerOff className="w-3 h-3" /> Deactivate
                </button>
              )}
            </div>
          ),
        }]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Manage platform locations and activation status"
        action={
          isSuperAdmin ? (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary btn-sm gap-1.5">
              <Plus className="w-4 h-4" /> Add Location
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setFilters({ ...filters, search: e.target.value, page: 1 });
            }}
            placeholder="Search locations…"
            className="input-field pl-9"
          />
        </div>
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as Location['status'] | undefined, page: 1 })}
          className="input-field w-auto"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select
          value={filters.type || ''}
          onChange={(e) => setFilters({ ...filters, type: (e.target.value || undefined) as Location['type'] | undefined, page: 1 })}
          className="input-field w-auto"
        >
          <option value="">All types</option>
          <option value="COUNTRY">Country</option>
          <option value="STATE">State</option>
          <option value="CITY">City</option>
          <option value="AREA">Area</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={locations || []}
        meta={meta}
        isLoading={isLoading}
        currentPage={filters.page}
        onPageChange={(page) => setFilters({ ...filters, page })}
        emptyMessage="No locations found. Add a location to get started."
      />

      {/* Create Location Modal */}
      <CreateLocationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { setShowCreateModal(false); refetch(); }}
      />
    </div>
  );
}

function CreateLocationModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateLocationRequest>({
    name: '',
    slug: '',
    type: 'CITY',
    countryCode: 'NG',
    centerLat: 6.5244,
    centerLng: 3.3792,
    timezone: 'Africa/Lagos',
    defaultCurrency: 'NGN',
    supportedCurrencies: ['NGN'],
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.locations.create(form);
      toast.success('Location created');
      onCreated();
    } catch {
      toast.error('Failed to create location');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Location" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              className="input-field"
              placeholder="Lagos"
              required
            />
          </div>
          <div>
            <label className="label-text">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="input-field"
              placeholder="lagos"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as Location['type'] })}
              className="input-field"
            >
              <option value="COUNTRY">Country</option>
              <option value="STATE">State</option>
              <option value="CITY">City</option>
              <option value="AREA">Area</option>
            </select>
          </div>
          <div>
            <label className="label-text">Country Code</label>
            <input
              value={form.countryCode}
              onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })}
              className="input-field"
              placeholder="NG"
              maxLength={2}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Center Latitude</label>
            <input
              type="number"
              step="any"
              value={form.centerLat}
              onChange={(e) => setForm({ ...form, centerLat: parseFloat(e.target.value) })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label-text">Center Longitude</label>
            <input
              type="number"
              step="any"
              value={form.centerLng}
              onChange={(e) => setForm({ ...form, centerLng: parseFloat(e.target.value) })}
              className="input-field"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label-text">Timezone</label>
            <input
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="input-field"
              placeholder="Africa/Lagos"
              required
            />
          </div>
          <div>
            <label className="label-text">Default Currency</label>
            <input
              value={form.defaultCurrency}
              onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value.toUpperCase() })}
              className="input-field"
              placeholder="NGN"
              required
            />
          </div>
          <div>
            <label className="label-text">Default Language</label>
            <input
              value={form.defaultLanguage}
              onChange={(e) => setForm({ ...form, defaultLanguage: e.target.value })}
              className="input-field"
              placeholder="en"
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary btn-sm">
            {isSubmitting ? 'Creating…' : 'Create Location'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
