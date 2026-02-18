'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatRealtimeSync } from '@/components/chat/ChatRealtimeSync';
import { NotificationBell } from '@/components/notifications/NotificationBell';
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

const ChatHeader = ({ onToggleSearch }: { onToggleSearch: () => void }) => (
  <header className="imf-topbar">
    <div className="imf-logo">
      <img src="/app-logo.png" alt="ImFencer" className="object-contain w-full h-full object-left" />
    </div>
    <div className="flex items-center gap-2">
      <NotificationBell />
      <button
        type="button"
        onClick={onToggleSearch}
        className="imf-icon-button"
        aria-label="채팅 검색"
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
  </header>
);

export function ChatPageClient() {
  const searchParams = useSearchParams();
  const requestedChatId = searchParams.get('chat');
  const chatSearchQuery = (searchParams.get('q') || '').trim();
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(chatSearchQuery));

  const overviewUrl = useMemo(() => {
    if (!requestedChatId) return '/api/chat/overview?open=1';
    return `/api/chat/overview?chat=${encodeURIComponent(requestedChatId)}&open=1`;
  }, [requestedChatId]);

  const { data, error, isLoading, isValidating, mutate } = useSWRLite(overviewUrl, fetchChatOverview, {
    staleTime: 8_000,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (chatSearchQuery) {
      setIsSearchOpen(true);
    }
  }, [chatSearchQuery]);

  if (error) {
    return (
      <div className="imf-page">
        <ChatHeader onToggleSearch={() => setIsSearchOpen((prev) => !prev)} />
        <main className="px-4 py-16 text-center space-y-4 animate-imfencer-fade-up">
          <div className="imf-panel py-10">
            <p className="text-sm text-red-300">채팅 데이터를 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => {
                void mutate();
              }}
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              다시 시도
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!data || isLoading) {
    return (
      <div className="imf-page">
        <ChatHeader onToggleSearch={() => setIsSearchOpen((prev) => !prev)} />
        <main className="px-4 py-6 space-y-2 animate-pulse">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={`chat-skeleton-${index}`} className="imf-panel space-y-2">
              <div className="h-3 w-1/3 rounded bg-slate-800" />
              <div className="h-3 w-2/3 rounded bg-slate-900" />
            </div>
          ))}
        </main>
      </div>
    );
  }

  if (!data.authenticated) {
    return (
      <div className="imf-page">
        <ChatHeader onToggleSearch={() => setIsSearchOpen((prev) => !prev)} />
        <main className="px-4 py-16 text-center space-y-4 animate-imfencer-fade-up">
          <div className="imf-panel py-10">
            <p className="text-lg font-semibold text-white">로그인 후 채팅을 이용할 수 있습니다.</p>
            <p className="mt-1 text-sm text-slate-400">커뮤니티/마켓/펜싱 메뉴에서 문의를 보내면 채팅방이 생성됩니다.</p>
            <Link
              href="/login?next=/chat"
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              로그인
            </Link>
          </div>
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
  const normalizedQuery = chatSearchQuery.toLowerCase();

  const filteredChats = chatSearchQuery
    ? chats.filter((chat) => {
        const partner = (partnerMap[chat.id] || '').toLowerCase();
        const preview = (chat.last_message || '').toLowerCase();
        return partner.includes(normalizedQuery) || preview.includes(normalizedQuery);
      })
    : chats;

  const filteredMessages = chatSearchQuery
    ? messages.filter((message) => {
        const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
        const senderName = (profile?.username || '').toLowerCase();
        return senderName.includes(normalizedQuery) || message.content.toLowerCase().includes(normalizedQuery);
      })
    : messages;

  return (
    <div className="imf-page">
      {chatIds.length > 0 ? (
        <ChatRealtimeSync
          chatIds={chatIds}
          onMessage={() => {
            void mutate();
          }}
        />
      ) : null}

      <ChatHeader onToggleSearch={() => setIsSearchOpen((prev) => !prev)} />

      {isSearchOpen ? (
        <form action="/chat" className="px-4 pt-2">
          <div className="imf-panel flex items-center gap-2 p-2.5">
            {requestedChatId ? <input type="hidden" name="chat" value={requestedChatId} /> : null}
            <input
              type="text"
              name="q"
              defaultValue={chatSearchQuery}
              placeholder="상대 닉네임 또는 대화 내용 검색"
              className="h-9 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-500/70"
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500"
            >
              검색
            </button>
            {chatSearchQuery ? (
              <Link
                href={requestedChatId ? `/chat?chat=${requestedChatId}` : '/chat'}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                초기화
              </Link>
            ) : null}
            {isValidating ? <span className="text-[11px] text-slate-500 whitespace-nowrap">갱신중</span> : null}
          </div>
        </form>
      ) : null}

      {chats.length > 0 ? (
        <main className="animate-imfencer-fade-up px-4 py-2 grid grid-cols-1 gap-2 md:grid-cols-[300px_1fr]">
          <aside className="imf-panel overflow-hidden p-0">
            {filteredChats.length > 0 ? filteredChats.map((chat) => {
              const isActive = chat.id === selectedChatId;
              return (
                <Link
                  key={chat.id}
                  href={chatSearchQuery ? `/chat?chat=${chat.id}&q=${encodeURIComponent(chatSearchQuery)}` : `/chat?chat=${chat.id}`}
                  prefetch={false}
                  className={`block border-b border-white/10 px-4 py-3 transition-colors ${
                    isActive ? 'bg-blue-500/15' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{partnerMap[chat.id] || '채팅방'}</p>
                    <div className="flex items-center gap-2">
                      {unreadCountMap[chat.id] ? (
                        <span className="inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-semibold text-white">
                          {unreadCountMap[chat.id]}
                        </span>
                      ) : null}
                      <span className="text-[11px] text-slate-500">
                        {new Date(chat.updated_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-400">{chat.last_message || '새 대화가 시작되었습니다.'}</p>
                </Link>
              );
            }) : (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                검색 결과가 없습니다.
              </div>
            )}
          </aside>

          <section className="imf-panel min-h-[60vh] flex flex-col p-0 overflow-hidden">
            {selectedChatId ? (
              <>
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    {partnerMap[selectedChatId] || '채팅방'}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                  {data.reachedMessageLimit ? (
                    <p className="text-center text-[11px] text-slate-500">
                      최근 {data.chatMessagesLimit}개 메시지만 표시됩니다.
                    </p>
                  ) : null}
                  {filteredMessages.length > 0 ? (
                    filteredMessages.map((message) => {
                      const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
                      const mine = message.sender_id === data.userId;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl px-3 py-2 ${
                              mine
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'border border-white/10 bg-slate-900 text-slate-100'
                            }`}
                          >
                            <p className="mb-0.5 text-[11px] opacity-80">
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
                    <p className="py-10 text-center text-sm text-slate-500">
                      {chatSearchQuery ? '검색된 메시지가 없습니다.' : '아직 메시지가 없습니다.'}
                    </p>
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
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
                채팅방을 선택해주세요.
              </div>
            )}
          </section>
        </main>
      ) : (
        <main className="px-4 py-16 text-center space-y-3 animate-imfencer-fade-up">
          <div className="imf-panel py-10">
            <p className="text-lg font-semibold text-white">아직 채팅방이 없습니다.</p>
            <p className="mt-1 text-sm text-slate-400">커뮤니티, 마켓, 펜싱 메뉴의 채팅 버튼으로 대화를 시작할 수 있습니다.</p>
            <Link
              href="/fencing"
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              펜싱 메뉴 보기
            </Link>
          </div>
        </main>
      )}
    </div>
  );
}
