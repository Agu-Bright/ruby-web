'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { MessageCircle, Paperclip, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useConversations, useChatMessages, useSendChatMessage } from '@/lib/business-api/chat';

export default function ChatPage() {
  const [search, setSearch] = useState('');
  const conversations = useConversations(search);
  const list = Array.isArray(conversations.data) ? conversations.data : (conversations.data?.items ?? []);
  const [selected, setSelected] = useState('');
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{ url: string; type: 'IMAGE' | 'FILE'; name?: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!selected && list[0]?._id) setSelected(list[0]._id);
  }, [selected, list]);

  const messages = useChatMessages(selected);
  const send = useSendChatMessage(selected, () => void messages.refetch());

  useEffect(() => {
    if (selected) void api.businessChat.markRead(selected);
  }, [selected]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const response = await api.media.upload(file, 'chat');
      const url = (response.data as any)?.url ?? (response.data as any)?.secureUrl;
      if (url) {
        setAttachment({
          url,
          type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
          name: file.name,
        });
      }
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() && !attachment) return;
    void send.mutate({ text: text.trim() || undefined, attachments: attachment ? [attachment] : undefined });
    setText('');
    setAttachment(null);
  };

  const items = Array.isArray(messages.data) ? messages.data : (messages.data?.items ?? []);

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <p className="text-xs font-semibold uppercase text-ruby-red">Communication</p>
      <h1 className="mt-1 text-2xl font-bold">Customer chat</h1>

      <section className="mt-4 grid h-[calc(100dvh-10.5rem)] min-h-[500px] grid-rows-[minmax(170px,32%)_1fr] overflow-hidden rounded-2xl border bg-white sm:mt-6 sm:grid-rows-[220px_1fr] lg:grid-cols-[340px_1fr] lg:grid-rows-1">
        <aside className="min-h-0 overflow-y-auto overscroll-contain border-b lg:border-b-0 lg:border-r">
          <div className="sticky top-0 z-10 bg-white p-3 sm:p-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-lg border p-3 text-sm"
            />
          </div>
          {conversations.isLoading ? <p className="p-4 text-sm text-gray-500">Loading conversations…</p> : null}
          {!conversations.isLoading && !list.length ? <p className="p-4 text-sm text-gray-500">No customer conversations yet.</p> : null}
          {list.map((conversation: any) => {
            const participant = conversation.participants?.find((item: any) => item.userType === 'USER');
            return (
              <button
                key={conversation._id}
                type="button"
                onClick={() => setSelected(conversation._id)}
                className={`w-full border-t p-3 text-left sm:p-4 ${selected === conversation._id ? 'bg-ruby-red/5' : ''}`}
              >
                <b>{participant?.displayName ?? 'Customer'}</b>
                <small className="mt-1 block truncate text-gray-500">{conversation.lastMessage?.text ?? 'No messages yet'}</small>
              </button>
            );
          })}
        </aside>

        <div className="flex min-h-0 flex-col">
          {selected ? (
            <>
              <div className="shrink-0 border-b p-3 font-semibold sm:p-4">Conversation</div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-gray-50 p-3 sm:p-5">
                {messages.isLoading ? <p className="text-sm text-gray-500">Loading messages…</p> : null}
                {!messages.isLoading && !items.length ? <p className="text-sm text-gray-500">No messages yet.</p> : null}
                {items.map((message: any) => (
                  <div
                    key={message._id}
                    className={message.senderType === 'BUSINESS_OWNER'
                      ? 'ml-auto max-w-[85%] rounded-2xl bg-ruby-red p-3 text-sm text-white sm:max-w-[75%]'
                      : 'max-w-[85%] rounded-2xl bg-white p-3 text-sm shadow-sm sm:max-w-[75%]'}
                  >
                    {message.text}
                    {message.attachments?.map((file: any) => (
                      <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="mt-2 block underline">
                        {file.name ?? 'Attachment'}
                      </a>
                    ))}
                  </div>
                ))}
              </div>
              <form onSubmit={submit} className="shrink-0 border-t p-3 sm:p-4">
                {attachment ? <p className="mb-2 text-xs text-gray-500">Attached: {attachment.name}</p> : null}
                <div className="flex gap-2">
                  <label className="shrink-0 rounded-lg border p-3 text-gray-600">
                    <Paperclip size={18} />
                    <input type="file" className="sr-only" onChange={upload} />
                  </label>
                  <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a message…" className="min-w-0 flex-1 rounded-lg border p-3 text-sm" />
                  <button type="submit" disabled={send.isLoading || uploading} className="shrink-0 rounded-lg bg-ruby-red px-4 text-white disabled:opacity-50">
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="m-auto text-center text-gray-400">
              <MessageCircle className="mx-auto" />
              <p className="mt-2 text-sm">Select a conversation</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
