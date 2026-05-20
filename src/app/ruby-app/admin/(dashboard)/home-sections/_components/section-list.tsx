'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import type { HomeSection } from '@/lib/types';
import { SectionCard, SectionCardDragOverlay } from './section-card';

interface SectionListProps {
  sections: HomeSection[];
  /** Called with the new ordered list after a drop. Caller is responsible
   *  for optimistic UI + persisting via api.homeSections.reorder. */
  onReorder: (next: HomeSection[]) => void;
  onEdit: (s: HomeSection) => void;
  onDelete: (s: HomeSection) => void;
  onToggleActive: (s: HomeSection) => void;
  togglingId?: string | null;
}

/**
 * Sortable list wrapper. Composes `DndContext` + `SortableContext`
 * around the card rows, plumbs in keyboard-accessible drag, and
 * renders a `DragOverlay` ghost while a drag is in progress.
 *
 * Modifiers:
 *   - `restrictToVerticalAxis` — drags only move up/down (locked to
 *     the column). Sideways movement of the overlay would feel wrong
 *     for a list-style UI.
 *   - `restrictToParentElement` — the overlay can't escape the list
 *     container while dragging.
 */
export function SectionList({
  sections,
  onReorder,
  onEdit,
  onDelete,
  onToggleActive,
  togglingId,
}: SectionListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a small drag distance before a drag starts. Without
      // this, clicking the handle to focus it for keyboard reorder
      // would trigger a drag immediately and feel jittery.
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = useMemo(() => sections.map((s) => s._id), [sections]);
  const activeSection = useMemo(
    () => (activeId ? sections.find((s) => s._id === activeId) ?? null : null),
    [activeId, sections],
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s._id === active.id);
    const newIndex = sections.findIndex((s) => s._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // arrayMove inline — avoids the extra @dnd-kit/sortable import for a
    // single use, and keeps the data flow obvious.
    const next = [...sections];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onReorder(next);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {sections.map((s) => (
            <SectionCard
              key={s._id}
              section={s}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              toggling={togglingId === s._id}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeSection ? <SectionCardDragOverlay section={activeSection} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
