import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';
import { createNotificationAndPush } from '@/lib/notifications';
import { isUuid } from '@/lib/security-validation';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CreateMessageBody = {
  content?: string;
};

type InsertedMessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id: chatId } = await params;

  if (!isUuid(chatId)) {
    return NextResponse.json({ error: 'Invalid chat id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateMessageBody | null;
  const content = (body?.content || '').trim();

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json({ error: 'Content too long' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { data: membership, error: membershipError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', chatId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      console.error('Failed to verify chat membership:', membershipError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content,
      })
      .select('id, chat_id, sender_id, content, created_at, read_at')
      .single();

    if (insertError || !inserted) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    const insertedMessage = inserted as InsertedMessageRow;

    const { error: chatUpdateError } = await supabase
      .from('chats')
      .update({ last_message: content, updated_at: new Date().toISOString() })
      .eq('id', chatId);

    if (chatUpdateError) {
      console.error('Error updating chat preview:', chatUpdateError);
    }

    void (async () => {
      const participantsResult = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', user.id);

      if (participantsResult.error || !participantsResult.data || participantsResult.data.length === 0) {
        if (participantsResult.error) {
          console.error('Error fetching chat participants for notifications:', participantsResult.error);
        }
        return;
      }

      await Promise.all(
        participantsResult.data.map(async (participant: { user_id: string }) => {
          await createNotificationAndPush({
            userId: participant.user_id,
            actorId: user.id,
            type: 'chat',
            title: '새 메시지가 도착했습니다.',
            body: content.length > 100 ? `${content.slice(0, 100)}...` : content,
            link: `/chat?chat=${chatId}`,
            dedupeKey: `chat-message:${insertedMessage.id}:${participant.user_id}`,
          });
        })
      );
    })().catch((notificationError) => {
      console.error('Chat message notification failed:', notificationError);
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: insertedMessage.id,
        chat_id: insertedMessage.chat_id,
        sender_id: insertedMessage.sender_id,
        content: insertedMessage.content,
        created_at: insertedMessage.created_at,
        read_at: insertedMessage.read_at,
      },
    });
  } catch (error) {
    console.error('POST /api/chats/[id]/messages failed:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
