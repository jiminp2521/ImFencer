import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { isUuid } from '@/lib/security-validation';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type MarkReadBody = {
  messageId?: string;
};

type MessageCutoffRow = {
  id: string;
  chat_id: string;
  created_at: string;
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

  const body = (await request.json().catch(() => null)) as MarkReadBody | null;
  const messageId = (body?.messageId || '').trim();
  if (messageId && !isUuid(messageId)) {
    return NextResponse.json({ error: 'Invalid message id' }, { status: 400 });
  }

  let cutoffCreatedAt: string | null = null;
  if (messageId) {
    const cutoffResult = await supabase
      .from('messages')
      .select('id, chat_id, created_at')
      .eq('id', messageId)
      .maybeSingle();

    if (cutoffResult.error) {
      if (cutoffResult.error.code === '42501') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      console.error('Failed to load read cutoff message:', cutoffResult.error);
      return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 });
    }

    const cutoff = cutoffResult.data as MessageCutoffRow | null;
    if (!cutoff || cutoff.chat_id !== chatId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    cutoffCreatedAt = cutoff.created_at;
  }

  const readAt = new Date().toISOString();

  let updateQuery = supabase
    .from('messages')
    .update({ read_at: readAt })
    .eq('chat_id', chatId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  if (cutoffCreatedAt) {
    updateQuery = updateQuery.lte('created_at', cutoffCreatedAt);
  }

  const { error: updateError } = await updateQuery;

  if (updateError) {
    if (updateError.code === '42501') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to mark chat read:', updateError);
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    chatId,
    uptoMessageId: messageId || null,
    readAt,
  });
}
