'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatRealtimeSync } from '@/components/chat/ChatRealtimeSync';
import { useSWRLite } from '@/lib/swr-lite';

type ChatEntry = {
  id: string;
  last_message: string | null;
  updated_at: string;
};

type MessageProfile = {
  username: string | null;
};

type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  profiles: MessageProfile | MessageProfile[] | null;
};

type ChatOverviewAuthenticated = {
  authenticated: true;
  userId: string;
  chatIds: string[];
  selectedChatId: string | null;
  chats: ChatEntry[];
  partnerMap: Record<string, string>;
  unreadCountMap: Record<string, number>;
  messages: ChatMessage[];
  reachedMessageLimit: boolean;
  chatMessagesLimit: number;
};

type ChatOverviewResponse =
  | {
      authenticated: false;
    }
  | ChatOverviewAuthenticated;

const fetchChatOverview = async (url: string): Promise<ChatOverviewResponse> => {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch chat overview (${response.status})`);
  }

  return response.json() as Promise<ChatOverviewResponse>;
};

export function ChatPageClient() {
  const searchParams = useSearchParams();
  const requestedChatId = searchParams.get('chat');

  const overviewUrl = useMemo(() => {
    if (!requestedChatId) return '/api/chat/overview?open=1';
    return `/api/chat/overview?chat=${encodeURIComponent(requestedChatId)}&open=1`;
  }, [requestedChatId]);

  const { data, error, isLoading, isValidating, mutate } = useSWRLite(overviewUrl, fetchChatOverview, {
    staleTime: 8_000,
  });

  if (error) {
    return (
      <div className="min-h-screen pb-20">
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center">
          <h1 className="text-lg font-bold text-white">채팅</h1>
        </header>
        <main className="px-4 py-16 text-center space-y-4">
          <p className="text-sm text-red-300">채팅 데이터를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => {
              void mutate();
            }}
            className="inline-flex items-center justify-center rounded-md bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-white"
          >
            다시 시도
          </button>
        </main>
      </div>
    );
  }

  if (!data || isLoading) {
    return (
      <div className="min-h-screen pb-20">
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center">
          <h1 className="text-lg font-bold text-white">채팅</h1>
        </header>
        <main className="px-4 py-6 space-y-3 animate-pulse">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={`chat-skeleton-${index}`} className="rounded-md border border-white/10 bg-gray-900/40 p-3 space-y-2">
              <div className="h-3 w-1/3 rounded bg-gray-800" />
              <div className="h-3 w-2/3 rounded bg-gray-900" />
            </div>
          ))}
        </main>
      </div>
    );
  }

  if (!data.authenticated) {
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

  const chatIds = data.chatIds || [];
  const chats = data.chats || [];
  const selectedChatId = data.selectedChatId;
  const unreadCountMap = data.unreadCountMap || {};
  const partnerMap = data.partnerMap || {};
  const messages = data.messages || [];

  return (
    <div className="min-h-screen pb-20">
      {chatIds.length > 0 ? (
        <ChatRealtimeSync
          chatIds={chatIds}
          onMessage={() => {
            void mutate();
          }}
        />
      ) : null}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">채팅</h1>
        {isValidating ? <span className="text-[11px] text-gray-500">갱신중</span> : null}
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
                    <p className="text-sm font-semibold text-white">{partnerMap[chat.id] || '채팅방'}</p>
                    <div className="flex items-center gap-2">
                      {unreadCountMap[chat.id] ? (
                        <span className="inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                          {unreadCountMap[chat.id]}
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
                    {partnerMap[selectedChatId] || '채팅방'}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                  {data.reachedMessageLimit ? (
                    <p className="text-center text-[11px] text-gray-500">
                      최근 {data.chatMessagesLimit}개 메시지만 표시됩니다.
                    </p>
                  ) : null}
                  {messages.length > 0 ? (
                    messages.map((message) => {
                      const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
                      const mine = message.sender_id === data.userId;

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
                <ChatComposer
                  chatId={selectedChatId}
                  onSent={() => {
                    void mutate();
                  }}
                />
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
