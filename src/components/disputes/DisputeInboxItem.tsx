import { StatusBadge } from '@/components/ui';
import type { Dispute } from '@/lib/types';
import {
  TYPE_ICONS,
  getCustomerName,
  getReferenceLabel,
  getLastActivityAt,
  getLastMessagePreview,
  shortAgo,
} from './utils';

/**
 * One row in the inbox list. Compact density — designed to fit ~12-14
 * rows in a 600px tall pane without scrolling.
 *
 * Layout: type icon | (name · reference, preview, status badge + time)
 * The whole row is a button so clicking anywhere selects the dispute.
 */
export function DisputeInboxItem({
  dispute,
  selected,
  unread,
  onClick,
}: {
  dispute: Dispute;
  selected: boolean;
  /** Show the unread dot. Determined by the parent (localStorage-backed
   *  lastViewedAt; OPEN status always counts as unread). */
  unread: boolean;
  onClick: () => void;
}) {
  const t = TYPE_ICONS[dispute.type] || TYPE_ICONS.GENERAL;
  const Icon = t.icon;
  const customerName = getCustomerName(dispute);
  const refLabel = getReferenceLabel(dispute);
  const preview = getLastMessagePreview(dispute);
  const lastActivity = getLastActivityAt(dispute);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-3 border-b border-gray-100 transition-colors flex gap-3 ${
        selected
          ? 'bg-ruby-50/60 hover:bg-ruby-50'
          : 'hover:bg-gray-50'
      }`}
    >
      {/* Type icon + unread indicator */}
      <div className="relative shrink-0">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.bg}`}
        >
          <Icon className={`w-4 h-4 ${t.color}`} />
        </div>
        {unread && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-ruby-500 border-2 border-white" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* Top line: name + time */}
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={`text-sm truncate ${
              unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
            }`}
          >
            {customerName}
          </p>
          <span className="text-[11px] text-gray-400 shrink-0">
            {shortAgo(lastActivity)}
          </span>
        </div>

        {/* Second line: reference label */}
        <p className="text-[11px] text-gray-500 truncate">
          {dispute.type} · {refLabel}
        </p>

        {/* Third line: preview + status */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-xs text-gray-600 truncate flex-1 min-w-0">
            {preview || (
              <span className="italic text-gray-400">No messages yet</span>
            )}
          </p>
          <StatusBadge status={dispute.status} />
        </div>
      </div>
    </button>
  );
}
