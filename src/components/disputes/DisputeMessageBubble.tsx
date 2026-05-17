import { formatDateTime } from '@/lib/utils';
import type { DisputeMessage } from '@/lib/types';

/**
 * Single message bubble inside a dispute thread.
 *
 * Role-aware coloring lets an admin scan the conversation flow without
 * reading every name:
 *   - ADMIN     → ruby (brand red)
 *   - BUSINESS  → violet
 *   - CUSTOMER  → blue
 *   - Internal note → yellow (overrides role tint; admin-only context)
 *
 * Bubbles align by role: admin/business messages on the right (sent),
 * customer messages on the left (received) — mirrors mainstream chat
 * conventions so the eye knows who's talking at a glance. The "alignment
 * = sender perspective" choice here treats the admin as the viewer, since
 * this UI only renders for admins.
 */
export function DisputeMessageBubble({ msg }: { msg: DisputeMessage }) {
  const role = (msg.senderRole || msg.sender || '').toString().toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isBusiness = role === 'BUSINESS' || role === 'BUSINESS_OWNER';
  const isInternal = !!msg.isInternal;

  // Align to right when the admin (the viewer) is the sender; everyone
  // else aligns left. Business sits between — visually distinct via
  // color but still on the left because they're not the viewer.
  const alignRight = isAdmin;

  const roleLabel = isAdmin
    ? 'Ruby+ Support'
    : isBusiness
      ? 'Business'
      : 'Customer';

  const roleClasses = isAdmin
    ? 'bg-ruby-50 border-ruby-200'
    : isBusiness
      ? 'bg-violet-50 border-violet-200'
      : 'bg-blue-50 border-blue-200';

  const roleBadge = isAdmin
    ? 'bg-ruby-100 text-ruby-700'
    : isBusiness
      ? 'bg-violet-100 text-violet-700'
      : 'bg-blue-100 text-blue-700';

  const bubbleBase = isInternal
    ? 'bg-yellow-50 border-yellow-200'
    : roleClasses;

  return (
    <div className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] border rounded-2xl p-3 shadow-sm ${bubbleBase} ${
          alignRight ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              isInternal ? 'bg-yellow-200 text-yellow-900' : roleBadge
            }`}
          >
            {isInternal ? 'Internal note' : roleLabel}
          </span>
          <span className="text-[11px] text-gray-500 whitespace-nowrap">
            {formatDateTime(msg.createdAt)}
          </span>
        </div>

        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {msg.message || msg.text}
        </p>

        {msg.attachments && msg.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {msg.attachments.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-ruby-600 underline hover:text-ruby-700"
              >
                Attachment {i + 1}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
