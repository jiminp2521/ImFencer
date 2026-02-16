import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient, hasServiceRole } from '@/lib/supabase-admin';
import { withApiTiming } from '@/lib/api-timing';

export const dynamic = 'force-dynamic';

const CHAT_MESSAGES_LIMIT = 80;

type ParticipantRow = {
  chat_id: string;
  user_id: string;
  profiles: {
    username: string | null;
  } | null;
};

type UnreadCountRow = {
  chat_id: string;
  unread_count: number;
};

export async function GET(request: NextRequest) {
  return withApiTiming('chat-overview', async () => {
    const { searchParams } = new URL(request.url);
    const preferredChatId = searchParams.get('chat');
    const shouldOpenChat = searchParams.get('open') === '1';
    const isPrefetch = request.headers.get('x-imfencer-prefetch') === '1';

    const supabase = await createClient();
    const adminClient = (() => {
      if (!hasServiceRole) return null;
      try {
        return createAdminClient();
      } catch (error) {
        console.error('Failed to init admin client in chat overview:', error);
        return null;
      }
    })();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    const participantResult = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id);

    let participantRows = participantResult.data || [];
    if (participantResult.error) {
      console.error('Error fetching chat participants:', participantResult.error);

      if (adminClient) {
        const adminParticipantResult = await adminClient
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', user.id);

        if (!adminParticipantResult.error) {
          participantRows = adminParticipantResult.data || [];
        } else {
          console.error('Admin fallback failed for chat participants:', adminParticipantResult.error);
        }
      }
    }

    const chatIds = Array.from(new Set(participantRows.map((row) => row.chat_id)));

    const selectedChatId = preferredChatId && chatIds.includes(preferredChatId)
      ? preferredChatId
      : chatIds[0] || null;

    const markReadPromise = selectedChatId && shouldOpenChat && !isPrefetch
      ? supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('chat_id', selectedChatId)
          .neq('sender_id', user.id)
          .is('read_at', null)
      : Promise.resolve({ error: null });

    const [chatsResult, partnerResultRaw, messagesResult, markReadResult] = await Promise.all([
      chatIds.length > 0
        ? supabase
            .from('chats')
            .select('id, last_message, updated_at')
            .in('id', chatIds)
            .order('updated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      chatIds.length > 0
        ? supabase
            .from('chat_participants')
            .select(`
              chat_id,
              user_id,
              profiles:user_id (username)
            `)
            .in('chat_id', chatIds)
            .neq('user_id', user.id)
        : Promise.resolve({ data: [], error: null }),
      selectedChatId
        ? supabase
            .from('messages')
            .select(`
              id,
              sender_id,
              content,
              created_at,
              read_at,
              profiles:sender_id (username)
            `)
            .eq('chat_id', selectedChatId)
            .order('created_at', { ascending: false })
            .limit(CHAT_MESSAGES_LIMIT)
        : Promise.resolve({ data: [], error: null }),
      markReadPromise,
    ]);

    if (markReadResult.error) {
      console.error('Error updating message read state:', markReadResult.error);
    }

    if (chatsResult.error) {
      console.error('Error fetching chats:', chatsResult.error);
    }
    let partnerResult = partnerResultRaw;
    if (partnerResult.error && adminClient) {
      console.error('Error fetching chat partners:', partnerResult.error);

      const adminPartnerResult = await adminClient
        .from('chat_participants')
        .select(`
          chat_id,
          user_id,
          profiles:user_id (username)
        `)
        .in('chat_id', chatIds)
        .neq('user_id', user.id);

      if (!adminPartnerResult.error) {
        partnerResult = adminPartnerResult;
      } else {
        console.error('Admin fallback failed for chat partners:', adminPartnerResult.error);
      }
    } else if (partnerResult.error) {
      console.error('Error fetching chat partners:', partnerResult.error);
    }
    if (messagesResult.error) {
      console.error('Error fetching messages:', messagesResult.error);
    }

    const partnerMap = new Map<string, string>();
    for (const participant of (partnerResult.data || []) as unknown as ParticipantRow[]) {
      const profile = Array.isArray(participant.profiles) ? participant.profiles[0] : participant.profiles;
      partnerMap.set(participant.chat_id, profile?.username || '알 수 없음');
    }

    const chats = chatsResult.data || [];
    const messages = [...(messagesResult.data || [])].reverse();
    const reachedMessageLimit = messages.length >= CHAT_MESSAGES_LIMIT;
    const unreadCountMap = new Map<string, number>();

    if (chatIds.length > 0) {
      const unreadCountRpcResult = await supabase.rpc('get_chat_unread_counts', {
        p_user_id: user.id,
        p_chat_ids: chatIds,
      });

      if (!unreadCountRpcResult.error) {
        for (const row of (unreadCountRpcResult.data || []) as unknown as UnreadCountRow[]) {
          unreadCountMap.set(row.chat_id, Number(row.unread_count || 0));
        }
      } else {
        console.error('RPC unread count failed, fallback to row counting:', unreadCountRpcResult.error);
      }
    }

    if (chatIds.length > 0 && unreadCountMap.size === 0) {
      const unreadRowsResult = await supabase
        .from('messages')
        .select('chat_id')
        .in('chat_id', chatIds)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (unreadRowsResult.error) {
        console.error('Error fetching unread counts:', unreadRowsResult.error);
      } else {
        for (const row of (unreadRowsResult.data || []) as unknown as { chat_id: string }[]) {
          unreadCountMap.set(row.chat_id, (unreadCountMap.get(row.chat_id) || 0) + 1);
        }
      }
    }

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      chatIds,
      selectedChatId,
      chats,
      partnerMap: Object.fromEntries(partnerMap.entries()),
      unreadCountMap: Object.fromEntries(unreadCountMap.entries()),
      messages,
      reachedMessageLimit,
      chatMessagesLimit: CHAT_MESSAGES_LIMIT,
    });
  });
}
