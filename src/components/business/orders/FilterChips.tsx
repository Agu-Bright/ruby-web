'use client';

/**
 * FilterChips — status filter row above the orders list.
 * Mirrors mobile `(tabs)/orders.tsx` chip set.
 */

interface FilterChipsProps {
  active: string;
  onChange: (value: string) => void;
  counts?: Record<string, number>;
}

const CHIPS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'PLACED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready', value: 'READY' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function FilterChips({ active, onChange, counts }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
      {CHIPS.map((chip) => {
        const isActive = chip.value === active;
        const count = counts?.[chip.value];
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onChange(chip.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              isActive
                ? 'bg-ruby-red text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {chip.label}
            {count != null && count > 0 && (
              <span
                className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/25' : 'bg-gray-200'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
