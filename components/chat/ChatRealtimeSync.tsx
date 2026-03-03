'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export type ChatRealtimeMessageRow = {
  id?: string;
  chat_id?: string;
  sender_id?: string;
  content?: string;
  created_at?: string;
  read_at?: string | null;
  client_id?: string | null;
};

export type ChatRealtimeChatRow = {
  id?: string;
  last_message?: string | null;
  updated_at?: string;
};

export type ChatParticipantRealtimeRow = {
  chat_id?: string;
  user_id?: string;
};

export type ChatRealtimeEvent =
  | {
      type: 'message_insert';
      row: ChatRealtimeMessageRow;
    }
  | {
      type: 'message_update';
      row: ChatRealtimeMessageRow;
    }
  | {
      type: 'chat_update';
      row: ChatRealtimeChatRow;
    }
  | {
      type: 'membership_insert';
      row: ChatParticipantRealtimeRow;
    };

type ChatRealtimeSyncProps = {
  chatIds: string[];
  userId: string;
  onEvent?: (event: ChatRealtimeEvent) => void;
  onSyncRequired?: () => void;
};

export function ChatRealtimeSync({ chatIds, userId, onEvent, onSyncRequired }: ChatRealtimeSyncProps) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  const onSyncRequiredRef = useRef(onSyncRequired);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onSyncRequiredRef.current = onSyncRequired;
  }, [onSyncRequired]);

  useEffect(() => {
    if (!userId) return;

    let supabase;
    try {
      supabase = createClient();
    } catch (error) {
      console.error('Supabase client init failed in ChatRealtimeSync:', error);
      return;
    }

    const chatIdSet = new Set(chatIds);
    const scheduleSync = (delay = 420) => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (onSyncRequiredRef.current) {
          onSyncRequiredRef.current();
        } else {
          router.refresh();
        }
      }, delay);
    };

    const channel = supabase
      .channel(`chat-realtime-${userId.slice(0, 8)}-${chatIds.length}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const row = (payload.new || {}) as ChatRealtimeMessageRow;
        if (!row.chat_id) return;

        if (!chatIdSet.has(row.chat_id)) {
          scheduleSync(140);
        }

        onEventRef.current?.({
          type: 'message_insert',
          row,
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const row = ((payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) ||
          {}) as ChatRealtimeMessageRow;
        if (!row.chat_id) return;

        onEventRef.current?.({
          type: 'message_update',
          row,
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats' }, (payload) => {
        const row = ((payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) ||
          {}) as ChatRealtimeChatRow;
        if (!row.id) return;

        if (!chatIdSet.has(row.id)) {
          scheduleSync(140);
        }

        onEventRef.current?.({
          type: 'chat_update',
          row,
        });
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new || {}) as ChatParticipantRealtimeRow;
          onEventRef.current?.({
            type: 'membership_insert',
            row,
          });
          scheduleSync(120);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          scheduleSync(160);
        }
      })
    ;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [chatIds, router, userId]);

  return null;
}
