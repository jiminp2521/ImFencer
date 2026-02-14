import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

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
    await ensureProfileRow(supabase, user.id);

    const { data: inserted, error: insertError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content,
      })
      .select('id, created_at')
      .single();

    if (insertError || !inserted) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Best-effort chat preview update (requires chat update policy in DB).
    const { error: chatUpdateError } = await supabase
      .from('chats')
      .update({ last_message: content, updated_at: new Date().toISOString() })
      .eq('id', chatId);

    if (chatUpdateError) {
      console.error('Error updating chat preview:', chatUpdateError);
    }

    const participantsResult = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId)
      .neq('user_id', user.id);

    if (participantsResult.error) {
      console.error('Error fetching chat participants for notifications:', participantsResult.error);
    } else if (participantsResult.data && participantsResult.data.length > 0) {
      const rows = participantsResult.data.map((participant: { user_id: string }) => ({
        user_id: participant.user_id,
        actor_id: user.id,
        type: 'chat' as const,
        title: '새 메시지가 도착했습니다.',
        body: content.length > 100 ? `${content.slice(0, 100)}...` : content,
        link: `/chat?chat=${chatId}`,
      }));

      const { error: notificationError } = await supabase.from('notifications').insert(rows);
      if (notificationError) {
        console.error('Error creating chat message notifications:', notificationError);
      }
    }

    return NextResponse.json({ ok: true, id: inserted.id, createdAt: inserted.created_at });
  } catch (error) {
    console.error('POST /api/chats/[id]/messages failed:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

