import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type StartChatBody = {
  targetUserId?: string;
  contextTitle?: string;
  openingMessage?: string;
};

type ChatParticipantRow = {
  chat_id: string;
  user_id: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as StartChatBody | null;
  const targetUserId = body?.targetUserId?.trim() ?? '';
  const contextTitle = body?.contextTitle?.trim() ?? '';
  const openingMessage = body?.openingMessage?.trim() ?? '';

  if (!targetUserId) {
    return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
  }
  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Cannot chat with yourself' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { data: participantRows, error: participantsError } = await supabase
      .from('chat_participants')
      .select('chat_id, user_id')
      .in('user_id', [user.id, targetUserId]);

    if (participantsError) {
      console.error('Error loading existing chat participants:', participantsError);
      return NextResponse.json({ error: 'Failed to load existing chats' }, { status: 500 });
    }

    const byChat = new Map<string, Set<string>>();
    for (const row of (participantRows || []) as ChatParticipantRow[]) {
      if (!byChat.has(row.chat_id)) byChat.set(row.chat_id, new Set());
      byChat.get(row.chat_id)!.add(row.user_id);
    }

    let chatId: string | null = null;
    for (const [candidateChatId, userIds] of byChat.entries()) {
      if (userIds.has(user.id) && userIds.has(targetUserId)) {
        chatId = candidateChatId;
        break;
      }
    }

    if (!chatId) {
      const chatStartText = `${contextTitle || '새로운 문의'} 대화가 시작되었습니다.`;

      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          last_message: chatStartText,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (chatError || !chat) {
        console.error('Error creating chat:', chatError);
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
      }

      chatId = chat.id;

      const { error: myParticipantError } = await supabase
        .from('chat_participants')
        .insert({ chat_id: chatId, user_id: user.id });

      if (myParticipantError) {
        console.error('Error creating chat participant for me:', myParticipantError);
        return NextResponse.json({ error: 'Failed to create chat participants' }, { status: 500 });
      }

      const { error: targetParticipantError } = await supabase
        .from('chat_participants')
        .insert({ chat_id: chatId, user_id: targetUserId });

      if (targetParticipantError) {
        console.error('Error creating chat participant for target:', targetParticipantError);
        return NextResponse.json({ error: 'Failed to create chat participants' }, { status: 500 });
      }

      const firstMessage =
        openingMessage ||
        (contextTitle ? `${contextTitle} 문의드립니다.` : '안녕하세요. 문의드립니다.');

      const { error: firstMessageError } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        content: firstMessage,
      });

      if (firstMessageError) {
        // Chat was created; message insert failed. Keep chatId and let UI proceed.
        console.error('Error creating first message:', firstMessageError);
      } else {
        // Best-effort chat preview update (requires chat update policy in DB).
        const { error: chatUpdateError } = await supabase
          .from('chats')
          .update({ last_message: firstMessage, updated_at: new Date().toISOString() })
          .eq('id', chatId);

        if (chatUpdateError) {
          console.error('Error updating chat preview:', chatUpdateError);
        }

        const { error: notificationError } = await supabase.from('notifications').insert({
          user_id: targetUserId,
          actor_id: user.id,
          type: 'chat',
          title: '새 채팅이 시작되었습니다.',
          body: firstMessage,
          link: `/chat?chat=${chatId}`,
        });

        if (notificationError) {
          console.error('Error creating chat notification:', notificationError);
        }
      }
    }

    return NextResponse.json({ ok: true, chatId });
  } catch (error) {
    console.error('POST /api/chats/start failed:', error);
    return NextResponse.json({ error: 'Failed to start chat' }, { status: 500 });
  }
}

