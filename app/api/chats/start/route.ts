import { NextResponse } from 'next/server';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient, hasUsableServiceRole } from '@/lib/supabase-admin';
import { ensureProfileRow } from '@/lib/ensure-profile';
import { createNotificationAndPush } from '@/lib/notifications';

type StartChatBody = {
  targetUserId?: string;
  contextTitle?: string;
  openingMessage?: string;
};

type ChatParticipantRow = {
  chat_id: string;
  user_id: string;
};

type ChatInsertRow = {
  id: string;
};

const CHAT_RLS_FIX_HINT = 'Supabase SQL Editor에서 migrations/20260217_chat_rls_fix.sql 을 실행해주세요.';
const SERVICE_ROLE_KEY_HINT =
  'Vercel Production의 SUPABASE_SERVICE_ROLE_KEY를 Supabase Dashboard의 sb_secret_ 키로 교체하고 재배포해주세요.';

const toErrorMessage = (error: PostgrestError | Error | null | undefined) => {
  if (!error) return 'Unknown error';
  return error.message || 'Unknown error';
};

const isPolicyRelatedError = (message: string) =>
  /(row-level security|infinite recursion|permission denied|policy)/i.test(message);

const isLegacyKeyError = (message: string) => /legacy api keys are disabled/i.test(message);

const getAdminClientSafe = () => {
  if (!hasUsableServiceRole) return null;

  try {
    return createAdminClient();
  } catch (error) {
    console.error('Failed to init admin client for chats/start:', error);
    return null;
  }
};

const findExistingDirectChat = (
  participantRows: ChatParticipantRow[],
  currentUserId: string,
  targetUserId: string
) => {
  const byChat = new Map<string, Set<string>>();

  for (const row of participantRows) {
    if (!byChat.has(row.chat_id)) {
      byChat.set(row.chat_id, new Set());
    }

    byChat.get(row.chat_id)!.add(row.user_id);
  }

  for (const [chatId, members] of byChat.entries()) {
    if (members.has(currentUserId) && members.has(targetUserId)) {
      return chatId;
    }
  }

  return null;
};

async function createChatRecord({
  userClient,
  adminClient,
  lastMessage,
}: {
  userClient: SupabaseClient;
  adminClient: SupabaseClient | null;
  lastMessage: string;
}) {
  const payload = {
    last_message: lastMessage,
    updated_at: new Date().toISOString(),
  };

  const userInsertResult = await userClient
    .from('chats')
    .insert(payload)
    .select('id')
    .single();

  if (!userInsertResult.error && userInsertResult.data) {
    return {
      ok: true as const,
      chatId: (userInsertResult.data as ChatInsertRow).id,
      usedAdmin: false,
    };
  }

  const userErrorMessage = toErrorMessage(userInsertResult.error);
  console.error('Error creating chat with user session:', userInsertResult.error);

  if (!adminClient) {
    return {
      ok: false as const,
      detail: userErrorMessage,
      hint: isPolicyRelatedError(userErrorMessage) ? CHAT_RLS_FIX_HINT : null,
    };
  }

  const adminInsertResult = await adminClient
    .from('chats')
    .insert(payload)
    .select('id')
    .single();

  if (!adminInsertResult.error && adminInsertResult.data) {
    return {
      ok: true as const,
      chatId: (adminInsertResult.data as ChatInsertRow).id,
      usedAdmin: true,
    };
  }

  const adminErrorMessage = toErrorMessage(adminInsertResult.error);
  console.error('Error creating chat with admin client:', adminInsertResult.error);

  return {
    ok: false as const,
    detail: isLegacyKeyError(adminErrorMessage) ? userErrorMessage : adminErrorMessage,
    hint: isLegacyKeyError(adminErrorMessage)
      ? SERVICE_ROLE_KEY_HINT
      : isPolicyRelatedError(userErrorMessage)
        ? CHAT_RLS_FIX_HINT
        : null,
  };
}

async function upsertParticipant({
  userClient,
  adminClient,
  chatId,
  userId,
}: {
  userClient: SupabaseClient;
  adminClient: SupabaseClient | null;
  chatId: string;
  userId: string;
}) {
  const payload = {
    chat_id: chatId,
    user_id: userId,
  };

  const userUpsertResult = await userClient.from('chat_participants').upsert(payload, {
    onConflict: 'chat_id,user_id',
    ignoreDuplicates: true,
  });

  if (!userUpsertResult.error) {
    return {
      ok: true as const,
      usedAdmin: false,
      detail: null,
      hint: null,
    };
  }

  const userErrorMessage = toErrorMessage(userUpsertResult.error);
  console.error(`Error upserting chat participant via user client (${userId}):`, userUpsertResult.error);

  if (!adminClient) {
    return {
      ok: false as const,
      usedAdmin: false,
      detail: userErrorMessage,
      hint: isPolicyRelatedError(userErrorMessage) ? CHAT_RLS_FIX_HINT : null,
    };
  }

  const adminUpsertResult = await adminClient.from('chat_participants').upsert(payload, {
    onConflict: 'chat_id,user_id',
    ignoreDuplicates: true,
  });

  if (!adminUpsertResult.error) {
    return {
      ok: true as const,
      usedAdmin: true,
      detail: null,
      hint: null,
    };
  }

  const adminErrorMessage = toErrorMessage(adminUpsertResult.error);
  console.error(`Error upserting chat participant via admin client (${userId}):`, adminUpsertResult.error);

  return {
    ok: false as const,
    usedAdmin: true,
    detail: isLegacyKeyError(adminErrorMessage) ? userErrorMessage : adminErrorMessage,
    hint: isLegacyKeyError(adminErrorMessage)
      ? SERVICE_ROLE_KEY_HINT
      : isPolicyRelatedError(userErrorMessage)
        ? CHAT_RLS_FIX_HINT
        : null,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const adminClient = getAdminClientSafe();
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

    const participantRowsResult = await supabase
      .from('chat_participants')
      .select('chat_id, user_id')
      .in('user_id', [user.id, targetUserId]);

    let participantRows = (participantRowsResult.data || []) as ChatParticipantRow[];
    let participantLookupWarning: string | null = null;

    if (participantRowsResult.error) {
      const lookupErrorMessage = toErrorMessage(participantRowsResult.error);
      participantLookupWarning = lookupErrorMessage;
      console.error('Error loading existing chat participants via user client:', participantRowsResult.error);

      if (adminClient) {
        const adminLookupResult = await adminClient
          .from('chat_participants')
          .select('chat_id, user_id')
          .in('user_id', [user.id, targetUserId]);

        if (!adminLookupResult.error) {
          participantRows = (adminLookupResult.data || []) as ChatParticipantRow[];
          participantLookupWarning = null;
        } else {
          console.error('Error loading existing chat participants via admin client:', adminLookupResult.error);
        }
      }
    }

    let chatId = findExistingDirectChat(participantRows, user.id, targetUserId);
    let createdNewChat = false;

    if (!chatId) {
      const firstMessage =
        openingMessage ||
        (contextTitle ? `${contextTitle} 문의드립니다.` : '안녕하세요. 문의드립니다.');

      const chatCreateResult = await createChatRecord({
        userClient: supabase,
        adminClient,
        lastMessage: firstMessage,
      });

      if (!chatCreateResult.ok) {
        return NextResponse.json(
          {
            error: 'Failed to create chat',
            code: 'CHAT_CREATE_FAILED',
            detail: chatCreateResult.detail,
            hint: chatCreateResult.hint,
          },
          { status: 500 }
        );
      }

      chatId = chatCreateResult.chatId;
      createdNewChat = true;

      const myParticipantResult = await upsertParticipant({
        userClient: supabase,
        adminClient,
        chatId,
        userId: user.id,
      });

      if (!myParticipantResult.ok) {
        return NextResponse.json(
          {
            error: 'Failed to create chat participants',
            code: 'CHAT_PARTICIPANT_ME_FAILED',
            detail: myParticipantResult.detail,
            hint: myParticipantResult.hint,
          },
          { status: 500 }
        );
      }

      const targetParticipantResult = await upsertParticipant({
        userClient: supabase,
        adminClient,
        chatId,
        userId: targetUserId,
      });

      if (!targetParticipantResult.ok) {
        return NextResponse.json(
          {
            error: 'Failed to create chat participants',
            code: 'CHAT_PARTICIPANT_TARGET_FAILED',
            detail: targetParticipantResult.detail,
            hint: targetParticipantResult.hint,
          },
          { status: 500 }
        );
      }

      const firstMessageResult = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        content: firstMessage,
      });

      if (firstMessageResult.error && adminClient) {
        const adminMessageResult = await adminClient.from('messages').insert({
          chat_id: chatId,
          sender_id: user.id,
          content: firstMessage,
        });

        if (adminMessageResult.error) {
          console.error('Error creating first message via admin client:', adminMessageResult.error);
        }
      } else if (firstMessageResult.error) {
        console.error('Error creating first message:', firstMessageResult.error);
      } else {
        void createNotificationAndPush({
          userId: targetUserId,
          actorId: user.id,
          type: 'chat',
          title: '새 채팅이 시작되었습니다.',
          body: firstMessage,
          link: `/chat?chat=${chatId}`,
          dedupeKey: `chat-start:${chatId}:${targetUserId}`,
        }).catch((notificationError) => {
          console.error('Chat start notification failed:', notificationError);
        });
      }
    }

    return NextResponse.json({
      ok: true,
      chatId,
      createdNewChat,
      warning: participantLookupWarning,
    });
  } catch (error) {
    console.error('POST /api/chats/start failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to start chat',
        code: 'CHAT_START_FAILED',
        detail: toErrorMessage(error as Error),
      },
      { status: 500 }
    );
  }
}
