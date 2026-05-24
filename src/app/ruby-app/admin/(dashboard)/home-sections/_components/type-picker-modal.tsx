'use client';

import { Modal } from '@/components/ui';
import { TYPE_INFO } from './type-badge';
import type { HomeSectionType } from '@/lib/types';

interface TypePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Types that already exist and should be greyed out (system types are single-row). */
  existingTypes: HomeSectionType[];
  onPick: (kind: 'subcategory' | 'curated' | 'events') => void;
}

/**
 * 2×2 picker shown when the admin clicks "Add section". Solves the
 * "two confusing Add buttons in the header" problem by funnelling
 * every add through a single button + one clear choice screen.
 *
 * REVIEWS + WHATS_HOT cards are read-only teaching cards (auto-seeded,
 * not admin-creatable). They render greyed-out when an instance
 * already exists, with hover-text explaining why.
 */
export function TypePickerModal({
  isOpen,
  onClose,
  existingTypes,
  onPick,
}: TypePickerModalProps) {
  const has = (t: HomeSectionType) => existingTypes.includes(t);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add a new section"
      subtitle="Pick the kind of row you want to add to the home screen."
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Subcategory section — the most common admin action */}
        <PickerCard
          type="CATEGORY"
          label="Subcategory section"
          description="Show all businesses in a specific subcategory — e.g. Plumbers in Lagos."
          actionable
          onClick={() => onPick('subcategory')}
        />

        {/* Curated section — hand-pick */}
        <PickerCard
          type="CURATED"
          label="Curated section"
          description="Hand-pick the businesses to feature. Add a banner image, set the order."
          actionable
          onClick={() => onPick('curated')}
        />

        {/* Phase 40 — Events section. Backend auto-hydrates upcoming events
            for the user's location; admin only sets title + display order. */}
        <PickerCard
          type="EVENTS"
          label="Events"
          description="Upcoming events in the user's city, auto-populated. Great near the top of the feed."
          actionable
          onClick={() => onPick('events')}
        />

        {/* Reviews — teaching card only */}
        <PickerCard
          type="REVIEWS"
          label="Reviews"
          description="Live customer reviews carousel — auto-populated. Only one Reviews row is supported."
          actionable={false}
          disabledReason={has('REVIEWS') ? 'Already exists. Edit the existing row instead.' : 'Seeded automatically on first boot.'}
        />

        {/* What's Hot — teaching card only */}
        <PickerCard
          type="WHATS_HOT"
          label="What’s Hot"
          description="Trending businesses for the user’s location. Auto-populated."
          actionable={false}
          disabledReason={has('WHATS_HOT') ? 'Already exists. Edit the existing row instead.' : 'Seeded automatically on first boot.'}
        />
      </div>
    </Modal>
  );
}

function PickerCard({
  type,
  label,
  description,
  actionable,
  onClick,
  disabledReason,
}: {
  type: HomeSectionType;
  label: string;
  description: string;
  actionable: boolean;
  onClick?: () => void;
  disabledReason?: string;
}) {
  const info = TYPE_INFO[type];
  const Icon = info.icon;

  const inner = (
    <>
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg ${info.iconBg} ${info.iconColor} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">{label}</span>
            {!actionable && (
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                Auto
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-snug">{description}</p>
          {!actionable && disabledReason && (
            <p className="text-[11px] text-gray-400 mt-2 italic">
              {disabledReason}
            </p>
          )}
        </div>
      </div>
    </>
  );

  if (!actionable) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 opacity-70 cursor-not-allowed">
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-ruby-300 hover:bg-ruby-50/30 transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ruby-500/30"
    >
      {inner}
    </button>
  );
}
