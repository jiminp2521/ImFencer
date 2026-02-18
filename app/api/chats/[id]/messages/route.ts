import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient, hasUsableServiceRole } from '@/lib/supabase-admin';
import { ensureProfileRow } from '@/lib/ensure-profile';
import { createNotificationAndPush } from '@/lib/notifications';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CreateMessageBody = {
  content?: string;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id: chatId } = await params;
  const supabase = await createClient();
  const adminClient = (() => {
    if (!hasUsableServiceRole) return null;
    try {
      return createAdminClient();
    } catch (error) {
      console.error('Failed to init admin client in chat message route:', error);
      return null;
    }
  })();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateMessageBody | null;
  const content = body?.content?.trim() ?? '';

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json({ error: 'Content too long' }, { status: 400 });
  }

  try {
    let insertResult = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content,
      })
      .select('id, created_at')
      .single();

    if (insertResult.error?.code === '23503') {
      await ensureProfileRow(supabase, user.id);
      insertResult = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content,
        })
        .select('id, created_at')
        .single();
    }

    if ((insertResult.error || !insertResult.data) && adminClient) {
      console.error('Error inserting message with user session, retrying with admin:', insertResult.error);
      insertResult = await adminClient
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content,
        })
        .select('id, created_at')
        .single();
    }

    const inserted = insertResult.data;
    if (insertResult.error || !inserted) {
      console.error('Error inserting message:', insertResult.error);
      return NextResponse.json(
        {
          error: 'Failed to send message',
          detail: insertResult.error?.message,
        },
        { status: 500 }
      );
    }

    // Best-effort chat preview update (requires chat update policy in DB).
    let chatUpdateResult = await supabase
      .from('chats')
      .update({ last_message: content, updated_at: new Date().toISOString() })
      .eq('id', chatId);

    if (chatUpdateResult.error && adminClient) {
      chatUpdateResult = await adminClient
        .from('chats')
        .update({ last_message: content, updated_at: new Date().toISOString() })
        .eq('id', chatId);
    }

    if (chatUpdateResult.error) {
      console.error('Error updating chat preview:', chatUpdateResult.error);
    }

    // 참여자 조회/알림 전송은 비동기로 분리하여 메시지 전송 응답을 빠르게 반환한다.
    void (async () => {
      let participantsResult = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', user.id);

      if (participantsResult.error && adminClient) {
        participantsResult = await adminClient
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', chatId)
          .neq('user_id', user.id);
      }

      if (participantsResult.error) {
        console.error('Error fetching chat participants for notifications:', participantsResult.error);
        return;
      }

      if (!participantsResult.data || participantsResult.data.length === 0) {
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
            dedupeKey: `chat-message:${inserted.id}:${participant.user_id}`,
          });
        })
      );
    })().catch((notificationError) => {
      console.error('Chat message notification failed:', notificationError);
    });

    return NextResponse.json({ ok: true, id: inserted.id, createdAt: inserted.created_at });
  } catch (error) {
    console.error('POST /api/chats/[id]/messages failed:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
