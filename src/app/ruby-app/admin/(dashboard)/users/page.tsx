'use client';

import { useState } from 'react';
import { Plus, Search, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, type Column } from '@/components/ui';
import { formatDate, getInitials } from '@/lib/utils';
import type { AdminUser, CreateAdminRequest, AdminRole, AdminScope, PaginationParams } from '@/lib/types';

// Display-friendly role labels
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  location_admin: 'Location Admin',
  support: 'Support',
  support_admin: 'Support Admin',
  finance: 'Finance',
  content: 'Content',
};

function formatRole(role: string): string {
  return ROLE_LABELS[role] || role.replace(/_/g, ' ');
}

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<PaginationParams>({ page: 1, limit: 20 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data: users, meta, isLoading, refetch } = useApi<AdminUser[]>(
    () => api.adminUsers.list(filters),
    [filters]
  );

  const handleStatusToggle = async (user: AdminUser) => {
    const id = user._id || user.id;
    if (!id) return;
    const newStatus = user.isActive === false ? 'ACTIVE' : 'SUSPENDED';
    try {
      await api.adminUsers.update(id, { status: newStatus });
      toast.success(`Admin ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'}`);
      refetch();
    } catch {
      toast.error('Failed to update admin status');
    }
  };

  const filtered = users?.filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.firstName.toLowerCase().includes(search.toLowerCase()) ||
    u.lastName.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'Admin',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ruby-100 text-ruby-700 rounded-lg flex items-center justify-center text-xs font-bold">
            {getInitials(u.firstName, u.lastName)}
          </div>
          <div>
            <div className="font-medium text-gray-900">{u.firstName} {u.lastName}</div>
            <div className="text-xs text-gray-500">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-sm capitalize">{formatRole(u.roles?.[0] || 'admin')}</span>
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (u) => (
        <div>
          <span className="badge-neutral">{u.scope}</span>
          {u.scope === 'LOCATION' && u.locationIds?.length > 0 && (
            <div className="text-xs text-gray-400 mt-1">{u.locationIds.length} location(s)</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => {
        // Backend uses isActive boolean, normalize to status string
        const status = u.status || (u.isActive === false ? 'SUSPENDED' : 'ACTIVE');
        return <StatusBadge status={status} />;
      },
    },
    {
      key: 'created',
      header: 'Created',
      render: (u) => <span className="text-gray-500">{u.createdAt ? formatDate(u.createdAt) : '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (u) => {
        const isActive = u.isActive !== false && u.status !== 'SUSPENDED';
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleStatusToggle(u); }}
            className={`btn-sm ${isActive ? 'btn-ghost text-red-600 hover:bg-red-50' : 'btn-ghost text-emerald-600 hover:bg-emerald-50'}`}
          >
            {isActive ? 'Suspend' : 'Activate'}
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Admin Users"
        description="Manage admin accounts, roles, and location scopes"
        action={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary btn-sm gap-1.5">
            <Plus className="w-4 h-4" /> Add Admin
          </button>
        }
      />

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admins…"
            className="input-field pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered || []}
        meta={meta}
        isLoading={isLoading}
        currentPage={filters.page}
        onPageChange={(page) => setFilters({ ...filters, page })}
        emptyMessage="No admin users found."
      />

      <CreateAdminModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { setShowCreateModal(false); refetch(); }}
      />
    </div>
  );
}

function CreateAdminModal({
  isOpen, onClose, onCreated
}: { isOpen: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateAdminRequest>({
    email: '', password: '', firstName: '', lastName: '',
    roles: ['location_admin'], scope: 'LOCATION', locationIds: [],
  });
  const [locationIdInput, setLocationIdInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.adminUsers.create(form);
      toast.success('Admin created successfully');
      onCreated();
    } catch {
      toast.error('Failed to create admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLocationId = () => {
    if (locationIdInput.trim() && !form.locationIds.includes(locationIdInput.trim())) {
      setForm({ ...form, locationIds: [...form.locationIds, locationIdInput.trim()] });
      setLocationIdInput('');
    }
  };

  const removeLocationId = (id: string) => {
    setForm({ ...form, locationIds: form.locationIds.filter(l => l !== id) });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Admin User" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">First Name</label>
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="label-text">Last Name</label>
            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input-field" required />
          </div>
        </div>
        <div>
          <label className="label-text">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
        </div>
        <div>
          <label className="label-text">Password</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" required minLength={8} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Role</label>
            <select value={form.roles?.[0] || 'location_admin'} onChange={(e) => {
              const role = e.target.value as AdminRole;
              const scope: AdminScope = role === 'super_admin' ? 'GLOBAL' : 'LOCATION';
              setForm({ ...form, roles: [role], scope });
            }} className="input-field">
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="location_admin">Location Admin</option>
              <option value="support">Support</option>
              <option value="finance">Finance</option>
              <option value="content">Content</option>
            </select>
          </div>
          <div>
            <label className="label-text">Scope</label>
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as AdminScope })} className="input-field">
              <option value="GLOBAL">Global</option>
              <option value="LOCATION">Location</option>
            </select>
          </div>
        </div>
        {form.scope === 'LOCATION' && (
          <div>
            <label className="label-text">Location IDs</label>
            <div className="flex gap-2">
              <input value={locationIdInput} onChange={(e) => setLocationIdInput(e.target.value)} className="input-field flex-1" placeholder="Paste location ID" />
              <button type="button" onClick={addLocationId} className="btn-secondary btn-sm">Add</button>
            </div>
            {form.locationIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.locationIds.map(id => (
                  <span key={id} className="badge-neutral gap-1 cursor-pointer" onClick={() => removeLocationId(id)}>
                    {id.slice(-6)} ✕
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary btn-sm">
            {isSubmitting ? 'Creating…' : 'Create Admin'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
