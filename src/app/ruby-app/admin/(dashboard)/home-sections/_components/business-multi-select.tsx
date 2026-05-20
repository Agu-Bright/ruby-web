'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { Search, X as XIcon, GripVertical, Check } from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import type { Business } from '@/lib/types';

interface BusinessMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  /** When set, the candidate list is filtered to businesses in this location. */
  locationFilter?: string;
}

/**
 * Drag-and-drop ordered multi-select used inside the curated-section
 * edit drawer. Replaces the previous up/down-arrow ordering with DnD-
 * kit handles — same library + pattern as the main section list, so
 * the admin learns the gesture once and applies it twice.
 *
 * The component keeps two side-by-side data sources:
 *   1. `candidates` — search results from the businesses API (live,
 *      LIVE-status only)
 *   2. `selectedBusinesses` — display data for the currently-selected
 *      IDs. Fetched separately so a selected business stays renderable
 *      even when the admin types a search filter that hides it from
 *      the candidate list.
 */
export function BusinessMultiSelect({
  value,
  onChange,
  locationFilter,
}: BusinessMultiSelectProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: candidates } = useApi<Business[]>(
    () =>
      api.businesses.list({
        search: debouncedSearch || undefined,
        locationId: locationFilter || undefined,
        status: 'LIVE',
        limit: 25,
      }),
    [debouncedSearch, locationFilter],
  );

  const { data: selectedBusinesses } = useApi<Business[]>(
    () =>
      value.length > 0
        ? api.businesses.list({ ids: value.join(','), limit: 50 } as any)
        : Promise.resolve({ success: true, data: [] }),
    [value.join(',')],
  );

  const lookup = useMemo(() => {
    const m = new Map<string, Business>();
    (selectedBusinesses || []).forEach((b) => m.set(b._id, b));
    (candidates || []).forEach((b) => {
      if (!m.has(b._id)) m.set(b._id, b);
    });
    return m;
  }, [selectedBusinesses, candidates]);

  const ordered = useMemo(
    () => value.map((id) => lookup.get(id)).filter(Boolean) as Business[],
    [value, lookup],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = value.indexOf(String(active.id));
    const newIndex = value.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...value];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  };

  const add = (id: string) => {
    if (!value.includes(id)) onChange([...value, id]);
  };
  const remove = (id: string) => onChange(value.filter((x) => x !== id));
  const isSelected = (id: string) => value.includes(id);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Businesses in this section
        </label>
        <span className="text-[11px] text-gray-400">
          {value.length} selected · drag to reorder
        </span>
      </div>

      {/* Selected — DnD-ordered */}
      {ordered.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={value}
            strategy={verticalListSortingStrategy}
          >
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-3 divide-y divide-gray-100 bg-white">
              {ordered.map((b, idx) => (
                <SortableBusinessRow
                  key={b._id}
                  business={b}
                  index={idx}
                  onRemove={() => remove(b._id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Search + candidate list */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search live businesses…"
          className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500/20 focus:border-ruby-400"
        />
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden mt-2 max-h-64 overflow-y-auto divide-y divide-gray-100 bg-white">
        {(candidates || []).length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-gray-400">
            {debouncedSearch ? 'No matches' : 'Start typing to search businesses'}
          </div>
        ) : (
          (candidates || []).map((b) => {
            const sel = isSelected(b._id);
            return (
              <button
                type="button"
                key={b._id}
                onClick={() => (sel ? remove(b._id) : add(b._id))}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  sel ? 'bg-emerald-50' : 'hover:bg-gray-50'
                }`}
              >
                {b.logoUrl ? (
                  <img
                    src={b.logoUrl}
                    alt=""
                    className="w-7 h-7 rounded object-cover ring-1 ring-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded bg-gray-100 ring-1 ring-gray-200 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-900 truncate">{b.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {typeof b.locationId === 'object'
                      ? b.locationId.name
                      : 'Location'}
                  </div>
                </div>
                {sel && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function SortableBusinessRow({
  business,
  index,
  onRemove,
}: {
  business: Business;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: business._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-2 bg-white"
    >
      <button
        type="button"
        className="shrink-0 p-1 text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        aria-label={`Drag to reorder ${business.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className="text-xs font-mono text-gray-400 w-5 text-center shrink-0">
        {index + 1}
      </span>
      {business.logoUrl ? (
        <img
          src={business.logoUrl}
          alt=""
          className="w-7 h-7 rounded object-cover ring-1 ring-gray-200 shrink-0"
        />
      ) : (
        <div className="w-7 h-7 rounded bg-gray-100 ring-1 ring-gray-200 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">
          {business.name}
        </div>
        <div className="text-[10px] text-gray-500 truncate">
          {typeof business.locationId === 'object'
            ? business.locationId.name
            : 'Location'}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-1 text-gray-400 hover:text-red-600"
        aria-label="Remove from section"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
