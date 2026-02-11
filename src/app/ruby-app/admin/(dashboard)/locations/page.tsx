'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  MapPin, Search, Plus, Power, PowerOff, Clock, Eye, Pencil, Trash2,
  Copy, Check, Globe, ChevronRight, Shield, X, Building2, Activity,
  AlertCircle, Layers, Navigation, DollarSign, Languages, Truck,
  Percent, Hash, Flag, Users, Phone, BarChart3, RefreshCw,
  ChevronDown, ExternalLink, KeyRound, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, StatusBadge, Modal, StatCard, SearchableSelect } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  getAfricanCountries, getCountryByCode, getStatesOfCountry,
  getCitiesOfState, getLanguageForCountry,
  ALL_CURRENCIES, ALL_LANGUAGES,
} from '@/lib/data/countries';
import { geocodeSearch } from '@/lib/geocoding';
import type {
  Location, CreateLocationRequest, CreateLocationResponse,
  UpdateLocationRequest, LocationFilterParams, DeliveryConfig, PlatformFees,
} from '@/lib/types';

// ─── Helpers ────────────────────────────────────────────────
function getParentName(loc: Location): string | null {
  if (!loc.parentId) return null;
  if (typeof loc.parentId === 'object') return loc.parentId.name;
  return null;
}

function getParentId(loc: Location): string | null {
  if (!loc.parentId) return null;
  if (typeof loc.parentId === 'object') return loc.parentId._id;
  return loc.parentId;
}

function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return '';
  return String.fromCodePoint(
    ...upper.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; border: string; gradient: string }> = {
  COUNTRY: { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', gradient: 'from-purple-500 to-purple-700' },
  STATE: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', gradient: 'from-blue-500 to-blue-700' },
  CITY: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', gradient: 'from-emerald-500 to-emerald-700' },
  AREA: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', gradient: 'from-amber-500 to-amber-700' },
};

const DEPTH_COLORS = [
  'border-l-purple-400',
  'border-l-blue-400',
  'border-l-emerald-400',
  'border-l-amber-400',
];

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.AREA;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
      <Layers className="w-3 h-3" />
      {type}
    </span>
  );
}

// ─── Tree Building ──────────────────────────────────────────
interface TreeNode {
  location: Location;
  children: TreeNode[];
}

function buildTree(locations: Location[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes
  locations.forEach(loc => {
    map.set(loc._id, { location: loc, children: [] });
  });

  // Link children to parents
  locations.forEach(loc => {
    const node = map.get(loc._id)!;
    const parentId = getParentId(loc);
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort: countries first, then states, cities, areas. Within same type, sort by displayOrder then name
  const typeOrder = { COUNTRY: 0, STATE: 1, CITY: 2, AREA: 3 };
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const ta = typeOrder[a.location.type as keyof typeof typeOrder] ?? 99;
      const tb = typeOrder[b.location.type as keyof typeof typeOrder] ?? 99;
      if (ta !== tb) return ta - tb;
      const oa = a.location.displayOrder ?? 999;
      const ob = b.location.displayOrder ?? 999;
      if (oa !== ob) return oa - ob;
      return a.location.name.localeCompare(b.location.name);
    });
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query.trim()) return nodes;
  const q = query.toLowerCase();

  function matches(node: TreeNode): boolean {
    const loc = node.location;
    if (loc.name.toLowerCase().includes(q)) return true;
    if (loc.countryCode.toLowerCase().includes(q)) return true;
    if (loc.slug.toLowerCase().includes(q)) return true;
    return node.children.some(matches);
  }

  function prune(nodes: TreeNode[]): TreeNode[] {
    return nodes
      .filter(matches)
      .map(node => ({
        ...node,
        children: prune(node.children),
      }));
  }

  return prune(nodes);
}

// ─── Main Page ──────────────────────────────────────────────
export default function LocationsPage() {
  const { isSuperAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewLocation, setViewLocation] = useState<Location | null>(null);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [adminCreds, setAdminCreds] = useState<CreateLocationResponse['adminCredentials'] | null>(null);

  // Fetch all locations across pages to build complete tree
  const fetchAllLocations = useCallback(async () => {
    const allLocations: Location[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const res = await api.locations.list({
        page,
        limit,
        status: (statusFilter || undefined) as Location['status'] | undefined,
        type: (typeFilter || undefined) as Location['type'] | undefined,
      });
      const items = res.data;
      allLocations.push(...(Array.isArray(items) ? items : []));
      const total = res.meta?.total || 0;
      hasMore = allLocations.length < total;
      page++;
    }

    return { success: true, data: allLocations } as import('@/lib/types').ApiResponse<Location[]>;
  }, [statusFilter, typeFilter]);

  const { data: locations, isLoading, error, refetch } = useApi<Location[]>(
    fetchAllLocations,
    [statusFilter, typeFilter],
  );

  const { mutate: activateLocation } = useMutation((id: string) => api.locations.activate(id));
  const { mutate: deactivateLocation } = useMutation((id: string) => api.locations.deactivate(id));
  const { mutate: deleteLocation } = useMutation((id: string) => api.locations.delete(id));

  // Stats
  const stats = useMemo(() => {
    if (!locations) return { total: 0, active: 0, inactive: 0, types: {} as Record<string, number> };
    const active = locations.filter(l => l.status === 'ACTIVE').length;
    const types: Record<string, number> = {};
    locations.forEach(l => { types[l.type] = (types[l.type] || 0) + 1; });
    return { total: locations.length, active, inactive: locations.length - active, types };
  }, [locations]);

  // Build tree
  const tree = useMemo(() => {
    if (!locations) return [];
    return buildTree(locations);
  }, [locations]);

  // Filter tree by search
  const filteredTree = useMemo(() => {
    return filterTree(tree, searchQuery);
  }, [tree, searchQuery]);

  // Auto-expand all when searching
  useEffect(() => {
    if (searchQuery && locations) {
      const allIds = new Set(locations.map(l => l._id));
      setExpanded(allIds);
    }
  }, [searchQuery, locations]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!locations) return;
    setExpanded(new Set(locations.map(l => l._id)));
  }, [locations]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const handleActivate = useCallback(async (id: string) => {
    const result = await activateLocation(id);
    if (result) { toast.success('Location activated'); refetch(); }
  }, [activateLocation, refetch]);

  const handleDeactivate = useCallback(async (id: string) => {
    const result = await deactivateLocation(id);
    if (result) { toast.success('Location deactivated'); refetch(); }
  }, [deactivateLocation, refetch]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteLocation(deleteTarget._id);
      toast.success('Location deleted');
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error('Failed to delete location. It may have child locations.');
    }
  }, [deleteTarget, deleteLocation, refetch]);

  const handleCreated = useCallback((res: CreateLocationResponse) => {
    setShowCreateModal(false);
    setAdminCreds(res.adminCredentials);
    refetch();
    toast.success('Location created successfully');
  }, [refetch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-ruby-500 to-ruby-700 rounded-xl flex items-center justify-center shadow-lg shadow-ruby-500/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage platform locations, activation status, and admins</p>
            </div>
          </div>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 shadow-lg shadow-ruby-500/20 hover:shadow-ruby-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Location</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Locations" value={stats.total} icon={MapPin} />
        <StatCard
          title="Active"
          value={stats.active}
          icon={Activity}
          className="border-l-4 border-l-emerald-500"
        />
        <StatCard
          title="Inactive"
          value={stats.inactive}
          icon={PowerOff}
          className="border-l-4 border-l-gray-400"
        />
        <StatCard
          title="Location Types"
          value={Object.keys(stats.types).length}
          icon={Layers}
          trend={Object.entries(stats.types).map(([t, c]) => `${c} ${t.toLowerCase()}`).join(', ') || undefined}
        />
      </div>

      {/* Filters Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, slug, or country code..."
              className="input-field pl-10 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input-field w-auto pr-8 bg-gray-50 border-gray-200 appearance-none cursor-pointer"
              >
                <option value="">All types</option>
                <option value="COUNTRY">Country</option>
                <option value="STATE">State</option>
                <option value="CITY">City</option>
                <option value="AREA">Area</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
              <button
                onClick={expandAll}
                className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                title="Expand all"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={collapseAll}
                className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                title="Collapse all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
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
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="card p-6 border-red-200 bg-gradient-to-r from-red-50 to-red-50/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Failed to load locations</h3>
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

      {/* Loading State */}
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

      {/* Empty State */}
      {!isLoading && !error && (!locations || locations.length === 0) && (
        <div className="card p-16 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-gray-200">
            <Globe className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No locations yet</h3>
          <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
            Locations are geographic units where Ruby+ operates. Create your first location to start
            managing businesses, orders, and services in that area.
          </p>
          {isSuperAdmin ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-2 shadow-lg shadow-ruby-500/20"
            >
              <Plus className="w-4 h-4" />
              Create Your First Location
            </button>
          ) : (
            <p className="text-xs text-gray-400 flex items-center gap-1.5 justify-center">
              <Shield className="w-3.5 h-3.5" />
              Only Super Admins can create locations
            </p>
          )}
        </div>
      )}

      {/* Hierarchy Tree */}
      {!isLoading && !error && locations && locations.length > 0 && (
        <div className="card overflow-hidden">
          {/* Tree Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Location Hierarchy</h3>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  {locations.length} total
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                {Object.entries(stats.types).map(([type, count]) => {
                  const cfg = TYPE_CONFIG[type];
                  return (
                    <span key={type} className={`flex items-center gap-1 ${cfg?.color || 'text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg?.bg || 'bg-gray-200'}`} style={{ backgroundColor: cfg ? undefined : '#9CA3AF' }} />
                      {count} {type.charAt(0) + type.slice(1).toLowerCase()}
                      {count !== 1 ? 's' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tree Content */}
          <div className="divide-y divide-gray-50">
            {filteredTree.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No locations match your search</p>
                <p className="text-xs text-gray-400 mt-1">Try a different keyword</p>
              </div>
            ) : (
              filteredTree.map(node => (
                <TreeNodeRow
                  key={node.location._id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  onView={setViewLocation}
                  onEdit={setEditLocation}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                  onDelete={setDeleteTarget}
                  isSuperAdmin={isSuperAdmin}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateLocationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
        existingLocations={locations || []}
      />

      {viewLocation && (
        <ViewLocationModal
          location={viewLocation}
          onClose={() => setViewLocation(null)}
          onEdit={() => { setEditLocation(viewLocation); setViewLocation(null); }}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {editLocation && (
        <EditLocationModal
          location={editLocation}
          onClose={() => setEditLocation(null)}
          onUpdated={() => { setEditLocation(null); refetch(); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          location={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
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

// ─── Tree Node Row ──────────────────────────────────────────
function TreeNodeRow({
  node,
  depth,
  expanded,
  onToggle,
  onView,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
  isSuperAdmin,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onView: (loc: Location) => void;
  onEdit: (loc: Location) => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onDelete: (loc: Location) => void;
  isSuperAdmin: boolean;
}) {
  const loc = node.location;
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(loc._id);
  const cfg = TYPE_CONFIG[loc.type] || TYPE_CONFIG.AREA;
  const isActive = loc.status === 'ACTIVE';

  return (
    <div>
      {/* Node Row */}
      <div
        className={`group flex items-center gap-3 px-5 py-3 hover:bg-gray-50/80 transition-all duration-150 cursor-pointer ${
          depth > 0 ? `border-l-2 ${DEPTH_COLORS[Math.min(depth - 1, 3)]}` : ''
        }`}
        style={{ paddingLeft: `${20 + depth * 32}px` }}
        onClick={() => onView(loc)}
      >
        {/* Expand/Collapse Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(loc._id);
          }}
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
            hasChildren
              ? 'hover:bg-gray-200/80 text-gray-500 hover:text-gray-700'
              : 'text-transparent cursor-default'
          }`}
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            } ${!hasChildren ? 'opacity-0' : ''}`}
          />
        </button>

        {/* Country Flag */}
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
          <span className="text-lg leading-none">{loc.metadata?.flagEmoji || countryCodeToFlag(loc.countryCode)}</span>
        </div>

        {/* Name & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 truncate text-sm">{loc.name}</span>
            <TypeBadge type={loc.type} />
            {hasChildren && (
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">
                {node.children.length} {node.children.length === 1 ? 'child' : 'children'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Flag className="w-3 h-3" />
              {loc.countryCode}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {loc.defaultCurrency}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {loc.timezone}
            </span>
            {loc.metadata?.population && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {loc.metadata.population.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {isActive ? 'Active' : 'Inactive'}
          </div>
        </div>

        {/* Actions */}
        {isSuperAdmin && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
            <ActionButton
              icon={Eye}
              tooltip="View details"
              onClick={(e) => { e.stopPropagation(); onView(loc); }}
              variant="default"
            />
            <ActionButton
              icon={Pencil}
              tooltip="Edit"
              onClick={(e) => { e.stopPropagation(); onEdit(loc); }}
              variant="blue"
            />
            {loc.status === 'INACTIVE' ? (
              <ActionButton
                icon={Power}
                tooltip="Activate"
                onClick={(e) => { e.stopPropagation(); onActivate(loc._id); }}
                variant="green"
              />
            ) : (
              <ActionButton
                icon={PowerOff}
                tooltip="Deactivate"
                onClick={(e) => { e.stopPropagation(); onDeactivate(loc._id); }}
                variant="amber"
              />
            )}
            <ActionButton
              icon={Trash2}
              tooltip="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete(loc); }}
              variant="red"
            />
          </div>
        )}
      </div>

      {/* Children (animated) */}
      {hasChildren && isExpanded && (
        <div className="animate-fade-in">
          {node.children.map(child => (
            <TreeNodeRow
              key={child.location._id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onView={onView}
              onEdit={onEdit}
              onActivate={onActivate}
              onDeactivate={onDeactivate}
              onDelete={onDelete}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Action Button ──────────────────────────────────────────
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
      className={`group relative p-2 rounded-lg transition-all duration-200 ${styles[variant]}`}
      title={tooltip}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ─── Section Divider ────────────────────────────────────────
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

// ─── Create Location Modal (Smart Form) ─────────────────────
function CreateLocationModal({
  isOpen, onClose, onCreated, existingLocations,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (res: CreateLocationResponse) => void;
  existingLocations: Location[];
}) {
  const [form, setForm] = useState<CreateLocationRequest>({
    name: '', slug: '', type: 'COUNTRY', countryCode: '',
    centerLat: 0, centerLng: 0, timezone: '',
    defaultCurrency: '', supportedCurrencies: [],
    defaultLanguage: 'en', supportedLanguages: ['en'],
  });
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [selectedStateCode, setSelectedStateCode] = useState('');
  const [showDelivery, setShowDelivery] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);

  const resetForm = () => {
    setForm({
      name: '', slug: '', type: 'COUNTRY', countryCode: '',
      centerLat: 0, centerLng: 0, timezone: '',
      defaultCurrency: '', supportedCurrencies: [],
      defaultLanguage: 'en', supportedLanguages: ['en'],
    });
    setSelectedCountryCode('');
    setSelectedStateCode('');
    setShowDelivery(false);
    setShowFees(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Build titles object from name + default language (backend requires it)
      const lang = form.defaultLanguage || 'en';
      const titles: Record<string, string> = { [lang]: form.name };
      if (lang !== 'en') titles.en = form.name; // always include English

      const res = await api.locations.create({ ...form, titles });
      onCreated(res.data);
      resetForm();
    } catch {
      toast.error('Failed to create location');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Derived option lists ──────────────────
  const countryOptions: SelectOption[] = useMemo(() =>
    getAfricanCountries().map(c => ({
      value: c.isoCode,
      label: c.name,
      icon: c.flag,
      description: `${c.isoCode} · ${c.currency} · ${c.timezones?.[0]?.zoneName || ''}`,
    })),
  []);

  const stateOptions: SelectOption[] = useMemo(() => {
    if (!selectedCountryCode) return [];
    return getStatesOfCountry(selectedCountryCode).map(s => ({
      value: s.isoCode,
      label: s.name,
      description: `${s.countryCode} · ${s.isoCode}`,
    }));
  }, [selectedCountryCode]);

  const cityOptions: SelectOption[] = useMemo(() => {
    if (!selectedCountryCode || !selectedStateCode) return [];
    return getCitiesOfState(selectedCountryCode, selectedStateCode).map(c => ({
      value: c.name,
      label: c.name,
      description: `${c.stateCode} · ${c.countryCode}`,
    }));
  }, [selectedCountryCode, selectedStateCode]);

  // Existing parent locations for STATE and CITY types
  const existingCountries: SelectOption[] = useMemo(() =>
    existingLocations.filter(l => l.type === 'COUNTRY').map(l => ({
      value: l._id,
      label: l.name,
      icon: l.metadata?.flagEmoji || countryCodeToFlag(l.countryCode),
      description: l.countryCode,
    })),
  [existingLocations]);

  const existingStates: SelectOption[] = useMemo(() =>
    existingLocations.filter(l => l.type === 'STATE').map(l => ({
      value: l._id,
      label: l.name,
      icon: l.metadata?.flagEmoji || countryCodeToFlag(l.countryCode),
      description: l.countryCode,
    })),
  [existingLocations]);

  const currencyOptions: SelectOption[] = useMemo(() =>
    ALL_CURRENCIES.map(c => ({ value: c.code, label: `${c.code} — ${c.name}`, description: c.name })),
  []);

  const languageOptions: SelectOption[] = useMemo(() =>
    ALL_LANGUAGES.map(l => ({ value: l.code, label: `${l.name} (${l.code})`, description: l.code })),
  []);

  // ─── Helper: fetch precise coordinates from Nominatim ──
  const fetchPreciseCoords = useCallback(async (name: string, countryCode?: string) => {
    setIsGeolocating(true);
    try {
      const results = await geocodeSearch(name, countryCode);
      if (results.length > 0) {
        const best = results[0];
        setForm(prev => ({
          ...prev,
          centerLat: best.lat,
          centerLng: best.lng,
          ...(best.bounds ? { bounds: best.bounds } : {}),
        }));
      }
    } catch {
      // Geocoding failed silently — user can still edit manually
    } finally {
      setIsGeolocating(false);
    }
  }, []);

  // ─── Helper: inherit from parent location ──
  const inheritFromParent = useCallback((parentId: string) => {
    const parent = existingLocations.find(l => l._id === parentId);
    if (!parent) return;
    setForm(prev => ({
      ...prev,
      parentId,
      countryCode: parent.countryCode,
      timezone: parent.timezone,
      defaultCurrency: parent.defaultCurrency,
      supportedCurrencies: parent.supportedCurrencies,
      defaultLanguage: parent.defaultLanguage,
      supportedLanguages: parent.supportedLanguages,
      centerLat: parent.centerLat,
      centerLng: parent.centerLng,
    }));
  }, [existingLocations]);

  // ── COUNTRY: select country → fills everything + precise coords ──
  const handleCountrySelect = useCallback((code: string) => {
    setSelectedCountryCode(code);
    const country = getCountryByCode(code);
    if (!country) return;
    const tz = country.timezones?.[0]?.zoneName || 'Africa/Lagos';
    const lang = getLanguageForCountry(code);
    setForm(prev => ({
      ...prev,
      name: country.name,
      slug: country.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      countryCode: country.isoCode,
      timezone: tz,
      defaultCurrency: country.currency,
      supportedCurrencies: [country.currency],
      defaultLanguage: lang,
      supportedLanguages: [lang],
      centerLat: parseFloat(country.latitude) || 0,
      centerLng: parseFloat(country.longitude) || 0,
    }));
    // Fetch precise coordinates from Nominatim
    fetchPreciseCoords(country.name);
  }, [fetchPreciseCoords]);

  // ── STATE: Step 1 select parent country (existing), Step 2 pick state from package ──
  const handleStateParentSelect = useCallback((parentId: string) => {
    const parent = existingLocations.find(l => l._id === parentId);
    if (!parent) return;
    setSelectedCountryCode(parent.countryCode);
    setSelectedStateCode('');
    inheritFromParent(parentId);
    setForm(prev => ({ ...prev, name: '', slug: '' }));
  }, [existingLocations, inheritFromParent]);

  const handleStateSelect = useCallback((stateCode: string) => {
    setSelectedStateCode(stateCode);
    const states = getStatesOfCountry(selectedCountryCode);
    const state = states.find(s => s.isoCode === stateCode);
    if (!state) return;
    const slug = state.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm(prev => ({
      ...prev,
      name: state.name,
      slug,
      centerLat: parseFloat(state.latitude || '') || prev.centerLat,
      centerLng: parseFloat(state.longitude || '') || prev.centerLng,
    }));
    // Fetch precise coordinates from Nominatim (scoped to country)
    fetchPreciseCoords(state.name, selectedCountryCode);
  }, [selectedCountryCode, fetchPreciseCoords]);

  // ── CITY: Step 1 select parent state (existing), Step 2 pick city from package ──
  const handleCityParentSelect = useCallback((parentId: string) => {
    const parent = existingLocations.find(l => l._id === parentId);
    if (!parent) return;
    setSelectedCountryCode(parent.countryCode);
    // Find state code by matching parent name against package states
    const states = getStatesOfCountry(parent.countryCode);
    const matchedState = states.find(s => s.name === parent.name);
    setSelectedStateCode(matchedState?.isoCode || '');
    inheritFromParent(parentId);
    setForm(prev => ({ ...prev, name: '', slug: '' }));
  }, [existingLocations, inheritFromParent]);

  const handleCitySelect = useCallback((cityName: string) => {
    const cities = getCitiesOfState(selectedCountryCode, selectedStateCode);
    const city = cities.find(c => c.name === cityName);
    if (!city) return;
    const slug = city.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm(prev => ({
      ...prev,
      name: city.name,
      slug,
      centerLat: parseFloat(city.latitude || '') || prev.centerLat,
      centerLng: parseFloat(city.longitude || '') || prev.centerLng,
    }));
    // Fetch precise coordinates from Nominatim (scoped to country)
    fetchPreciseCoords(cityName, selectedCountryCode);
  }, [selectedCountryCode, selectedStateCode, fetchPreciseCoords]);

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); resetForm(); }} title="Add New Location" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <SectionHeader icon={Building2} title="Basic Information" description="Name, type, and hierarchy" />

          {/* Type selector */}
          <div>
            <label className="label-text">Hierarchy Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['COUNTRY', 'STATE', 'CITY'] as const).map(t => {
                const cfg = TYPE_CONFIG[t];
                const selected = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, type: t, parentId: undefined, name: '', slug: '', countryCode: '', timezone: '', defaultCurrency: '', supportedCurrencies: [], defaultLanguage: 'en', supportedLanguages: ['en'], centerLat: 0, centerLng: 0, bounds: undefined }));
                      setSelectedCountryCode('');
                      setSelectedStateCode('');
                    }}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                      selected
                        ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-offset-1 ring-current`
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── COUNTRY type ── */}
          {form.type === 'COUNTRY' && (
            <div>
              <label className="label-text">Select Country</label>
              <SearchableSelect
                options={countryOptions}
                value={selectedCountryCode}
                onChange={(code) => handleCountrySelect(code)}
                placeholder="Search for a country..."
                icon={<Globe className="w-3.5 h-3.5" />}
                required
              />
              {selectedCountryCode && (
                <p className="mt-1.5 text-[11px] text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Auto-filled name, timezone, currency, language, and coordinates
                </p>
              )}
            </div>
          )}

          {/* ── STATE type: Select parent country → Pick state ── */}
          {form.type === 'STATE' && (
            <>
              <div>
                <label className="label-text">
                  Select Parent Country
                  <span className="text-gray-400 font-normal ml-1">(from existing locations)</span>
                </label>
                {existingCountries.length > 0 ? (
                  <SearchableSelect
                    options={existingCountries}
                    value={form.parentId || ''}
                    onChange={(id) => handleStateParentSelect(id)}
                    placeholder="Search existing countries..."
                    icon={<Globe className="w-3.5 h-3.5" />}
                    required
                  />
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      No countries exist yet. Create a country first.
                    </p>
                  </div>
                )}
              </div>
              {form.parentId && selectedCountryCode && (
                <div>
                  <label className="label-text">
                    Select State / Region
                  </label>
                  {stateOptions.length > 0 ? (
                    <>
                      <SearchableSelect
                        options={stateOptions}
                        value={selectedStateCode}
                        onChange={(code) => handleStateSelect(code)}
                        placeholder="Search states..."
                        icon={<MapPin className="w-3.5 h-3.5" />}
                        required
                      />
                      {selectedStateCode && (
                        <p className="mt-1.5 text-[11px] text-emerald-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Auto-filled name and coordinates
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        No states found for this country in the database.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── CITY type: Select parent state → Pick city ── */}
          {form.type === 'CITY' && (
            <>
              <div>
                <label className="label-text">
                  Select Parent State
                  <span className="text-gray-400 font-normal ml-1">(from existing locations)</span>
                </label>
                {existingStates.length > 0 ? (
                  <SearchableSelect
                    options={existingStates}
                    value={form.parentId || ''}
                    onChange={(id) => handleCityParentSelect(id)}
                    placeholder="Search existing states..."
                    icon={<Layers className="w-3.5 h-3.5" />}
                    required
                  />
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      No states exist yet. Create a country and state first.
                    </p>
                  </div>
                )}
              </div>
              {form.parentId && selectedCountryCode && selectedStateCode && (
                <div>
                  <label className="label-text">
                    Select City
                  </label>
                  {cityOptions.length > 0 ? (
                    <>
                      <SearchableSelect
                        options={cityOptions}
                        value={form.name}
                        onChange={(name) => handleCitySelect(name)}
                        placeholder="Search cities..."
                        icon={<MapPin className="w-3.5 h-3.5" />}
                        required
                      />
                      {form.name && (
                        <p className="mt-1.5 text-[11px] text-emerald-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Auto-filled name and coordinates
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-700 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        No cities found for this state. Type a name manually below.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Name & Slug — auto-filled, still editable */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Location Name</label>
              <input
                value={form.name}
                onChange={(e) => {
                  const val = e.target.value;
                  const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  setForm(prev => ({ ...prev, name: val, slug }));
                }}
                className="input-field"
                placeholder="Auto-filled from selection above"
                required
              />
            </div>
            <div>
              <label className="label-text">URL Slug</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="input-field pl-9" placeholder="auto-generated" required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Geography */}
        <div className="space-y-4">
          <SectionHeader icon={Navigation} title="Geography" description="Precise coords via OpenStreetMap, still editable" />
          {isGeolocating && (
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Fetching precise coordinates...
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-text">Center Latitude</label>
              <input
                type="number" step="any" value={form.centerLat}
                onChange={(e) => setForm({ ...form, centerLat: parseFloat(e.target.value) || 0 })}
                className="input-field" required
              />
            </div>
            <div>
              <label className="label-text">Center Longitude</label>
              <input
                type="number" step="any" value={form.centerLng}
                onChange={(e) => setForm({ ...form, centerLng: parseFloat(e.target.value) || 0 })}
                className="input-field" required
              />
            </div>
            <div>
              <label className="label-text">Timezone</label>
              <input
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="input-field" placeholder="Africa/Lagos" required
              />
            </div>
          </div>
        </div>

        {/* Currency & Language */}
        <div className="space-y-4">
          <SectionHeader icon={Languages} title="Currency & Language" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Default Currency</label>
              <SearchableSelect
                options={currencyOptions}
                value={form.defaultCurrency}
                onChange={(code) => setForm(prev => ({ ...prev, defaultCurrency: code, supportedCurrencies: [code] }))}
                placeholder="Select currency..."
                icon={<DollarSign className="w-3.5 h-3.5" />}
                required
              />
            </div>
            <div>
              <label className="label-text">Default Language</label>
              <SearchableSelect
                options={languageOptions}
                value={form.defaultLanguage}
                onChange={(code) => setForm(prev => ({ ...prev, defaultLanguage: code, supportedLanguages: [code] }))}
                placeholder="Select language..."
                icon={<Languages className="w-3.5 h-3.5" />}
                required
              />
            </div>
          </div>
        </div>

        {/* Optional: Delivery Config */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDelivery(!showDelivery)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Delivery Configuration</span>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">OPTIONAL</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showDelivery ? 'rotate-180' : ''}`} />
          </button>
          {showDelivery && (
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label-text">Pricing Mode</label>
                  <select
                    value={form.deliveryConfig?.pricingMode || 'FLAT'}
                    onChange={(e) => setForm({
                      ...form,
                      deliveryConfig: { ...form.deliveryConfig, pricingMode: e.target.value as DeliveryConfig['pricingMode'] },
                    })}
                    className="input-field"
                  >
                    <option value="FLAT">Flat Rate</option>
                    <option value="DISTANCE_BASED">Distance Based</option>
                    <option value="PROVIDER_QUOTE">Provider Quote</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Base Fee</label>
                  <input type="number" step="0.01"
                    value={form.deliveryConfig?.baseFee || ''}
                    onChange={(e) => setForm({ ...form, deliveryConfig: { ...form.deliveryConfig!, baseFee: parseFloat(e.target.value) || 0 } })}
                    className="input-field" placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label-text">Per KM Fee</label>
                  <input type="number" step="0.01"
                    value={form.deliveryConfig?.perKmFee || ''}
                    onChange={(e) => setForm({ ...form, deliveryConfig: { ...form.deliveryConfig!, perKmFee: parseFloat(e.target.value) || 0 } })}
                    className="input-field" placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label-text">Min Fee</label>
                  <input type="number" step="0.01"
                    value={form.deliveryConfig?.minFee || ''}
                    onChange={(e) => setForm({ ...form, deliveryConfig: { ...form.deliveryConfig!, minFee: parseFloat(e.target.value) || 0 } })}
                    className="input-field" placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label-text">Max Fee</label>
                  <input type="number" step="0.01"
                    value={form.deliveryConfig?.maxFee || ''}
                    onChange={(e) => setForm({ ...form, deliveryConfig: { ...form.deliveryConfig!, maxFee: parseFloat(e.target.value) || 0 } })}
                    className="input-field" placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label-text">Free Delivery Threshold</label>
                  <input type="number" step="0.01"
                    value={form.deliveryConfig?.freeDeliveryThreshold || ''}
                    onChange={(e) => setForm({ ...form, deliveryConfig: { ...form.deliveryConfig!, freeDeliveryThreshold: parseFloat(e.target.value) || 0 } })}
                    className="input-field" placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Optional: Platform Fees */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFees(!showFees)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Percent className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Platform Fees</span>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">OPTIONAL</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showFees ? 'rotate-180' : ''}`} />
          </button>
          {showFees && (
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label-text">Order Commission %</label>
                  <input type="number" step="0.1" min="0" max="100"
                    value={form.platformFees?.orderCommissionPercent || ''}
                    onChange={(e) => setForm({ ...form, platformFees: { ...form.platformFees!, orderCommissionPercent: parseFloat(e.target.value) || 0 } })}
                    className="input-field" placeholder="0"
                  />
                </div>
                <div>
                  <label className="label-text">Booking Commission %</label>
                  <input type="number" step="0.1" min="0" max="100"
                    value={form.platformFees?.bookingCommissionPercent || ''}
                    onChange={(e) => setForm({ ...form, platformFees: { ...form.platformFees!, bookingCommissionPercent: parseFloat(e.target.value) || 0 } })}
                    className="input-field" placeholder="0"
                  />
                </div>
                <div>
                  <label className="label-text">Payment Processing %</label>
                  <input type="number" step="0.1" min="0" max="100"
                    value={form.platformFees?.paymentProcessingPercent || ''}
                    onChange={(e) => setForm({ ...form, platformFees: { ...form.platformFees!, paymentProcessingPercent: parseFloat(e.target.value) || 0 } })}
                    className="input-field" placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-5 border-t border-gray-200">
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <KeyRound className="w-3 h-3" />
            A location admin account will be auto-generated
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
                  Create Location
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── View Location Modal ────────────────────────────────────
function ViewLocationModal({
  location: loc, onClose, onEdit, isSuperAdmin,
}: {
  location: Location;
  onClose: () => void;
  onEdit: () => void;
  isSuperAdmin: boolean;
}) {
  const parent = getParentName(loc);

  return (
    <Modal isOpen onClose={onClose} title="Location Details" size="lg">
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
          <div className="w-14 h-14 bg-gradient-to-br from-ruby-500 to-ruby-700 rounded-xl flex items-center justify-center shadow-lg shadow-ruby-500/20 shrink-0">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-bold text-gray-900 truncate">{loc.name}</h3>
              <StatusBadge status={loc.status} />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TypeBadge type={loc.type} />
              <span className="text-gray-300">|</span>
              <span className="font-mono text-xs text-gray-400">/{loc.slug}</span>
              <span className="text-gray-300">|</span>
              <span>{loc.countryCode}</span>
            </div>
            {parent && (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                Parent: <span className="font-medium text-gray-600">{parent}</span>
              </p>
            )}
          </div>
        </div>

        {/* Core Info Grid */}
        <div>
          <SectionHeader icon={Settings2} title="Configuration" />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <DetailCard icon={Clock} label="Timezone" value={loc.timezone} />
            <DetailCard icon={DollarSign} label="Currency" value={loc.defaultCurrency} />
            <DetailCard icon={Languages} label="Language" value={loc.defaultLanguage} />
            <DetailCard icon={Globe} label="Supported Currencies" value={loc.supportedCurrencies.join(', ')} />
            <DetailCard icon={Navigation} label="Coordinates" value={`${loc.centerLat.toFixed(4)}, ${loc.centerLng.toFixed(4)}`} mono />
            {loc.activatedAt && (
              <DetailCard icon={Activity} label="Activated" value={formatDate(loc.activatedAt)} />
            )}
          </div>
        </div>

        {/* Bounds */}
        {loc.bounds && (
          <div>
            <SectionHeader icon={Navigation} title="Geographic Bounds" />
            <div className="grid grid-cols-4 gap-3 mt-4">
              <DetailCard label="North" value={String(loc.bounds.north)} mono />
              <DetailCard label="South" value={String(loc.bounds.south)} mono />
              <DetailCard label="East" value={String(loc.bounds.east)} mono />
              <DetailCard label="West" value={String(loc.bounds.west)} mono />
            </div>
          </div>
        )}

        {/* Delivery Config */}
        {loc.deliveryConfig && (
          <div>
            <SectionHeader icon={Truck} title="Delivery Configuration" />
            <div className="grid grid-cols-3 gap-3 mt-4">
              <DetailCard icon={Settings2} label="Pricing Mode" value={loc.deliveryConfig.pricingMode.replace(/_/g, ' ')} />
              {loc.deliveryConfig.baseFee != null && (
                <DetailCard icon={DollarSign} label="Base Fee" value={`${loc.defaultCurrency} ${loc.deliveryConfig.baseFee.toLocaleString()}`} />
              )}
              {loc.deliveryConfig.perKmFee != null && (
                <DetailCard icon={Navigation} label="Per KM Fee" value={`${loc.defaultCurrency} ${loc.deliveryConfig.perKmFee.toLocaleString()}`} />
              )}
              {loc.deliveryConfig.minFee != null && (
                <DetailCard label="Min Fee" value={`${loc.defaultCurrency} ${loc.deliveryConfig.minFee.toLocaleString()}`} />
              )}
              {loc.deliveryConfig.maxFee != null && (
                <DetailCard label="Max Fee" value={`${loc.defaultCurrency} ${loc.deliveryConfig.maxFee.toLocaleString()}`} />
              )}
              {loc.deliveryConfig.freeDeliveryThreshold != null && (
                <DetailCard label="Free Delivery Threshold" value={`${loc.defaultCurrency} ${loc.deliveryConfig.freeDeliveryThreshold.toLocaleString()}`} />
              )}
            </div>
          </div>
        )}

        {/* Platform Fees */}
        {loc.platformFees && (
          <div>
            <SectionHeader icon={Percent} title="Platform Fees" />
            <div className="grid grid-cols-3 gap-3 mt-4">
              <FeeCard label="Order Commission" value={loc.platformFees.orderCommissionPercent} />
              <FeeCard label="Booking Commission" value={loc.platformFees.bookingCommissionPercent} />
              <FeeCard label="Payment Processing" value={loc.platformFees.paymentProcessingPercent} />
            </div>
          </div>
        )}

        {/* Metadata */}
        {loc.metadata && (
          <div>
            <SectionHeader icon={BarChart3} title="Metadata" />
            <div className="grid grid-cols-3 gap-3 mt-4">
              {loc.metadata.population != null && (
                <DetailCard icon={Users} label="Population" value={loc.metadata.population.toLocaleString()} />
              )}
              {loc.metadata.phoneCode && (
                <DetailCard icon={Phone} label="Phone Code" value={loc.metadata.phoneCode} />
              )}
              {loc.metadata.flagEmoji && (
                <DetailCard icon={Flag} label="Flag" value={loc.metadata.flagEmoji} />
              )}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center gap-6 pt-4 border-t border-gray-100 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Created: {formatDateTime(loc.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Updated: {formatDateTime(loc.updatedAt)}
          </span>
        </div>

        {/* Actions */}
        {isSuperAdmin && (
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button onClick={onEdit} className="btn-primary flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit Location
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Detail Display Cards ───────────────────────────────────
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
      <p className={`text-sm text-gray-800 font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

function FeeCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-100">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-400 font-medium">%</span>
      </div>
    </div>
  );
}

// ─── Edit Location Modal ────────────────────────────────────
function EditLocationModal({
  location: loc, onClose, onUpdated,
}: {
  location: Location;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState<UpdateLocationRequest>({
    name: loc.name,
    timezone: loc.timezone,
    defaultCurrency: loc.defaultCurrency,
    supportedCurrencies: loc.supportedCurrencies,
    defaultLanguage: loc.defaultLanguage,
    supportedLanguages: loc.supportedLanguages,
    centerLat: loc.centerLat,
    centerLng: loc.centerLng,
    deliveryConfig: loc.deliveryConfig,
    platformFees: loc.platformFees,
    metadata: loc.metadata ? {
      population: loc.metadata.population,
      phoneCode: loc.metadata.phoneCode,
      flagEmoji: loc.metadata.flagEmoji,
    } : undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.locations.update(loc._id, form);
      toast.success('Location updated');
      onUpdated();
    } catch {
      toast.error('Failed to update location');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Edit: ${loc.name}`} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <SectionHeader icon={Building2} title="Basic Information" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-text">Name</label>
              <input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field" required
              />
            </div>
            <div>
              <label className="label-text">Timezone</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={form.timezone || ''}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="input-field pl-9"
                />
              </div>
            </div>
            <div>
              <label className="label-text">Default Currency</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={form.defaultCurrency || ''}
                  onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value.toUpperCase() })}
                  className="input-field pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coordinates */}
        <div className="space-y-4">
          <SectionHeader icon={Navigation} title="Coordinates" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-text">Center Latitude</label>
              <input type="number" step="any"
                value={form.centerLat || ''}
                onChange={(e) => setForm({ ...form, centerLat: parseFloat(e.target.value) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text">Center Longitude</label>
              <input type="number" step="any"
                value={form.centerLng || ''}
                onChange={(e) => setForm({ ...form, centerLng: parseFloat(e.target.value) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text">Display Order</label>
              <input type="number"
                value={form.displayOrder ?? ''}
                onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                className="input-field" placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="space-y-4">
          <SectionHeader icon={Languages} title="Language" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Default Language</label>
              <div className="relative">
                <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={form.defaultLanguage || ''}
                  onChange={(e) => setForm({ ...form, defaultLanguage: e.target.value })}
                  className="input-field pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Config */}
        <div className="space-y-4">
          <SectionHeader icon={Truck} title="Delivery Configuration" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-text">Pricing Mode</label>
              <select
                value={form.deliveryConfig?.pricingMode || 'FLAT'}
                onChange={(e) => setForm({ ...form, deliveryConfig: { ...(form.deliveryConfig || { pricingMode: 'FLAT' }), pricingMode: e.target.value as DeliveryConfig['pricingMode'] } })}
                className="input-field"
              >
                <option value="FLAT">Flat Rate</option>
                <option value="DISTANCE_BASED">Distance Based</option>
                <option value="PROVIDER_QUOTE">Provider Quote</option>
              </select>
            </div>
            <div>
              <label className="label-text">Base Fee</label>
              <input type="number" step="0.01" value={form.deliveryConfig?.baseFee ?? ''} className="input-field"
                onChange={(e) => setForm({ ...form, deliveryConfig: { ...(form.deliveryConfig || { pricingMode: 'FLAT' }), baseFee: parseFloat(e.target.value) || 0 } })} />
            </div>
            <div>
              <label className="label-text">Per KM Fee</label>
              <input type="number" step="0.01" value={form.deliveryConfig?.perKmFee ?? ''} className="input-field"
                onChange={(e) => setForm({ ...form, deliveryConfig: { ...(form.deliveryConfig || { pricingMode: 'FLAT' }), perKmFee: parseFloat(e.target.value) || 0 } })} />
            </div>
          </div>
        </div>

        {/* Platform Fees */}
        <div className="space-y-4">
          <SectionHeader icon={Percent} title="Platform Fees" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-text">Order Commission %</label>
              <input type="number" step="0.1" min="0" max="100"
                value={form.platformFees?.orderCommissionPercent ?? ''}
                onChange={(e) => setForm({ ...form, platformFees: { ...(form.platformFees || { orderCommissionPercent: 0, bookingCommissionPercent: 0, paymentProcessingPercent: 0 }), orderCommissionPercent: parseFloat(e.target.value) || 0 } })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text">Booking Commission %</label>
              <input type="number" step="0.1" min="0" max="100"
                value={form.platformFees?.bookingCommissionPercent ?? ''}
                onChange={(e) => setForm({ ...form, platformFees: { ...(form.platformFees || { orderCommissionPercent: 0, bookingCommissionPercent: 0, paymentProcessingPercent: 0 }), bookingCommissionPercent: parseFloat(e.target.value) || 0 } })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text">Payment Processing %</label>
              <input type="number" step="0.1" min="0" max="100"
                value={form.platformFees?.paymentProcessingPercent ?? ''}
                onChange={(e) => setForm({ ...form, platformFees: { ...(form.platformFees || { orderCommissionPercent: 0, bookingCommissionPercent: 0, paymentProcessingPercent: 0 }), paymentProcessingPercent: parseFloat(e.target.value) || 0 } })}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <SectionHeader icon={BarChart3} title="Metadata" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-text">Population</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="number"
                  value={form.metadata?.population ?? ''}
                  onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, population: parseInt(e.target.value) || undefined } })}
                  className="input-field pl-9" placeholder="e.g. 15000000"
                />
              </div>
            </div>
            <div>
              <label className="label-text">Phone Code</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={form.metadata?.phoneCode ?? ''}
                  onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, phoneCode: e.target.value } })}
                  className="input-field pl-9" placeholder="+234"
                />
              </div>
            </div>
            <div>
              <label className="label-text">Flag Emoji</label>
              <div className="relative">
                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={form.metadata?.flagEmoji ?? ''}
                  onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, flagEmoji: e.target.value } })}
                  className="input-field pl-9" placeholder="Flag emoji"
                />
              </div>
            </div>
          </div>
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

// ─── Delete Confirmation ────────────────────────────────────
function DeleteConfirmModal({
  location: loc, onClose, onConfirm,
}: {
  location: Location;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <Modal isOpen onClose={onClose} title="Delete Location" size="sm">
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-7 h-7 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Delete {loc.name}?</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            This action cannot be undone. All associated data including admin accounts
            will be permanently removed.
          </p>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Locations with child locations cannot be deleted. Remove all children first.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={async () => { setIsDeleting(true); await onConfirm(); setIsDeleting(false); }}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Location
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Admin Credentials Modal ────────────────────────────────
function AdminCredentialsModal({
  credentials: creds, onClose,
}: {
  credentials: CreateLocationResponse['adminCredentials'];
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
    <Modal isOpen onClose={onClose} title="Location Admin Created" size="md">
      <div className="space-y-5">
        {/* Success Banner */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Admin account auto-generated
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
            value={creds.roles.join(', ').replace(/_/g, ' ')}
            onCopy={() => copyToClipboard(creds.roles.join(', '), 'Role')}
            isCopied={copied === 'Role'}
          />
        </div>

        {/* Copy All */}
        <button
          onClick={() => {
            const text = `Location Admin Credentials\n${'─'.repeat(30)}\nName: ${creds.firstName} ${creds.lastName}\nEmail: ${creds.email}\nPassword: ${creds.password}\nRole: ${creds.roles.join(', ')}`;
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
