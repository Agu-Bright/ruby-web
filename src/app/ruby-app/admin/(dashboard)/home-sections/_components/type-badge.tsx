import type { HomeSectionType } from '@/lib/types';
import { Star, Flame, Folder, Sparkles, Ticket } from 'lucide-react';

/**
 * Visual identity for each of the four section types. Used in the
 * section list, the intro hero legend, the type-picker, and the live
 * preview. Centralised so the colour/icon/label trio stays in sync
 * across surfaces.
 */
export const TYPE_INFO: Record<
  HomeSectionType,
  {
    label: string;
    short: string;
    description: string;
    icon: typeof Star;
    pill: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  REVIEWS: {
    label: 'Reviews',
    short: 'Reviews',
    description: 'Live customer reviews carousel — auto-populated by the system.',
    icon: Star,
    pill: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  WHATS_HOT: {
    label: "What's Hot",
    short: 'Hot',
    description: 'Trending businesses for the user’s current location.',
    icon: Flame,
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  CATEGORY: {
    label: 'Category',
    short: 'Category',
    description: 'Top businesses in a chosen category or subcategory.',
    icon: Folder,
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  CURATED: {
    label: 'Curated',
    short: 'Curated',
    description: 'Hand-pick the businesses to feature in this row.',
    icon: Sparkles,
    pill: 'bg-green-50 text-green-700 border-green-200',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  EVENTS: {
    label: 'Events',
    short: 'Events',
    description: 'Upcoming events for the user’s city, auto-populated.',
    icon: Ticket,
    pill: 'bg-ruby-50 text-ruby-700 border-ruby-200',
    iconBg: 'bg-ruby-50',
    iconColor: 'text-ruby-600',
  },
};

/**
 * Small pill rendered in the section card row + type-picker preview.
 * Keep this style identical across every surface so the admin learns
 * the colour language once.
 */
export function TypeBadge({
  type,
  size = 'sm',
}: {
  type: HomeSectionType;
  size?: 'sm' | 'md';
}) {
  const info = TYPE_INFO[type];
  const Icon = info.icon;
  const cls =
    size === 'md'
      ? 'px-2.5 py-1 text-xs gap-1.5'
      : 'px-2 py-0.5 text-[10px] gap-1';
  return (
    <span
      className={`inline-flex items-center font-semibold uppercase tracking-wider rounded border ${info.pill} ${cls}`}
      title={info.description}
    >
      <Icon className={size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5'} />
      {info.short}
    </span>
  );
}
