'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Lock, Loader2 } from 'lucide-react';

interface Props {
  disabled?: boolean;
  /** "RESOLVED" / "CLOSED" — shown in the locked banner. */
  lockedReason?: string;
  /** Called with the trimmed message + isInternal flag. */
  onSend: (message: string, isInternal: boolean) => Promise<void> | void;
  /** True while a send is in flight. Disables the send button + textarea. */
  sending?: boolean;
}

/**
 * Sticky composer at the bottom of the chat pane. Two states:
 *   - Active: auto-growing textarea + internal-note toggle + send button.
 *     ⌘/Ctrl-Enter sends; Shift-Enter inserts newline.
 *   - Locked: read-only banner explaining the thread state. Renders
 *     when `disabled` is true (RESOLVED / CLOSED disputes).
 *
 * Textarea auto-grows up to 6 rows. Beyond that it scrolls — keeps the
 * thread visible so the admin can reference the conversation while typing
 * a long reply.
 */
export function DisputeChatComposer({
  disabled,
  lockedReason,
  onSend,
  sending,
}: Props) {
  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize as content grows. Cap at ~6 lines (≈144px) before scrolling
  // takes over.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px';
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter → send. Shift + Enter or plain Enter → newline.
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    await onSend(trimmed, isInternal);
    setText('');
    // Keep isInternal as-is: admins often add several internal notes in a
    // row. Clearing it would force them to re-tick every time.
  };

  if (disabled) {
    return (
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center">
        <p className="text-xs text-gray-600">
          This dispute is{' '}
          <span className="font-semibold">
            {lockedReason || 'closed'}
          </span>
          . Reopen via the actions menu to reply.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 bg-white">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isInternal
            ? 'Internal note (visible only to admins)'
            : 'Reply to the conversation… (⌘/Ctrl-Enter to send)'
        }
        rows={2}
        disabled={sending}
        className="w-full px-4 py-3 text-sm resize-none focus:outline-none placeholder-gray-400 disabled:opacity-60"
      />
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50">
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
            className="accent-ruby-500"
          />
          <Lock className="w-3 h-3" />
          Internal note
        </label>
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || sending}
          className="inline-flex items-center gap-1.5 bg-ruby-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-md hover:bg-ruby-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          {isInternal ? 'Save note' : 'Send reply'}
        </button>
      </div>
    </div>
  );
}
