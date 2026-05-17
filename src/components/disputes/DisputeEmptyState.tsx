import { MessageSquare } from 'lucide-react';

/**
 * Rendered in the right pane when no dispute is selected yet. Mirrors
 * Gmail / Slack — a soft centered placeholder rather than a hard error
 * or blank space, so the page looks intentional on first load.
 */
export function DisputeEmptyState({
  totalDisputes,
}: {
  /** Optional: shown in the placeholder copy when known. */
  totalDisputes?: number;
}) {
  return (
    <div className="flex-1 flex items-center justify-center bg-white rounded-lg border border-gray-200 h-full">
      <div className="text-center max-w-sm px-6 py-12">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">
          Select a dispute to view the conversation
        </h3>
        <p className="text-sm text-gray-500">
          {totalDisputes != null
            ? `${totalDisputes} ticket${totalDisputes === 1 ? '' : 's'} in your inbox. Pick one on the left to read messages and reply.`
            : 'Pick one on the left to read messages and reply.'}
        </p>
      </div>
    </div>
  );
}
