import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatRealtimeSync } from '@/components/chat/ChatRealtimeSync';

type ChatPageProps = {
  searchParams: Promise<{
    chat?: string;
  }>;
};

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

const CHAT_MESSAGES_LIMIT = 80;

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen pb-20">
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center">
          <h1 className="text-lg font-bold text-white">채팅</h1>
        </header>
        <main className="px-4 py-16 text-center space-y-4">
          <p className="text-lg font-semibold text-white">로그인 후 채팅을 이용할 수 있습니다.</p>
          <p className="text-sm text-gray-400">커뮤니티/마켓/펜싱 메뉴에서 문의를 보내면 채팅방이 생성됩니다.</p>
          <Link
            href="/login?next=/chat"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white"
          >
            로그인하기
          </Link>
        </main>
      </div>
    );
  }

  const participantResult = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', user.id);

  if (participantResult.error) {
    console.error('Error fetching chat participants:', participantResult.error);
  }

  const chatIds = Array.from(new Set((participantResult.data || []).map((row) => row.chat_id)));

  const selectedChatId =
    resolvedSearchParams.chat && chatIds.includes(resolvedSearchParams.chat)
      ? resolvedSearchParams.chat
      : chatIds[0] || null;

  const markReadPromise = selectedChatId
    ? supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('chat_id', selectedChatId)
        .neq('sender_id', user.id)
        .is('read_at', null)
    : Promise.resolve({ error: null });

  const [chatsResult, partnerResult, messagesResult, markReadResult] = await Promise.all([
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
  if (partnerResult.error) {
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
  const unreadCountMap = new Map<string, number>();
  const reachedMessageLimit = messages.length >= CHAT_MESSAGES_LIMIT;
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

  return (
    <div className="min-h-screen pb-20">
      {chatIds.length > 0 && <ChatRealtimeSync chatIds={chatIds} />}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center">
        <h1 className="text-lg font-bold text-white">채팅</h1>
      </header>

      {chats.length > 0 ? (
        <main className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
          <aside className="border-b md:border-b-0 md:border-r border-white/10">
            {chats.map((chat) => {
              const isActive = chat.id === selectedChatId;
              return (
                <Link
                  key={chat.id}
                  href={`/chat?chat=${chat.id}`}
                  prefetch={false}
                  className={`block border-b border-white/10 px-4 py-3 transition-colors ${
                    isActive ? 'bg-blue-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{partnerMap.get(chat.id) || '채팅방'}</p>
                    <div className="flex items-center gap-2">
                      {unreadCountMap.get(chat.id) ? (
                        <span className="inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                          {unreadCountMap.get(chat.id)}
                        </span>
                      ) : null}
                      <span className="text-[11px] text-gray-500">
                        {new Date(chat.updated_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-400 line-clamp-1">{chat.last_message || '새 대화가 시작되었습니다.'}</p>
                </Link>
              );
            })}
          </aside>

          <section className="min-h-[60vh] flex flex-col">
            {selectedChatId ? (
              <>
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm font-semibold text-white">
                    {partnerMap.get(selectedChatId) || '채팅방'}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                  {reachedMessageLimit ? (
                    <p className="text-center text-[11px] text-gray-500">
                      최근 {CHAT_MESSAGES_LIMIT}개 메시지만 표시됩니다.
                    </p>
                  ) : null}
                  {messages.length > 0 ? (
                    messages.map((message) => {
                      const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
                      const mine = message.sender_id === user.id;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[82%] rounded-lg px-3 py-2 ${
                              mine ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-100 border border-white/10'
                            }`}
                          >
                            <p className="text-[11px] opacity-80 mb-0.5">
                              {mine ? '나' : profile?.username || '상대방'}
                            </p>
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <p className="mt-1 text-[10px] opacity-70">
                              {new Date(message.created_at).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {mine
                                ? message.read_at
                                  ? ` • 읽음 ${new Date(message.read_at).toLocaleTimeString('ko-KR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`
                                  : ' • 안읽음'
                                : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="py-10 text-center text-sm text-gray-500">아직 메시지가 없습니다.</p>
                  )}
                </div>
                <ChatComposer chatId={selectedChatId} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                채팅방을 선택해주세요.
              </div>
            )}
          </section>
        </main>
      ) : (
        <main className="px-4 py-16 text-center space-y-3">
          <p className="text-lg font-semibold text-white">아직 채팅방이 없습니다.</p>
          <p className="text-sm text-gray-400">커뮤니티, 마켓, 펜싱 메뉴의 채팅 버튼으로 대화를 시작할 수 있습니다.</p>
          <Link
            href="/fencing"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white"
          >
            펜싱 메뉴 보기
          </Link>
        </main>
      )}
    </div>
  );
}
