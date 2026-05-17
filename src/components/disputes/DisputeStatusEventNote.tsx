import { formatDateTime } from '@/lib/utils';
import type { DisputeStatus } from '@/lib/types';

/**
 * Inline system note for a status-timeline event. Rendered between
 * message bubbles so the admin sees status transitions as part of the
 * conversation flow ("Status → UNDER_REVIEW · 2h ago") rather than
 * having to leave the thread.
 *
 * Visually distinct from message bubbles: small centered grey pill,
 * not aligned to either side, no role coloring.
 */
export function DisputeStatusEventNote({
  status,
  timestamp,
  note,
  by,
}: {
  status: DisputeStatus | string;
  timestamp: string;
  note?: string;
  /** Display name of who triggered the change ("Jane Doe"). */
  by?: string;
}) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 text-[11px] px-2.5 py-1 rounded-full">
        <span className="font-semibold uppercase tracking-wider">
          {String(status).replace(/_/g, ' ')}
        </span>
        {by ? <span className="text-gray-500">by {by}</span> : null}
        <span className="text-gray-400">·</span>
        <span title={timestamp}>{formatDateTime(timestamp)}</span>
        {note ? (
          <>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600 italic truncate max-w-[260px]">
              {note}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
