'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type ChatRealtimeSyncProps = {
  chatIds: string[];
};

type MessageRow = {
  chat_id?: string;
};

type ChatRow = {
  id?: string;
};

export function ChatRealtimeSync({ chatIds }: ChatRealtimeSyncProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (chatIds.length === 0) return;

    const chatIdSet = new Set(chatIds);
    const scheduleRefresh = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 120);
    };

    const channel = supabase
      .channel(`chat-realtime-${chatIds.join('-')}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const message = ((payload.new && Object.keys(payload.new).length > 0
          ? payload.new
          : payload.old) || {}) as MessageRow;

        if (message.chat_id && chatIdSet.has(message.chat_id)) {
          scheduleRefresh();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats' }, (payload) => {
        const chat = (payload.new || {}) as ChatRow;

        if (chat.id && chatIdSet.has(chat.id)) {
          scheduleRefresh();
        }
      })
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [chatIds, router, supabase]);

  return null;
}
