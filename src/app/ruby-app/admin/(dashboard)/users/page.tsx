'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Shield, Search, Plus, Eye, Pencil, Power, PowerOff, Copy, Check,
  Users, Clock, Globe, ChevronDown, X, MapPin, RefreshCw,
  KeyRound, ExternalLink, AlertCircle, EyeOff, Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Modal, StatusBadge, StatCard, SearchableSelect } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { formatDate, formatDateTime, getInitials } from '@/lib/utils';
import type {
  AdminUser, AdminRole, AdminScope, CreateAdminRequest, UpdateAdminRequest,
  PaginationParams, Location,
} from '@/lib/types';

// ─── Helpers & Constants ────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  super_admin: { label: 'Super Admin', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  admin: { label: 'Admin', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  location_admin: { label: 'Location Admin', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  support: { label: 'Support', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  finance: { label: 'Finance', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  content: { label: 'Content', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
};

const ALL_ROLES: AdminRole[] = ['super_admin', 'admin', 'location_admin', 'support', 'finance', 'content'];

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] || { label: role, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
      <Shield className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function generateSecurePassword(length = 16): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '@$!%*?&';
  const all = upper + lower + digits + special;

  // Guarantee at least one of each required type
  const result: string[] = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  for (let i = result.length; i < length; i++) {
    result.push(all[Math.floor(Math.random() * all.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}

function getLocationNames(locationIds: AdminUser['locationIds']): string[] {
  return locationIds.map(loc => {
    if (typeof loc === 'object' && loc !== null) return loc.name;
    return loc;
  });
}

function getRawLocationIds(locationIds: AdminUser['locationIds']): string[] {
  return locationIds.map(loc => {
    if (typeof loc === 'object' && loc !== null) return loc._id;
    return loc;
  });
}

// ─── Inline UI Components ───────────────────────────────────

function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-gray-600" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {description && <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function DetailCard({ icon: Icon, label, value, mono }: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="w-3 h-3 text-gray-400" />}
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className={`text-sm text-gray-800 font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</p>
    </div>
  );
}

function ActionButton({
  icon: Icon, tooltip, onClick, variant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  onClick: (e: React.MouseEvent) => void;
  variant: 'default' | 'blue' | 'green' | 'amber' | 'red';
}) {
  const styles = {
    default: 'hover:bg-gray-100 text-gray-500 hover:text-gray-700',
    blue: 'hover:bg-blue-50 text-gray-500 hover:text-blue-600',
    green: 'hover:bg-emerald-50 text-gray-500 hover:text-emerald-600',
    amber: 'hover:bg-amber-50 text-gray-500 hover:text-amber-600',
    red: 'hover:bg-red-50 text-gray-500 hover:text-red-600',
  };

  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-all duration-200 ${styles[variant]}`}
      title={tooltip}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function CredentialRow({
  icon: Icon, label, value, onCopy, isCopied, sensitive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onCopy: () => void;
  isCopied: boolean;
  sensitive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-gray-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
          <p className={`text-sm font-medium mt-0.5 truncate ${sensitive ? 'font-mono text-ruby-700 bg-ruby-50 px-1.5 py-0.5 rounded inline-block' : 'text-gray-800'}`}>
            {value}
          </p>
        </div>
      </div>
      <button
        onClick={onCopy}
        className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-600 transition-all ml-2 shrink-0"
      >
        {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function AdminUsersPage() {
  const { isSuperAdmin } = useAuth();
  const [filters, setFilters] = useState<PaginationParams>({ page: 1, limit: 50 });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewAdmin, setViewAdmin] = useState<AdminUser | null>(null);
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [adminCreds, setAdminCreds] = useState<{ firstName: string; lastName: string; email: string; password: string; roles: AdminRole[] } | null>(null);

  const { data: users, isLoading, error, refetch } = useApi<AdminUser[]>(
    () => api.adminUsers.list(filters),
    [filters],
  );

  // Filter users client-side
  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          u.email.toLowerCase().includes(q) ||
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (roleFilter && !u.roles.includes(roleFilter as AdminRole)) return false;
      if (scopeFilter && u.scope !== scopeFilter) return false;
      return true;
    });
  }, [users, searchQuery, roleFilter, scopeFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!users) return { total: 0, active: 0, suspended: 0, locationAdmins: 0 };
    const active = users.filter(u => u.isActive !== false).length;
    const locationAdmins = users.filter(u => u.roles.includes('location_admin')).length;
    return {
      total: users.length,
      active,
      suspended: users.length - active,
      locationAdmins,
    };
  }, [users]);

  const handleStatusToggle = useCallback(async (user: AdminUser) => {
    const id = user._id || user.id;
    if (!id) return;
    const newActive = user.isActive === false;
    try {
      await api.adminUsers.update(id, { isActive: newActive });
      toast.success(`Admin ${newActive ? 'activated' : 'suspended'}`);
      refetch();
    } catch {
      toast.error('Failed to update admin status');
    }
  }, [refetch]);

  const handleCreated = useCallback((creds: typeof adminCreds) => {
    setShowCreateModal(false);
    setAdminCreds(creds);
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-ruby-500 to-ruby-700 rounded-xl flex items-center justify-center shadow-lg shadow-ruby-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage admin accounts, roles, and location scopes</p>
          </div>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 shadow-lg shadow-ruby-500/20 hover:shadow-ruby-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Admin</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Admins" value={stats.total} icon={Users} />
        <StatCard title="Active" value={stats.active} icon={Activity} className="border-l-4 border-l-emerald-500" />
        <StatCard title="Suspended" value={stats.suspended} icon={PowerOff} className="border-l-4 border-l-red-400" />
        <StatCard title="Location Admins" value={stats.locationAdmins} icon={MapPin} className="border-l-4 border-l-blue-400" />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="input-field pl-10 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer"
              >
                <option value="">All roles</option>
                {ALL_ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer"
              >
                <option value="">All scopes</option>
                <option value="GLOBAL">Global</option>
                <option value="LOCATION">Location</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="card p-6 border-red-200 bg-gradient-to-r from-red-50 to-red-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Failed to load admins</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={() => refetch()}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="card overflow-hidden">
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/5" />
                </div>
                <div className="h-6 w-16 bg-gray-100 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && (!users || users.length === 0) && (
        <div className="card p-16 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-gray-200">
            <Shield className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No admin users yet</h3>
          <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
            Create your first admin user to start managing the platform.
          </p>
          {isSuperAdmin && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create First Admin
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && users && users.length > 0 && (
        <div className="card overflow-hidden">
          {/* Table Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Admin Users</h3>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  {filtered.length} of {users.length}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Scope</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-500">No admins match your filters</p>
                      <p className="text-xs text-gray-400 mt-1">Try a different search or filter</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(user => {
                    const isActive = user.isActive !== false;
                    const role = user.roles?.[0] || 'admin';
                    const locationCount = user.locationIds?.length || 0;

                    return (
                      <tr
                        key={user._id || user.id}
                        className="group hover:bg-gray-50/80 transition-colors cursor-pointer"
                        onClick={() => setViewAdmin(user)}
                      >
                        {/* Admin */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-ruby-400 to-ruby-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm">
                              {getInitials(user.firstName, user.lastName)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">{user.firstName} {user.lastName}</div>
                              <div className="text-xs text-gray-400">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-3.5">
                          <RoleBadge role={role} />
                        </td>

                        {/* Scope */}
                        <td className="px-5 py-3.5">
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              user.scope === 'GLOBAL'
                                ? 'text-purple-700 bg-purple-50 border border-purple-200'
                                : 'text-blue-700 bg-blue-50 border border-blue-200'
                            }`}>
                              {user.scope === 'GLOBAL' ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                              {user.scope}
                            </span>
                            {user.scope === 'LOCATION' && locationCount > 0 && (
                              <div className="text-[10px] text-gray-400 mt-1">{locationCount} location{locationCount !== 1 ? 's' : ''}</div>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            {isActive ? 'Active' : 'Suspended'}
                          </div>
                        </td>

                        {/* Last Login */}
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-500">
                            {user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}
                          </span>
                        </td>

                        {/* Created */}
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-500">
                            {user.createdAt ? formatDate(user.createdAt) : '—'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <ActionButton
                              icon={Eye}
                              tooltip="View details"
                              onClick={(e) => { e.stopPropagation(); setViewAdmin(user); }}
                              variant="default"
                            />
                            {isSuperAdmin && (
                              <>
                                <ActionButton
                                  icon={Pencil}
                                  tooltip="Edit"
                                  onClick={(e) => { e.stopPropagation(); setEditAdmin(user); }}
                                  variant="blue"
                                />
                                {isActive ? (
                                  <ActionButton
                                    icon={PowerOff}
                                    tooltip="Suspend"
                                    onClick={(e) => { e.stopPropagation(); handleStatusToggle(user); }}
                                    variant="red"
                                  />
                                ) : (
                                  <ActionButton
                                    icon={Power}
                                    tooltip="Activate"
                                    onClick={(e) => { e.stopPropagation(); handleStatusToggle(user); }}
                                    variant="green"
                                  />
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateAdminModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />

      {viewAdmin && (
        <ViewAdminModal
          admin={viewAdmin}
          onClose={() => setViewAdmin(null)}
          onEdit={() => { setEditAdmin(viewAdmin); setViewAdmin(null); }}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {editAdmin && (
        <EditAdminModal
          admin={editAdmin}
          onClose={() => setEditAdmin(null)}
          onUpdated={() => { setEditAdmin(null); refetch(); }}
        />
      )}

      {adminCreds && (
        <AdminCredentialsModal
          credentials={adminCreds}
          onClose={() => setAdminCreds(null)}
        />
      )}
    </div>
  );
}

// ─── Create Admin Modal ─────────────────────────────────────

function CreateAdminModal({
  isOpen, onClose, onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (creds: { firstName: string; lastName: string; email: string; password: string; roles: AdminRole[] }) => void;
}) {
  const [form, setForm] = useState<CreateAdminRequest>({
    email: '', password: '', firstName: '', lastName: '',
    roles: ['location_admin'], scope: 'LOCATION', locationIds: [],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch city locations for the searchable select
  const { data: cityLocations } = useApi<Location[]>(
    () => api.locations.list({ limit: 200, type: 'CITY' }),
    [],
    { enabled: isOpen },
  );

  const locationOptions: SelectOption[] = useMemo(() => {
    if (!cityLocations) return [];
    return cityLocations.map(loc => ({
      value: loc._id,
      label: loc.name,
      description: `${loc.type} · ${loc.countryCode}`,
    }));
  }, [cityLocations]);

  const selectedRole = form.roles[0] || 'location_admin';

  // Auto-set scope based on role
  const handleRoleSelect = useCallback((role: AdminRole) => {
    let scope: AdminScope = form.scope;
    if (role === 'super_admin') scope = 'GLOBAL';
    else if (role === 'location_admin') scope = 'LOCATION';

    setForm(prev => ({
      ...prev,
      roles: [role],
      scope,
      locationIds: scope === 'GLOBAL' ? [] : prev.locationIds,
    }));
  }, [form.scope]);

  // Handle city selection → auto-generate credentials
  const handleLocationSelect = useCallback((locId: string) => {
    if (form.locationIds.includes(locId)) return;

    const location = cityLocations?.find(l => l._id === locId);
    const isFirstSelection = form.locationIds.length === 0;
    const newLocationIds = [...form.locationIds, locId];

    if (isFirstSelection && location) {
      const citySlug = location.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '');
      const password = generateSecurePassword();
      setForm(prev => ({
        ...prev,
        locationIds: newLocationIds,
        email: `${citySlug}.admin@rubyplus.com`,
        firstName: location.name,
        lastName: 'Admin',
        password,
      }));
    } else {
      setForm(prev => ({ ...prev, locationIds: newLocationIds }));
    }
  }, [form.locationIds, cityLocations]);

  const removeLocation = useCallback((locId: string) => {
    setForm(prev => ({
      ...prev,
      locationIds: prev.locationIds.filter(id => id !== locId),
    }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      email: '', password: '', firstName: '', lastName: '',
      roles: ['location_admin'], scope: 'LOCATION', locationIds: [],
    });
    setShowPassword(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.adminUsers.create(form);
      toast.success('Admin created successfully');
      const creds = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        roles: form.roles,
      };
      resetForm();
      onCreated(creds);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create admin';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); resetForm(); }} title="Create Admin User" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role & Scope */}
        <div className="space-y-4">
          <SectionHeader icon={Shield} title="Role & Scope" description="Select role and access scope" />

          <div>
            <label className="label-text">Admin Role</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_ROLES.map(role => {
                const cfg = ROLE_CONFIG[role];
                const selected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                      selected
                        ? `${cfg.bg} ${cfg.color} border-current ring-2 ring-offset-1 ring-current`
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label-text">Access Scope</label>
            {selectedRole === 'super_admin' ? (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-purple-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  Super Admin always has <strong>GLOBAL</strong> scope
                </p>
              </div>
            ) : selectedRole === 'location_admin' ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  Location Admin always has <strong>LOCATION</strong> scope
                </p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={form.scope}
                  onChange={(e) => {
                    const scope = e.target.value as AdminScope;
                    setForm(prev => ({
                      ...prev,
                      scope,
                      locationIds: scope === 'GLOBAL' ? [] : prev.locationIds,
                    }));
                  }}
                  className="input-field w-full pr-8 appearance-none cursor-pointer"
                >
                  <option value="GLOBAL">Global</option>
                  <option value="LOCATION">Location</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Location Assignment */}
        {form.scope === 'LOCATION' && (
          <div className="space-y-4">
            <SectionHeader icon={MapPin} title="Location Assignment" description="Select cities to assign to this admin" />

            <SearchableSelect
              options={locationOptions}
              value=""
              onChange={handleLocationSelect}
              placeholder="Search for a city..."
              icon={<MapPin className="w-3.5 h-3.5" />}
            />

            {form.locationIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.locationIds.map(locId => {
                  const loc = cityLocations?.find(l => l._id === locId);
                  return (
                    <span
                      key={locId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium"
                    >
                      <MapPin className="w-3 h-3" />
                      {loc?.name || locId.slice(-8)}
                      <button
                        type="button"
                        onClick={() => removeLocation(locId)}
                        className="hover:text-blue-900 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {form.locationIds.length > 0 && form.email && (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Auto-generated credentials from first selected city
              </p>
            )}
          </div>
        )}

        {/* Credentials */}
        <div className="space-y-4">
          <SectionHeader icon={KeyRound} title="Credentials" description="Auto-filled from city selection, still editable" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">First Name</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="input-field"
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="label-text">Last Name</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="input-field"
                placeholder="Last name"
                required
              />
            </div>
          </div>

          <div>
            <label className="label-text">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="admin@rubyplus.com"
              required
            />
          </div>

          <div>
            <label className="label-text">Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pr-20"
                  placeholder="Auto-generated or type your own"
                  required
                  minLength={8}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title={showPassword ? 'Hide' : 'Show'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(form.password);
                      toast.success('Password copied');
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, password: generateSecurePassword() })}
                className="btn-secondary flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Generate
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-5 border-t border-gray-200">
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <KeyRound className="w-3 h-3" />
            Credentials will be shown after creation
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { onClose(); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Admin
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── View Admin Modal ───────────────────────────────────────

function ViewAdminModal({
  admin, onClose, onEdit, isSuperAdmin,
}: {
  admin: AdminUser;
  onClose: () => void;
  onEdit: () => void;
  isSuperAdmin: boolean;
}) {
  const isActive = admin.isActive !== false;
  const role = admin.roles?.[0] || 'admin';
  const locationNames = getLocationNames(admin.locationIds || []);

  return (
    <Modal isOpen onClose={onClose} title="Admin Details" size="lg">
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
          <div className="w-14 h-14 bg-gradient-to-br from-ruby-500 to-ruby-700 rounded-xl flex items-center justify-center shadow-lg shadow-ruby-500/20 shrink-0">
            <span className="text-xl font-bold text-white">
              {getInitials(admin.firstName, admin.lastName)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h3 className="text-xl font-bold text-gray-900 truncate">{admin.firstName} {admin.lastName}</h3>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {isActive ? 'Active' : 'Suspended'}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
              <RoleBadge role={role} />
              <span className="text-gray-300">|</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                admin.scope === 'GLOBAL' ? 'text-purple-600' : 'text-blue-600'
              }`}>
                {admin.scope === 'GLOBAL' ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                {admin.scope}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-400">{admin.email}</span>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div>
          <SectionHeader icon={Users} title="Account Information" />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <DetailCard icon={ExternalLink} label="Email" value={admin.email} />
            <DetailCard icon={Shield} label="Role" value={ROLE_CONFIG[role]?.label || role} />
            <DetailCard icon={admin.scope === 'GLOBAL' ? Globe : MapPin} label="Scope" value={admin.scope} />
            <DetailCard icon={Clock} label="Created" value={admin.createdAt ? formatDate(admin.createdAt) : '—'} />
            <DetailCard icon={Clock} label="Last Login" value={admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : 'Never'} />
            <DetailCard icon={Activity} label="Status" value={isActive ? 'Active' : 'Suspended'} />
          </div>
        </div>

        {/* Location Assignments */}
        {admin.scope === 'LOCATION' && admin.locationIds && admin.locationIds.length > 0 && (
          <div>
            <SectionHeader icon={MapPin} title="Location Assignments" description={`${admin.locationIds.length} assigned location${admin.locationIds.length !== 1 ? 's' : ''}`} />
            <div className="grid grid-cols-2 gap-3 mt-4">
              {admin.locationIds.map((loc, idx) => {
                const isObject = typeof loc === 'object' && loc !== null;
                const name = isObject ? loc.name : locationNames[idx];
                const locType = isObject ? loc.type : undefined;
                const locStatus = isObject ? loc.status : undefined;

                return (
                  <div key={isObject ? loc._id : loc} className="p-3 bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-200 transition-colors">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-blue-800 truncate">{name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {locType && (
                            <span className="text-[10px] text-blue-500 font-medium">{locType}</span>
                          )}
                          {locStatus && (
                            <span className={`text-[10px] font-medium ${locStatus === 'ACTIVE' ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {locStatus}
                            </span>
                          )}
                          {!isObject && (
                            <span className="text-[10px] text-blue-400 font-mono">{(loc as string).slice(-8)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center gap-6 pt-4 border-t border-gray-100 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Created: {admin.createdAt ? formatDateTime(admin.createdAt) : '—'}
          </span>
          <span className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Updated: {admin.updatedAt ? formatDateTime(admin.updatedAt) : '—'}
          </span>
        </div>

        {/* Actions */}
        {isSuperAdmin && (
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button onClick={onEdit} className="btn-primary flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit Admin
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Edit Admin Modal ───────────────────────────────────────

function EditAdminModal({
  admin, onClose, onUpdated,
}: {
  admin: AdminUser;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState<UpdateAdminRequest>({
    firstName: admin.firstName,
    lastName: admin.lastName,
    phone: admin.phone || '',
    roles: admin.roles,
    scope: admin.scope,
    locationIds: getRawLocationIds(admin.locationIds || []),
  });
  const [password, setPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch city locations
  const { data: cityLocations } = useApi<Location[]>(
    () => api.locations.list({ limit: 200, type: 'CITY' }),
    [],
  );

  const locationOptions: SelectOption[] = useMemo(() => {
    if (!cityLocations) return [];
    return cityLocations.map(loc => ({
      value: loc._id,
      label: loc.name,
      description: `${loc.type} · ${loc.countryCode}`,
    }));
  }, [cityLocations]);

  const selectedRole = form.roles?.[0] || 'admin';

  const handleRoleSelect = useCallback((role: AdminRole) => {
    let scope: AdminScope = form.scope || 'LOCATION';
    if (role === 'super_admin') scope = 'GLOBAL';
    else if (role === 'location_admin') scope = 'LOCATION';

    setForm(prev => ({
      ...prev,
      roles: [role],
      scope,
      locationIds: scope === 'GLOBAL' ? [] : prev.locationIds,
    }));
  }, [form.scope]);

  const handleLocationSelect = useCallback((locId: string) => {
    if (form.locationIds?.includes(locId)) return;
    setForm(prev => ({
      ...prev,
      locationIds: [...(prev.locationIds || []), locId],
    }));
  }, [form.locationIds]);

  const removeLocation = useCallback((locId: string) => {
    setForm(prev => ({
      ...prev,
      locationIds: (prev.locationIds || []).filter(id => id !== locId),
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const id = admin._id || admin.id;
    if (!id) return;

    try {
      const payload: UpdateAdminRequest = { ...form };
      if (password) payload.password = password;

      await api.adminUsers.update(id, payload);
      toast.success('Admin updated successfully');
      onUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update admin';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Edit: ${admin.firstName} ${admin.lastName}`} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="space-y-4">
          <SectionHeader icon={Users} title="Personal Information" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">First Name</label>
              <input
                value={form.firstName || ''}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-text">Last Name</label>
              <input
                value={form.lastName || ''}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>
          <div>
            <label className="label-text">Phone</label>
            <input
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field"
              placeholder="+234..."
            />
          </div>
        </div>

        {/* Role & Access */}
        <div className="space-y-4">
          <SectionHeader icon={Shield} title="Role & Access" />

          <div>
            <label className="label-text">Admin Role</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_ROLES.map(role => {
                const cfg = ROLE_CONFIG[role];
                const selected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                      selected
                        ? `${cfg.bg} ${cfg.color} border-current ring-2 ring-offset-1 ring-current`
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedRole !== 'super_admin' && selectedRole !== 'location_admin' && (
            <div>
              <label className="label-text">Access Scope</label>
              <div className="relative">
                <select
                  value={form.scope}
                  onChange={(e) => {
                    const scope = e.target.value as AdminScope;
                    setForm(prev => ({
                      ...prev,
                      scope,
                      locationIds: scope === 'GLOBAL' ? [] : prev.locationIds,
                    }));
                  }}
                  className="input-field w-full pr-8 appearance-none cursor-pointer"
                >
                  <option value="GLOBAL">Global</option>
                  <option value="LOCATION">Location</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {form.scope === 'LOCATION' && (
            <div className="space-y-3">
              <label className="label-text">Location Assignment</label>
              <SearchableSelect
                options={locationOptions}
                value=""
                onChange={handleLocationSelect}
                placeholder="Search for a city..."
                icon={<MapPin className="w-3.5 h-3.5" />}
              />
              {form.locationIds && form.locationIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.locationIds.map(locId => {
                    const loc = cityLocations?.find(l => l._id === locId);
                    return (
                      <span
                        key={locId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium"
                      >
                        <MapPin className="w-3 h-3" />
                        {loc?.name || locId.slice(-8)}
                        <button
                          type="button"
                          onClick={() => removeLocation(locId)}
                          className="hover:text-blue-900 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Password Reset (collapsible) */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Password Reset</span>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">OPTIONAL</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showPasswordSection ? 'rotate-180' : ''}`} />
          </button>
          {showPasswordSection && (
            <div className="p-4 border-t border-gray-200 bg-white space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Leave blank to keep the current password. Setting a new password is irreversible.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-20"
                    placeholder="New password (leave blank to keep current)"
                    minLength={8}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {password && (
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(password); toast.success('Password copied'); }}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPassword(generateSecurePassword())}
                  className="btn-secondary flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Generate
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Admin Credentials Modal ────────────────────────────────

function AdminCredentialsModal({
  credentials: creds, onClose,
}: {
  credentials: { firstName: string; lastName: string; email: string; password: string; roles: AdminRole[] };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success(`${field} copied`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Modal isOpen onClose={onClose} title="Admin Created Successfully" size="md">
      <div className="space-y-5">
        {/* Success Banner */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Admin account created
              </p>
              <p className="text-xs text-emerald-600 mt-1 leading-relaxed">
                Save these credentials securely. The password cannot be retrieved after closing this dialog.
              </p>
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="space-y-2">
          <CredentialRow
            icon={Users}
            label="Full Name"
            value={`${creds.firstName} ${creds.lastName}`}
            onCopy={() => copyToClipboard(`${creds.firstName} ${creds.lastName}`, 'Name')}
            isCopied={copied === 'Name'}
          />
          <CredentialRow
            icon={ExternalLink}
            label="Email Address"
            value={creds.email}
            onCopy={() => copyToClipboard(creds.email, 'Email')}
            isCopied={copied === 'Email'}
          />
          <CredentialRow
            icon={KeyRound}
            label="Password"
            value={creds.password}
            onCopy={() => copyToClipboard(creds.password, 'Password')}
            isCopied={copied === 'Password'}
            sensitive
          />
          <CredentialRow
            icon={Shield}
            label="Assigned Role"
            value={creds.roles.map(r => ROLE_CONFIG[r]?.label || r).join(', ')}
            onCopy={() => copyToClipboard(creds.roles.join(', '), 'Role')}
            isCopied={copied === 'Role'}
          />
        </div>

        {/* Copy All */}
        <button
          onClick={() => {
            const text = `Admin Credentials\n${'─'.repeat(30)}\nName: ${creds.firstName} ${creds.lastName}\nEmail: ${creds.email}\nPassword: ${creds.password}\nRole: ${creds.roles.map(r => ROLE_CONFIG[r]?.label || r).join(', ')}`;
            navigator.clipboard.writeText(text);
            toast.success('All credentials copied');
          }}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy All Credentials
        </button>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary">Done</button>
        </div>
      </div>
    </Modal>
  );
}
