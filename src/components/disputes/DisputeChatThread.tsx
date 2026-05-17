'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApi, useMutation } from '@/lib/hooks';
import { useDisputeSocket } from '@/lib/hooks/useDisputeSocket';
import type {
  Dispute,
  DisputeMessage,
  DisputeStatus,
  DisputeResolutionRequest,
} from '@/lib/types';

import { DisputeChatHeader } from './DisputeChatHeader';
import { DisputeMetaStrip } from './DisputeMetaStrip';
import { DisputeMessageBubble } from './DisputeMessageBubble';
import { DisputeStatusEventNote } from './DisputeStatusEventNote';
import { DisputeChatComposer } from './DisputeChatComposer';
import { ResolveDisputeModal } from './ResolveDisputeModal';
import { EscalateDisputeModal } from './EscalateDisputeModal';
import { isThreadClosed } from './utils';

interface Props {
  disputeId: string;
  /** When the chat is in single-column (mobile) mode, this back button
   *  shows in the header. */
  onBack?: () => void;
  /** Notify parent when the dispute updates so it can refresh the inbox list. */
  onUpdated?: (dispute: Dispute) => void;
  /** Mark this dispute as viewed (drives unread state in the inbox). */
  onViewed?: (disputeId: string) => void;
}

/**
 * The right pane: full chat thread + meta + composer + actions.
 *
 * Owns the per-dispute state machine: fetch detail, subscribe to socket,
 * dispatch send / status-change / resolve / escalate / close mutations,
 * keep an optimistic local copy in sync with socket echoes.
 *
 * Status-timeline events are interleaved chronologically with messages
 * so the admin sees the full conversation flow (including "Status →
 * UNDER_REVIEW" beats) without leaving the thread.
 */
export function DisputeChatThread({
  disputeId,
  onBack,
  onUpdated,
  onViewed,
}: Props) {
  // Fetch the full dispute (with messages + statusTimeline). Refetches
  // automatically when `disputeId` changes — parent passes a stable id
  // from the selected inbox row.
  const { data: serverDispute, isLoading, error, refetch } = useApi<Dispute>(
    () => api.disputes.get(disputeId),
    [disputeId],
  );

  // Local copy so we can apply optimistic + socket updates without
  // forcing a refetch every keystroke / socket message.
  const [dispute, setDispute] = useState<Dispute | null>(null);
  useEffect(() => {
    if (serverDispute) {
      setDispute(serverDispute);
      onViewed?.(serverDispute._id);
    }
  }, [serverDispute, onViewed]);

  // Modals
  const [resolveOpen, setResolveOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);

  // Real-time wire-up
  useDisputeSocket(dispute?._id, {
    onMessage: (msg) => {
      setDispute((curr) => {
        if (!curr) return curr;
        // Dedupe — the optimistic local push may race the socket echo.
        const already = (curr.messages || []).some(
          (m) =>
            m.senderId === msg.senderId &&
            (m.message || m.text) === (msg.message || msg.text) &&
            m.createdAt === msg.createdAt,
        );
        if (already) return curr;
        return { ...curr, messages: [...(curr.messages || []), msg] };
      });
    },
    onStatus: (status) => {
      setDispute((curr) =>
        curr ? { ...curr, status: status as DisputeStatus } : curr,
      );
      // Refresh the inbox list too — status drives the badge there.
      refetch();
    },
  });

  // Auto-scroll on new message
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dispute?.messages?.length]);

  // Mutations
  const { mutate: sendReply, isLoading: sending } = useMutation(
    ({
      message,
      isInternal,
    }: {
      message: string;
      isInternal: boolean;
    }) => api.disputes.addMessage(disputeId, { message, isInternal }),
  );

  const { mutate: updateStatus } = useMutation(
    ({ status, note }: { status: DisputeStatus; note?: string }) =>
      api.disputes.updateStatus(disputeId, { status, note }),
  );

  const { mutate: resolveMutation } = useMutation(
    (data: DisputeResolutionRequest) => api.disputes.resolve(disputeId, data),
  );

  const { mutate: escalateMutation } = useMutation((data: { reason: string }) =>
    api.disputes.escalate(disputeId, data),
  );

  const { mutate: closeMutation } = useMutation((data: { note: string }) =>
    api.disputes.close(disputeId, data),
  );

  // Handlers
  const handleSend = async (message: string, isInternal: boolean) => {
    const result = await sendReply({ message, isInternal });
    if (result) {
      setDispute({ ...result });
      onUpdated?.(result);
      if (isInternal) toast.success('Internal note added');
      else toast.success('Reply sent');
    }
  };

  const handleStatusChange = async (status: DisputeStatus) => {
    const result = await updateStatus({ status });
    if (result) {
      setDispute({ ...result });
      onUpdated?.(result);
      toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
    }
  };

  const handleResolveSubmit = async (data: DisputeResolutionRequest) => {
    const result = await resolveMutation(data);
    if (result) {
      setDispute({ ...result });
      onUpdated?.(result);
      toast.success(
        data.status === 'RESOLVED'
          ? 'Dispute resolved'
          : `Dispute ${data.status.toLowerCase()}`,
      );
      setResolveOpen(false);
    }
  };

  const handleEscalateSubmit = async (reason: string) => {
    const result = await escalateMutation({ reason });
    if (result) {
      setDispute({ ...result });
      onUpdated?.(result);
      toast.success('Dispute escalated');
      setEscalateOpen(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Close this ticket? This cannot be undone.')) return;
    const result = await closeMutation({ note: 'Closed by admin' });
    if (result) {
      setDispute({ ...result });
      onUpdated?.(result);
      toast.success('Ticket closed');
    }
  };

  // Interleaved view: each item is either { kind: 'message', ... } or
  // { kind: 'event', ... }. Sorting on a single timestamp keeps the
  // chronological flow intact even when status events fall between
  // messages.
  type ThreadItem =
    | { kind: 'message'; ts: string; data: DisputeMessage; key: string }
    | {
        kind: 'event';
        ts: string;
        data: {
          status: string;
          timestamp: string;
          note?: string;
          updatedByRole?: string;
        };
        key: string;
      };

  const threadItems: ThreadItem[] = useMemo(() => {
    if (!dispute) return [];
    const items: ThreadItem[] = [];
    (dispute.messages || []).forEach((m, i) => {
      items.push({
        kind: 'message',
        ts: m.createdAt,
        data: m,
        key: m._id || `msg-${m.senderId}-${m.createdAt}-${i}`,
      });
    });
    // Status timeline lives on the server doc as `statusTimeline`; the
    // types don't surface it but the data is there. Cast through unknown
    // to keep TS honest without polluting the types definition just for
    // this view.
    const timeline =
      (dispute as unknown as {
        statusTimeline?: {
          status: string;
          timestamp: string;
          note?: string;
          updatedByRole?: string;
        }[];
      }).statusTimeline || [];
    timeline.forEach((e, i) => {
      items.push({
        kind: 'event',
        ts: e.timestamp,
        data: e,
        key: `evt-${e.status}-${e.timestamp}-${i}`,
      });
    });
    return items.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  }, [dispute]);

  // ---------- Render ----------
  if (isLoading && !dispute) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-lg border border-gray-200 h-full">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (error && !dispute) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-lg border border-gray-200 h-full">
        <div className="text-center text-sm text-gray-600">
          <p className="font-medium mb-1">Couldn&apos;t load this dispute</p>
          <p className="text-xs text-gray-500 mb-3">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="text-xs text-ruby-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!dispute) return null;

  const locked = isThreadClosed(dispute);

  return (
    <>
      <div className="flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden h-full">
        <DisputeChatHeader
          dispute={dispute}
          onBack={onBack}
          onChangeStatus={handleStatusChange}
          onResolveClick={() => setResolveOpen(true)}
          onEscalateClick={() => setEscalateOpen(true)}
          onCloseClick={handleClose}
        />

        {/* Meta strip */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <DisputeMetaStrip dispute={dispute} />
        </div>

        {/* Description (the original ticket body — pinned at top of thread) */}
        {dispute.description && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Original complaint
            </p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
              {dispute.description}
            </p>
          </div>
        )}

        {/* Thread (messages + status events interleaved) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/30">
          {threadItems.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              No messages yet. Be the first to respond.
            </p>
          ) : (
            threadItems.map((item) =>
              item.kind === 'message' ? (
                <DisputeMessageBubble key={item.key} msg={item.data} />
              ) : (
                <DisputeStatusEventNote
                  key={item.key}
                  status={item.data.status}
                  timestamp={item.data.timestamp}
                  note={item.data.note}
                  by={item.data.updatedByRole}
                />
              ),
            )
          )}
          <div ref={endRef} />
        </div>

        <DisputeChatComposer
          disabled={locked}
          lockedReason={dispute.status}
          onSend={handleSend}
          sending={sending}
        />
      </div>

      {/* Modals */}
      <ResolveDisputeModal
        isOpen={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onSubmit={handleResolveSubmit}
        currency={dispute.currency}
      />
      <EscalateDisputeModal
        isOpen={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        onSubmit={handleEscalateSubmit}
      />
    </>
  );
}
