'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Eye,
  EyeOff,
  MapPin,
  Edit2,
  Trash2,
  MoreHorizontal,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { HomeSection } from '@/lib/types';
import { TYPE_INFO, TypeBadge } from './type-badge';

interface SectionCardProps {
  section: HomeSection;
  onEdit: (s: HomeSection) => void;
  onDelete: (s: HomeSection) => void;
  onToggleActive: (s: HomeSection) => void;
  /** True while a toggleActive mutation is in flight for this row — disables the switch + shows a spinner overlay. */
  toggling?: boolean;
}

const getLocationLabel = (locationId: HomeSection['locationId']): string => {
  if (!locationId) return 'Global';
  if (typeof locationId === 'object') return locationId.name;
  return 'Location';
};

const getCategoryLabel = (s: HomeSection): string | null => {
  if (!s.categoryId) return null;
  const catName = typeof s.categoryId === 'object' ? s.categoryId.name : null;
  if (!catName) return null;
  const subName =
    s.subcategoryId && typeof s.subcategoryId === 'object'
      ? s.subcategoryId.name
      : null;
  return subName ? `${catName} → ${subName}` : catName;
};

/**
 * One row in the sortable home-sections list. Drag handle on the
 * left (the only drag target — clicking the card body opens edit).
 * Active toggle and more-actions menu on the right.
 *
 * `useSortable` from @dnd-kit/sortable provides:
 *   - `attributes` / `listeners` for the drag handle
 *   - `transform` / `transition` for sliding when other rows move
 *   - `isDragging` flag to lower opacity of the source row while
 *     the DragOverlay floats above
 */
export function SectionCard({
  section,
  onEdit,
  onDelete,
  onToggleActive,
  toggling,
}: SectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section._id });

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const info = TYPE_INFO[section.type];
  const Icon = info.icon;
  const isCurated = section.type === 'CURATED';
  const categoryLabel = getCategoryLabel(section);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-2 py-3 hover:border-ruby-200 hover:shadow-sm transition-all ${
        !section.isActive ? 'opacity-75' : ''
      }`}
    >
      {/* Drag handle — the ONLY drag target. Rest of card opens edit. */}
      <button
        type="button"
        ref={undefined}
        className="shrink-0 p-2 -ml-1 text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none focus:outline-none focus:text-ruby-500"
        aria-label={`Drag to reorder ${section.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Banner / icon thumbnail */}
      <div className="shrink-0">
        {isCurated && section.bannerUrl ? (
          <img
            src={section.bannerUrl}
            alt=""
            className="w-12 h-12 rounded-lg object-cover ring-1 ring-gray-200"
          />
        ) : (
          <div
            className={`w-12 h-12 rounded-lg ${info.iconBg} ${info.iconColor} flex items-center justify-center`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Body — clickable to edit */}
      <button
        type="button"
        onClick={() => onEdit(section)}
        className="flex-1 min-w-0 text-left px-1 -mx-1 py-0.5 rounded hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={section.type} />
          <span className="text-sm font-semibold text-gray-900 truncate">
            {section.title}
          </span>
          {!section.isActive && (
            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
              Hidden
            </span>
          )}
        </div>
        {section.subtitle && (
          <div className="text-xs text-gray-500 truncate mt-0.5">
            {section.subtitle}
          </div>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            {getLocationLabel(section.locationId)}
          </span>
          {isCurated ? (
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-gray-400" />
              {section.businessIds?.length ?? 0} business
              {(section.businessIds?.length ?? 0) === 1 ? '' : 'es'}
            </span>
          ) : (
            <span className="inline-flex items-center text-gray-400">
              Auto-populated
            </span>
          )}
          {categoryLabel && (
            <span className="inline-flex items-center text-gray-400 truncate">
              → {categoryLabel}
            </span>
          )}
        </div>
      </button>

      {/* Active toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleActive(section);
        }}
        disabled={toggling}
        title={section.isActive ? 'Hide section' : 'Show section'}
        role="switch"
        aria-checked={section.isActive}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
          section.isActive ? 'bg-emerald-500' : 'bg-gray-300'
        } ${toggling ? 'opacity-60' : ''}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
            section.isActive ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        >
          {toggling && (
            <Loader2 className="w-3 h-3 absolute top-0.5 left-0.5 animate-spin text-gray-400" />
          )}
        </span>
      </button>

      {/* More actions */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
          aria-label="More actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 animate-fade-in">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(section);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Edit2 className="w-3.5 h-3.5 text-gray-400" />
              Edit
            </button>
            {isCurated && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(section);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
            {!isCurated && (
              <div className="px-3 py-2 text-[11px] text-gray-400 italic">
                System sections can&rsquo;t be deleted &mdash; toggle hidden
                instead.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compact "active/hidden" label shown only on hover for context */}
      <div className="shrink-0 hidden xl:flex items-center text-[10px] uppercase tracking-wider font-semibold gap-1 text-gray-400 min-w-[60px]">
        {section.isActive ? (
          <>
            <Eye className="w-3 h-3 text-emerald-500" />
            Active
          </>
        ) : (
          <>
            <EyeOff className="w-3 h-3" />
            Hidden
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Dragged ghost — what the user sees floating under their cursor
 * while a row is being moved. Same shape as the card but stripped of
 * interactive elements and emphasised visually.
 */
export function SectionCardDragOverlay({ section }: { section: HomeSection }) {
  const info = TYPE_INFO[section.type];
  const Icon = info.icon;
  return (
    <div className="flex items-center gap-3 bg-white border-2 border-ruby-400 rounded-xl px-2 py-3 shadow-2xl ring-4 ring-ruby-100 scale-[1.02] w-[640px] max-w-[calc(100vw-3rem)]">
      <div className="shrink-0 p-2 -ml-1 text-ruby-500">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="shrink-0">
        {section.type === 'CURATED' && section.bannerUrl ? (
          <img
            src={section.bannerUrl}
            alt=""
            className="w-12 h-12 rounded-lg object-cover ring-1 ring-gray-200"
          />
        ) : (
          <div
            className={`w-12 h-12 rounded-lg ${info.iconBg} ${info.iconColor} flex items-center justify-center`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TypeBadge type={section.type} />
          <span className="text-sm font-semibold text-gray-900 truncate">
            {section.title}
          </span>
        </div>
        {section.subtitle && (
          <div className="text-xs text-gray-500 truncate mt-0.5">
            {section.subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
