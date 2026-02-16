'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type ChatRealtimeSyncProps = {
  chatIds: string[];
  onMessage?: () => void;
};

type MessageRow = {
  chat_id?: string;
};

export function ChatRealtimeSync({ chatIds, onMessage }: ChatRealtimeSyncProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (chatIds.length === 0) return;

    const chatIdSet = new Set(chatIds);
    const scheduleRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (onMessage) {
          onMessage();
        } else {
          router.refresh();
        }
      }, 420);
    };

    const channel = supabase
      .channel(`chat-realtime-${chatIds.join('-')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const message = ((payload.new && Object.keys(payload.new).length > 0
          ? payload.new
          : payload.old) || {}) as MessageRow;

        if (message.chat_id && chatIdSet.has(message.chat_id)) {
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
  }, [chatIds, onMessage, router, supabase]);

  return null;
}
