'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import { useApi, useMutation } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import type { SupportConversationAdmin, SupportMessage } from '@/lib/types';

/**
 * P149 — Ruby+ Support inbox for admins.
 *
 * Two-pane layout (list left, thread right) modelled on the disputes page.
 * The list shows every user who has ever opened the support chat; rows
 * with `adminUnreadCount > 0` show a red pill and float to the top.
 * Selecting a row loads the full thread and clears the admin unread on
 * the server (parallel to the customer's own unread flag).
 *
 * Replies persist as SUPPORT_AGENT messages — same shape the inbound-
 * email bridge writes — so the customer sees them exactly as if a
 * helloruby@ agent had emailed a reply.
 */
export default function SupportChatPage() {
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: convData, isLoading: loadingList, refetch: refetchList } =
    useApi<{
      items: SupportConversationAdmin[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(
      () =>
        api.supportChat.list({
          page: 1,
          limit: 50,
          search: search.trim() || undefined,
          unreadOnly,
        }),
      [search, unreadOnly],
    );

  const conversations = convData?.items ?? [];

  const { data: messagesData, isLoading: loadingMessages, refetch: refetchMessages } =
    useApi<{
      items: SupportMessage[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(
      () => api.supportChat.messages(selectedId!, { page: 1, limit: 200 }),
      [selectedId],
      { enabled: !!selectedId },
    );

  const messages = messagesData?.items ?? [];

  const { mutate: markRead } = useMutation((id: string) =>
    api.supportChat.markRead(id),
  );
  const { mutate: sendReply, isLoading: sending } = useMutation(
    ({ id, text }: { id: string; text: string }) =>
      api.supportChat.reply(id, { text }),
    {
      // Use default toast — no need to customize the message.
    },
  );

  // Clear admin unread when a thread is opened so the badge decays and
  // the list re-sorts. Also refetch to reflect the state.
  useEffect(() => {
    if (!selectedId) return;
    markRead(selectedId).finally(() => {
      refetchList();
    });
  }, [selectedId, markRead, refetchList]);

  // Auto-scroll on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c._id === selectedId) || null,
    [conversations, selectedId],
  );

  const handleSend = useCallback(async () => {
    if (!selectedId || !reply.trim()) return;
    await sendReply({ id: selectedId, text: reply.trim() });
    setReply('');
    await refetchMessages();
    await refetchList();
  }, [selectedId, reply, sendReply, refetchMessages, refetchList]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.adminUnreadCount || 0), 0),
    [conversations],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Support Inbox"
        description="Messages from customers who tapped Ruby+ Support in the mobile app. Replies from here land back in the customer's chat thread instantly."
      />

      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] min-h-[70vh]">
          {/* ── LIST ─────────────────────────────────────────────── */}
          <aside
            className={`border-r border-gray-200 flex flex-col ${
              selectedId ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="p-3 border-b border-gray-200 space-y-2 bg-gray-50">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search users or messages"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 py-2 text-sm bg-transparent focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={unreadOnly}
                    onChange={(e) => setUnreadOnly(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Unread only
                  {totalUnread > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                      {totalUnread}
                    </span>
                  )}
                </label>
                <button
                  onClick={() => refetchList()}
                  className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="p-6 text-sm text-gray-500">Loading…</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle size={40} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    {unreadOnly ? 'No unread threads.' : 'No support conversations yet.'}
                  </p>
                </div>
              ) : (
                <ul>
                  {conversations.map((conv) => {
                    const name = fullName(conv);
                    const preview = conv.lastMessage?.text || '(no messages yet)';
                    const time = conv.lastMessage?.sentAt || conv.updatedAt;
                    const isSelected = conv._id === selectedId;
                    return (
                      <li key={conv._id}>
                        <button
                          onClick={() => setSelectedId(conv._id)}
                          className={`w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${
                            isSelected ? 'bg-ruby-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar name={name} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-gray-900 truncate">
                                  {name}
                                </span>
                                <span className="text-[11px] text-gray-400 shrink-0">
                                  {formatRelativeTime(time)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-0.5">
                                <p className="text-xs text-gray-600 truncate">{preview}</p>
                                {conv.adminUnreadCount > 0 && (
                                  <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                                    {conv.adminUnreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* ── THREAD ───────────────────────────────────────────── */}
          <section
            className={`flex flex-col ${selectedId ? 'flex' : 'hidden lg:flex'} min-h-[70vh]`}
          >
            {!selectedId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageCircle size={48} className="text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  Select a conversation on the left to read + reply.
                </p>
              </div>
            ) : (
              <>
                <ThreadHeader
                  conversation={selectedConversation}
                  onBack={() => setSelectedId(null)}
                />
                <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                  {loadingMessages ? (
                    <p className="text-sm text-gray-500">Loading messages…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-10">
                      No messages in this thread yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {messages.map((m) => (
                        <MessageBubble key={m._id} message={m} />
                      ))}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-gray-200 bg-white flex items-end gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type your reply…"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ruby-500 resize-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !reply.trim()}
                    className="px-4 py-2 bg-ruby-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-ruby-700 transition"
                  >
                    <Send size={16} />
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function ThreadHeader({
  conversation,
  onBack,
}: {
  conversation: SupportConversationAdmin | null;
  onBack: () => void;
}) {
  if (!conversation) return null;
  const name = fullName(conversation);
  return (
    <div className="p-3 border-b border-gray-200 bg-white flex items-center gap-3">
      <button onClick={onBack} className="lg:hidden text-gray-500 hover:text-gray-800">
        <ArrowLeft size={20} />
      </button>
      <Avatar name={name} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">{name}</div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
          {conversation.user?.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail size={11} /> {conversation.user.email}
            </span>
          )}
          {conversation.user?.phone && (
            <span className="flex items-center gap-1">
              <Phone size={11} /> {conversation.user.phone}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const isUser = message.senderType === 'USER';
  const isBot = message.senderType === 'BOT';
  const align = isUser ? 'items-start' : 'items-end';
  const bubble = isUser
    ? 'bg-white border border-gray-200 text-gray-900'
    : isBot
    ? 'bg-gray-100 text-gray-700'
    : 'bg-ruby-600 text-white';
  const label = isUser
    ? 'Customer'
    : isBot
    ? 'System'
    : message.senderName || 'Ruby+ Support';

  return (
    <div className={`flex flex-col ${align}`}>
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${bubble} shadow-sm`}>
        {message.text || (
          <span className="italic text-gray-400">(attachment only)</span>
        )}
      </div>
      <div className="text-[10px] text-gray-400 mt-1 px-2">
        {label} · {formatRelativeTime(message.createdAt)}
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
  return (
    <div className="w-10 h-10 rounded-full bg-ruby-100 text-ruby-700 flex items-center justify-center text-sm font-semibold shrink-0">
      {initials}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function fullName(conv: SupportConversationAdmin): string {
  const u = conv.user;
  if (!u) return 'Customer';
  const s = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return s || u.email || 'Customer';
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString();
}
