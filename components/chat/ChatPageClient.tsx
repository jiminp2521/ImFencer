'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChatComposer, type SentChatMessage } from '@/components/chat/ChatComposer';
import { ChatRealtimeSync, type ChatRealtimeEvent } from '@/components/chat/ChatRealtimeSync';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useSWRLite } from '@/lib/swr-lite';
import { createClient } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  profiles: MessageProfile | MessageProfile[] | null;
  client_id?: string | null;
  delivery_status?: 'sending' | 'failed';
  error_message?: string | null;
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

const EMPTY_CHAT_IDS: string[] = [];
const EMPTY_CHATS: ChatEntry[] = [];
const EMPTY_MESSAGES: ChatMessage[] = [];
const EMPTY_DRAFT_MESSAGES: ChatMessage[] = [];
const EMPTY_PARTNER_MAP: Record<string, string> = {};
const EMPTY_UNREAD_COUNT_MAP: Record<string, number> = {};

const createLocalMessageId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const toEpoch = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortChatsByUpdatedAt = (items: ChatEntry[]) => {
  return [...items].sort((left, right) => toEpoch(right.updated_at) - toEpoch(left.updated_at));
};

const formatChatListTime = (value: string) => {
  const epoch = toEpoch(value);
  if (epoch === 0) return '';

  const time = new Date(epoch);
  const now = new Date();
  if (now.toDateString() === time.toDateString()) {
    return time.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return time.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  });
};

const formatMessageTime = (value: string) => {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAvatarInitial = (name: string) => {
  if (!name) return '채';
  return name.trim().slice(0, 1).toUpperCase();
};

const upsertMessage = (messages: ChatMessage[], incoming: ChatMessage) => {
  const index = messages.findIndex((message) => message.id === incoming.id);
  if (index >= 0) {
    const current = messages[index];
    const next = [...messages];
    next[index] = {
      ...current,
      ...incoming,
      profiles: incoming.profiles ?? current.profiles ?? null,
    };
    return next;
  }

  const next = [...messages, incoming];
  next.sort((left, right) => toEpoch(left.created_at) - toEpoch(right.created_at));
  return next;
};

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
      <Image
        src="/app-logo.png"
        alt="ImFencer"
        width={128}
        height={32}
        className="object-contain w-full h-full object-left"
        priority
      />
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedChatId = searchParams.get('chat');
  const chatSearchQuery = (searchParams.get('q') || '').trim();
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(chatSearchQuery));
  const [chatListFilter, setChatListFilter] = useState<'all' | 'unread'>('all');
  const [hasLiveSnapshot, setHasLiveSnapshot] = useState(false);
  const [liveUserId, setLiveUserId] = useState('');
  const [liveChatIds, setLiveChatIds] = useState<string[]>([]);
  const [liveSelectedChatId, setLiveSelectedChatId] = useState<string | null>(null);
  const [liveChats, setLiveChats] = useState<ChatEntry[]>([]);
  const [livePartnerMap, setLivePartnerMap] = useState<Record<string, string>>({});
  const [liveUnreadCountMap, setLiveUnreadCountMap] = useState<Record<string, number>>({});
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [liveReachedMessageLimit, setLiveReachedMessageLimit] = useState(false);
  const [liveChatMessagesLimit, setLiveChatMessagesLimit] = useState(50);
  const [draftMessagesByChat, setDraftMessagesByChat] = useState<Record<string, ChatMessage[]>>({});
  const [partnerOnlineCount, setPartnerOnlineCount] = useState(0);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const overviewUrl = useMemo(() => {
    if (!requestedChatId) return '/api/chat/overview';
    return `/api/chat/overview?chat=${encodeURIComponent(requestedChatId)}`;
  }, [requestedChatId]);

  const { data, error, isLoading, isValidating, mutate } = useSWRLite(overviewUrl, fetchChatOverview, {
    staleTime: 2_500,
    keepPreviousData: true,
  });

  const authenticatedData = data && data.authenticated ? data : null;

  useEffect(() => {
    if (!authenticatedData) {
      return;
    }

    setLiveUserId(authenticatedData.userId);
    setLiveChatIds(authenticatedData.chatIds || []);
    setLiveSelectedChatId(authenticatedData.selectedChatId);
    setLiveChats(authenticatedData.chats || []);
    setLivePartnerMap(authenticatedData.partnerMap || {});
    setLiveUnreadCountMap(authenticatedData.unreadCountMap || {});
    setLiveMessages(authenticatedData.messages || []);
    setLiveReachedMessageLimit(Boolean(authenticatedData.reachedMessageLimit));
    setLiveChatMessagesLimit(authenticatedData.chatMessagesLimit || 50);
    setHasLiveSnapshot(true);
  }, [authenticatedData]);

  const chatIds = hasLiveSnapshot ? liveChatIds : authenticatedData?.chatIds || EMPTY_CHAT_IDS;
  const chats = hasLiveSnapshot ? liveChats : authenticatedData?.chats || EMPTY_CHATS;
  const selectedChatId = hasLiveSnapshot ? liveSelectedChatId : authenticatedData?.selectedChatId || null;
  const unreadCountMap = hasLiveSnapshot
    ? liveUnreadCountMap
    : authenticatedData?.unreadCountMap || EMPTY_UNREAD_COUNT_MAP;
  const partnerMap = hasLiveSnapshot ? livePartnerMap : authenticatedData?.partnerMap || EMPTY_PARTNER_MAP;
  const messages = hasLiveSnapshot ? liveMessages : authenticatedData?.messages || EMPTY_MESSAGES;
  const userId = hasLiveSnapshot ? liveUserId : authenticatedData?.userId || '';
  const reachedMessageLimit = hasLiveSnapshot
    ? liveReachedMessageLimit
    : Boolean(authenticatedData?.reachedMessageLimit);
  const chatMessagesLimit = hasLiveSnapshot ? liveChatMessagesLimit : authenticatedData?.chatMessagesLimit || 50;

  const chatIdsRef = useRef<string[]>([]);
  const selectedChatIdRef = useRef<string | null>(null);
  const userIdRef = useRef('');
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const signalClientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const localTypingStateRef = useRef(false);
  const partnerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageViewportRef = useRef<HTMLDivElement | null>(null);
  const previousSelectedChatIdRef = useRef<string | null>(null);
  const readSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readAckEpochRef = useRef(0);
  const messageByIdRef = useRef<Record<string, ChatMessage>>({});

  useEffect(() => {
    chatIdsRef.current = chatIds;
  }, [chatIds]);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const scheduleRevalidate = useCallback(
    (delay = 320) => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        void mutate();
      }, delay);
    },
    [mutate]
  );

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
      if (readSyncTimeoutRef.current) {
        clearTimeout(readSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void mutate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [mutate]);

  const upsertChatEntry = useCallback((input: { id: string; last_message?: string | null; updated_at?: string }) => {
    if (!input.id) return;

    setLiveChatIds((prev) => (prev.includes(input.id) ? prev : [input.id, ...prev]));
    setLiveChats((prev) => {
      const index = prev.findIndex((chat) => chat.id === input.id);
      if (index === -1) {
        return sortChatsByUpdatedAt([
          ...prev,
          {
            id: input.id,
            last_message: input.last_message ?? null,
            updated_at: input.updated_at || new Date().toISOString(),
          },
        ]);
      }

      const next = [...prev];
      next[index] = {
        ...next[index],
        ...(input.last_message !== undefined ? { last_message: input.last_message } : {}),
        ...(input.updated_at ? { updated_at: input.updated_at } : {}),
      };
      return sortChatsByUpdatedAt(next);
    });
  }, []);

  const upsertSelectedChatMessage = useCallback((incoming: ChatMessage) => {
    if (selectedChatIdRef.current !== incoming.chat_id) {
      return;
    }

    setLiveMessages((prev) => upsertMessage(prev, incoming));
  }, []);

  const removeDraftMessage = useCallback((chatId: string, clientId: string) => {
    setDraftMessagesByChat((prev) => {
      const current = prev[chatId] || EMPTY_DRAFT_MESSAGES;
      const next = current.filter((message) => message.client_id !== clientId);
      if (next.length === 0) {
        const compact = { ...prev };
        delete compact[chatId];
        return compact;
      }

      return {
        ...prev,
        [chatId]: next,
      };
    });
  }, []);

  const updateDraftMessage = useCallback(
    (
      chatId: string,
      clientId: string,
      updater: (message: ChatMessage) => ChatMessage
    ) => {
      setDraftMessagesByChat((prev) => {
        const current = prev[chatId] || EMPTY_DRAFT_MESSAGES;
        const index = current.findIndex((message) => message.client_id === clientId);
        if (index === -1) return prev;

        const next = [...current];
        next[index] = updater(next[index]);
        return {
          ...prev,
          [chatId]: next,
        };
      });
    },
    []
  );

  const sendMessageRequest = useCallback(
    async (chatId: string, content: string, clientId: string): Promise<SentChatMessage> => {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ content, clientId }),
      });

      const body = (await response.json().catch(() => null)) as
        | {
            message?: SentChatMessage;
            error?: string;
          }
        | null;

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/chat?chat=${chatId}`)}`);
        throw new Error('로그인이 필요합니다.');
      }

      if (!response.ok) {
        throw new Error(body?.error || '메시지 전송에 실패했습니다.');
      }

      if (body?.message) {
        return body.message;
      }

      return {
        id: `fallback-${Date.now()}`,
        chat_id: chatId,
        sender_id: userIdRef.current,
        content,
        created_at: new Date().toISOString(),
        read_at: null,
        client_id: clientId,
      };
    },
    [router]
  );

  const commitSentMessage = useCallback(
    (sentMessage: SentChatMessage) => {
      const normalizedMessage: ChatMessage = {
        id: sentMessage.id,
        chat_id: sentMessage.chat_id,
        sender_id: sentMessage.sender_id || userIdRef.current,
        content: sentMessage.content,
        created_at: sentMessage.created_at,
        read_at: sentMessage.read_at,
        client_id: sentMessage.client_id ?? null,
        profiles: null,
      };

      upsertChatEntry({
        id: normalizedMessage.chat_id,
        last_message: normalizedMessage.content,
        updated_at: normalizedMessage.created_at,
      });
      upsertSelectedChatMessage(normalizedMessage);
      setLiveUnreadCountMap((prev) => ({
        ...prev,
        [normalizedMessage.chat_id]: 0,
      }));
      scheduleRevalidate(220);
    },
    [scheduleRevalidate, upsertChatEntry, upsertSelectedChatMessage]
  );

  const handleComposerSend = useCallback(
    async (content: string) => {
      const chatId = selectedChatIdRef.current;
      if (!chatId) {
        throw new Error('채팅방이 선택되지 않았습니다.');
      }

      const clientId = createLocalMessageId();
      const draftMessage: ChatMessage = {
        id: clientId,
        client_id: clientId,
        delivery_status: 'sending',
        chat_id: chatId,
        sender_id: userIdRef.current,
        content,
        created_at: new Date().toISOString(),
        read_at: null,
        profiles: null,
        error_message: null,
      };

      setDraftMessagesByChat((prev) => {
        const current = prev[chatId] || EMPTY_DRAFT_MESSAGES;
        const next = [...current, draftMessage].sort(
          (left, right) => toEpoch(left.created_at) - toEpoch(right.created_at)
        );
        return {
          ...prev,
          [chatId]: next,
        };
      });

      try {
        const sent = await sendMessageRequest(chatId, content, clientId);
        removeDraftMessage(chatId, clientId);
        commitSentMessage(sent);
      } catch (error) {
        updateDraftMessage(chatId, clientId, (message) => ({
          ...message,
          delivery_status: 'failed',
          error_message: error instanceof Error ? error.message : '메시지 전송에 실패했습니다.',
        }));
        throw error;
      }
    },
    [commitSentMessage, removeDraftMessage, sendMessageRequest, updateDraftMessage]
  );

  const retryFailedMessage = useCallback(
    async (chatId: string, clientId: string) => {
      let retryContent: string | null = null;

      setDraftMessagesByChat((prev) => {
        const current = prev[chatId] || EMPTY_DRAFT_MESSAGES;
        const index = current.findIndex((message) => message.client_id === clientId);
        if (index === -1) return prev;

        const target = current[index];
        retryContent = target.content;

        const next = [...current];
        next[index] = {
          ...target,
          delivery_status: 'sending',
          error_message: null,
          created_at: new Date().toISOString(),
        };

        return {
          ...prev,
          [chatId]: next.sort((left, right) => toEpoch(left.created_at) - toEpoch(right.created_at)),
        };
      });

      if (!retryContent) return;

      try {
        const sent = await sendMessageRequest(chatId, retryContent, clientId);
        removeDraftMessage(chatId, clientId);
        commitSentMessage(sent);
      } catch (error) {
        updateDraftMessage(chatId, clientId, (message) => ({
          ...message,
          delivery_status: 'failed',
          error_message: error instanceof Error ? error.message : '메시지 전송에 실패했습니다.',
        }));
      }
    },
    [commitSentMessage, removeDraftMessage, sendMessageRequest, updateDraftMessage]
  );

  useEffect(() => {
    if (!selectedChatId || !userId) {
      if (signalChannelRef.current && signalClientRef.current) {
        signalClientRef.current.removeChannel(signalChannelRef.current);
      }
      signalChannelRef.current = null;
      localTypingStateRef.current = false;
      setPartnerOnlineCount(0);
      setIsPartnerTyping(false);
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
        partnerTypingTimeoutRef.current = null;
      }
      return;
    }

    let supabase;
    try {
      supabase = signalClientRef.current || createClient();
      signalClientRef.current = supabase;
    } catch (error) {
      console.error('Supabase client init failed for presence channel:', error);
      return;
    }

    if (signalChannelRef.current) {
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }

    const channel = supabase.channel(`chat-signal-${selectedChatId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    const refreshPresence = () => {
      const state = channel.presenceState<{ user_id?: string }>();
      const onlineUsers = new Set<string>();

      for (const entries of Object.values(state)) {
        for (const entry of entries as Array<{ user_id?: string }>) {
          const trackedUserId = typeof entry.user_id === 'string' ? entry.user_id : '';
          if (trackedUserId && trackedUserId !== userId) {
            onlineUsers.add(trackedUserId);
          }
        }
      }

      setPartnerOnlineCount(onlineUsers.size);
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        refreshPresence();
      })
      .on('presence', { event: 'join' }, () => {
        refreshPresence();
      })
      .on('presence', { event: 'leave' }, () => {
        refreshPresence();
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const typingPayload = (payload || {}) as {
          chat_id?: string;
          user_id?: string;
          is_typing?: boolean;
        };

        if (typingPayload.chat_id !== selectedChatId) return;
        if (!typingPayload.user_id || typingPayload.user_id === userId) return;

        if (partnerTypingTimeoutRef.current) {
          clearTimeout(partnerTypingTimeoutRef.current);
          partnerTypingTimeoutRef.current = null;
        }

        if (typingPayload.is_typing) {
          setIsPartnerTyping(true);
          partnerTypingTimeoutRef.current = setTimeout(() => {
            setIsPartnerTyping(false);
          }, 1_800);
        } else {
          setIsPartnerTyping(false);
        }
      });

    signalChannelRef.current = channel;
    setIsPartnerTyping(false);
    setPartnerOnlineCount(0);
    localTypingStateRef.current = false;

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel
          .track({
            user_id: userId,
            chat_id: selectedChatId,
            online_at: new Date().toISOString(),
          })
          .catch((error) => {
            console.error('Presence track failed:', error);
          });
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setPartnerOnlineCount(0);
      }
    });

    return () => {
      localTypingStateRef.current = false;
      setIsPartnerTyping(false);
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
        partnerTypingTimeoutRef.current = null;
      }

      if (signalChannelRef.current === channel) {
        signalChannelRef.current = null;
      }

      void channel.untrack().catch(() => undefined);
      supabase.removeChannel(channel);
    };
  }, [selectedChatId, userId]);

  const handleTypingChange = useCallback(async (isTyping: boolean) => {
    if (localTypingStateRef.current === isTyping) return;
    localTypingStateRef.current = isTyping;

    const channel = signalChannelRef.current;
    const chatId = selectedChatIdRef.current;
    const currentUserId = userIdRef.current;
    if (!channel || !chatId || !currentUserId) return;

    try {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          chat_id: chatId,
          user_id: currentUserId,
          is_typing: isTyping,
          at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to broadcast typing state:', error);
    }
  }, []);

  const handleRealtimeEvent = useCallback(
    (event: ChatRealtimeEvent) => {
      if (event.type === 'membership_insert') {
        if (!event.row.chat_id || !chatIdsRef.current.includes(event.row.chat_id)) {
          scheduleRevalidate(100);
        }
        return;
      }

      if (event.type === 'chat_update') {
        if (!event.row.id) return;
        upsertChatEntry({
          id: event.row.id,
          last_message: event.row.last_message,
          updated_at: event.row.updated_at,
        });
        return;
      }

      const row = event.row;
      if (!row.id || !row.chat_id) {
        scheduleRevalidate(160);
        return;
      }
      const chatId = row.chat_id;

      const currentSelectedChatId = selectedChatIdRef.current;
      const currentUserId = userIdRef.current;
      const isKnownChat = chatIdsRef.current.includes(chatId);

      if (!isKnownChat) {
        scheduleRevalidate(100);
      }

      if (event.type === 'message_insert') {
        if (!row.sender_id || !row.created_at || typeof row.content !== 'string') {
          scheduleRevalidate(140);
          return;
        }

        const incomingMessage: ChatMessage = {
          id: row.id,
          chat_id: chatId,
          sender_id: row.sender_id,
          content: row.content,
          created_at: row.created_at,
          read_at: row.read_at ?? null,
          client_id: row.client_id ?? null,
          profiles: null,
        };

        upsertChatEntry({
          id: chatId,
          last_message: row.content,
          updated_at: row.created_at,
        });

        if (row.sender_id === currentUserId && row.client_id) {
          removeDraftMessage(chatId, row.client_id);
        }
        upsertSelectedChatMessage(incomingMessage);

        if (row.sender_id !== currentUserId) {
          if (currentSelectedChatId === chatId) {
            setLiveUnreadCountMap((prev) => ({ ...prev, [chatId]: 0 }));
            scheduleRevalidate(140);
          } else {
            setLiveUnreadCountMap((prev) => ({
              ...prev,
              [chatId]: (prev[chatId] || 0) + 1,
            }));
          }
        }
        return;
      }

      setLiveMessages((prev) => {
        if (currentSelectedChatId !== chatId) {
          return prev;
        }

        const index = prev.findIndex((message) => message.id === row.id);
        if (index === -1) {
          return prev;
        }

        const current = prev[index];
        const next = [...prev];
        next[index] = {
          ...current,
          sender_id: row.sender_id || current.sender_id,
          content: typeof row.content === 'string' ? row.content : current.content,
          created_at: row.created_at || current.created_at,
          read_at: row.read_at ?? current.read_at,
        };
        return next;
      });

      if (row.read_at && row.sender_id && row.sender_id !== currentUserId && currentSelectedChatId === chatId) {
        setLiveUnreadCountMap((prev) => ({ ...prev, [chatId]: 0 }));
      }
    },
    [removeDraftMessage, scheduleRevalidate, upsertChatEntry, upsertSelectedChatMessage]
  );

  const normalizedQuery = chatSearchQuery.toLowerCase();

  const filteredChats = chats.filter((chat) => {
    const matchesQuery = !chatSearchQuery || (() => {
      const partner = (partnerMap[chat.id] || '').toLowerCase();
      const preview = (chat.last_message || '').toLowerCase();
      return partner.includes(normalizedQuery) || preview.includes(normalizedQuery);
    })();
    if (!matchesQuery) return false;

    if (chatListFilter === 'unread') {
      return (unreadCountMap[chat.id] || 0) > 0;
    }

    return true;
  });

  const selectedDraftMessages = selectedChatId
    ? draftMessagesByChat[selectedChatId] || EMPTY_DRAFT_MESSAGES
    : EMPTY_DRAFT_MESSAGES;
  const mergedMessages = [...messages, ...selectedDraftMessages].sort(
    (left, right) => toEpoch(left.created_at) - toEpoch(right.created_at)
  );

  const filteredMessages = chatSearchQuery
    ? mergedMessages.filter((message) => {
        const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
        const senderName = (
          message.sender_id === userId
            ? '나'
            : profile?.username || ''
        ).toLowerCase();
        return senderName.includes(normalizedQuery) || message.content.toLowerCase().includes(normalizedQuery);
      })
    : mergedMessages;

  useEffect(() => {
    const byId: Record<string, ChatMessage> = {};
    for (const message of filteredMessages) {
      byId[message.id] = message;
    }
    messageByIdRef.current = byId;
  }, [filteredMessages]);

  const markChatReadUpTo = useCallback(
    async (chatId: string, messageId: string, createdAt: string) => {
      const createdEpoch = toEpoch(createdAt);
      if (!chatId || !messageId || createdEpoch === 0) return;
      if (createdEpoch <= readAckEpochRef.current) return;

      readAckEpochRef.current = createdEpoch;

      try {
        const response = await fetch(`/api/chats/${chatId}/read`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ messageId }),
        });

        if (response.status === 401) {
          router.push(`/login?next=${encodeURIComponent(`/chat?chat=${chatId}`)}`);
          return;
        }

        if (!response.ok) {
          throw new Error(`read update failed (${response.status})`);
        }

        const body = (await response.json().catch(() => null)) as
          | {
              readAt?: string;
            }
          | null;

        const readAt = body?.readAt || new Date().toISOString();
        setLiveUnreadCountMap((prev) => ({ ...prev, [chatId]: 0 }));
        setLiveMessages((prev) => prev.map((message) => {
          if (message.chat_id !== chatId) return message;
          if (message.sender_id === userIdRef.current) return message;
          if (message.read_at) return message;
          if (toEpoch(message.created_at) > createdEpoch) return message;
          return {
            ...message,
            read_at: readAt,
          };
        }));
      } catch (error) {
        console.error('Failed to sync read receipt:', error);
        readAckEpochRef.current = 0;
      }
    },
    [router]
  );

  const selectedPartnerName = selectedChatId ? partnerMap[selectedChatId] || '채팅방' : '';
  const isMobileDetailView = Boolean(selectedChatId);
  const latestMessageKey = filteredMessages.length > 0
    ? `${filteredMessages[filteredMessages.length - 1].id}:${filteredMessages[filteredMessages.length - 1].created_at}`
    : 'empty';

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport || !selectedChatId) {
      previousSelectedChatIdRef.current = selectedChatId;
      return;
    }

    const changedRoom = previousSelectedChatIdRef.current !== selectedChatId;
    previousSelectedChatIdRef.current = selectedChatId;

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (changedRoom || distanceFromBottom < 220) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: changedRoom ? 'auto' : 'smooth',
      });
    }
  }, [latestMessageKey, selectedChatId, isPartnerTyping]);

  useEffect(() => {
    if (readSyncTimeoutRef.current) {
      clearTimeout(readSyncTimeoutRef.current);
      readSyncTimeoutRef.current = null;
    }

    if (!selectedChatId) {
      readAckEpochRef.current = 0;
      return;
    }

    const latestReadIncoming = [...mergedMessages]
      .reverse()
      .find((message) => message.chat_id === selectedChatId && message.sender_id !== userId && Boolean(message.read_at));

    readAckEpochRef.current = latestReadIncoming ? toEpoch(latestReadIncoming.created_at) : 0;
  }, [mergedMessages, selectedChatId, userId]);

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport || !selectedChatId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const target = entry.target as HTMLElement;
          const messageId = target.dataset.chatMessageId;
          if (!messageId) continue;

          const message = messageByIdRef.current[messageId];
          if (!message) continue;
          if (message.chat_id !== selectedChatIdRef.current) continue;
          if (message.sender_id === userIdRef.current) continue;

          const createdEpoch = toEpoch(message.created_at);
          if (createdEpoch === 0 || createdEpoch <= readAckEpochRef.current) continue;

          if (readSyncTimeoutRef.current) {
            clearTimeout(readSyncTimeoutRef.current);
          }

          readSyncTimeoutRef.current = setTimeout(() => {
            void markChatReadUpTo(message.chat_id, message.id, message.created_at);
          }, 180);
        }
      },
      {
        root: viewport,
        threshold: 0.75,
      }
    );

    const targets = viewport.querySelectorAll<HTMLElement>('[data-chat-message-id]');
    targets.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
    };
  }, [filteredMessages, markChatReadUpTo, selectedChatId]);

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

  if (!authenticatedData) {
    return (
      <div className="imf-page">
        <ChatHeader onToggleSearch={() => setIsSearchOpen((prev) => !prev)} />
        <main className="px-4 py-16 text-center space-y-4 animate-imfencer-fade-up">
          <div className="imf-panel py-10">
            <p className="text-lg font-semibold text-white">로그인 후 채팅을 이용할 수 있습니다.</p>
            <p className="mt-1 text-sm text-slate-400">커뮤니티/마켓/펜싱 메뉴에서 문의를 보내면 채팅방이 생성됩니다.</p>
            <Link
              href="/login?next=/chat"
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-slate-200"
            >
              로그인
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="imf-page">
      {userId ? (
        <ChatRealtimeSync
          chatIds={chatIds}
          userId={userId}
          onEvent={handleRealtimeEvent}
          onSyncRequired={() => {
            void mutate();
          }}
        />
      ) : null}

      <ChatHeader onToggleSearch={() => setIsSearchOpen((prev) => !prev)} />

      {isSearchOpen ? (
        <form action="/chat" className="px-3 pt-3 md:px-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              {requestedChatId ? <input type="hidden" name="chat" value={requestedChatId} /> : null}
              <input
                type="text"
                name="q"
                defaultValue={chatSearchQuery}
                placeholder="상대 닉네임 또는 대화 내용 검색"
                className="h-10 w-full rounded-xl border border-white/15 bg-black/50 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-white/45"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-3 text-xs font-semibold text-black transition-colors hover:bg-slate-200"
              >
                검색
              </button>
              {chatSearchQuery ? (
                <Link
                  href={requestedChatId ? `/chat?chat=${requestedChatId}` : '/chat'}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-white/[0.08]"
                >
                  초기화
                </Link>
              ) : null}
              {isValidating ? <span className="text-[11px] text-slate-500 whitespace-nowrap">갱신중</span> : null}
            </div>
          </div>
        </form>
      ) : null}

      {chats.length > 0 ? (
        <main className="animate-imfencer-fade-up px-3 pb-4 pt-3 md:px-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[340px_1fr]">
            <aside
              className={`min-h-[64vh] overflow-hidden rounded-3xl border border-white/12 bg-black/55 shadow-[0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-xl ${
                isMobileDetailView ? 'hidden md:flex' : 'flex'
              } flex-col`}
            >
              <div className="border-b border-white/10 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChatListFilter('all')}
                    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      chatListFilter === 'all'
                        ? 'bg-white text-black'
                        : 'border border-white/15 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]'
                    }`}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatListFilter('unread')}
                    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      chatListFilter === 'unread'
                        ? 'bg-white text-black'
                        : 'border border-white/15 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]'
                    }`}
                  >
                    안 읽음
                  </button>
                  {isValidating ? (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      동기화 중
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-500">
                  채팅 {chats.length}개
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredChats.length > 0 ? filteredChats.map((chat) => {
                  const isActive = chat.id === selectedChatId;
                  const partnerName = partnerMap[chat.id] || '채팅방';
                  const unreadCount = unreadCountMap[chat.id] || 0;
                  const chatHref = chatSearchQuery
                    ? `/chat?chat=${chat.id}&q=${encodeURIComponent(chatSearchQuery)}`
                    : `/chat?chat=${chat.id}`;

                  return (
                    <Link
                      key={chat.id}
                      href={chatHref}
                      prefetch={false}
                      className={`block border-b border-white/8 px-3 py-3 transition-colors ${
                        isActive ? 'bg-white/[0.09]' : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
                            isActive
                              ? 'bg-gradient-to-br from-amber-300/80 to-orange-300/70 text-black'
                              : 'bg-white/[0.08] text-slate-100'
                          }`}
                        >
                          {getAvatarInitial(partnerName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-100">{partnerName}</p>
                            <span className="ml-auto text-[11px] text-slate-500">
                              {formatChatListTime(chat.updated_at)}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                            {chat.last_message || '새 대화가 시작되었습니다.'}
                          </p>
                        </div>
                        {unreadCount > 0 ? (
                          <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1.5 text-[10px] font-semibold text-black">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  );
                }) : (
                  <div className="px-4 py-12 text-center text-sm text-slate-500">
                    {chatListFilter === 'unread' ? '안 읽은 채팅이 없습니다.' : '검색 결과가 없습니다.'}
                  </div>
                )}
              </div>
            </aside>

            <section
              className={`min-h-[64vh] overflow-hidden rounded-3xl border border-white/12 bg-black/58 shadow-[0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-xl ${
                isMobileDetailView ? 'flex' : 'hidden md:flex'
              } flex-col`}
            >
              {selectedChatId ? (
                <>
                  <div className="border-b border-white/10 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={chatSearchQuery ? `/chat?q=${encodeURIComponent(chatSearchQuery)}` : '/chat'}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] text-slate-200 transition-colors hover:bg-white/[0.08] md:hidden"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Link>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300/85 to-orange-300/70 text-sm font-semibold text-black">
                        {getAvatarInitial(selectedPartnerName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-100">{selectedPartnerName}</p>
                        <p
                          className={`text-[11px] ${
                            isPartnerTyping
                              ? 'text-emerald-300'
                              : partnerOnlineCount > 0
                                ? 'text-emerald-400'
                                : 'text-slate-500'
                          }`}
                        >
                          {isPartnerTyping ? '입력 중...' : partnerOnlineCount > 0 ? '온라인' : '오프라인'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    ref={messageViewportRef}
                    className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] px-3 py-3"
                  >
                    {reachedMessageLimit ? (
                      <p className="mb-3 text-center text-[11px] text-slate-500">
                        최근 {chatMessagesLimit}개 메시지만 표시됩니다.
                      </p>
                    ) : null}
                    <div className="space-y-2.5">
                      {filteredMessages.length > 0 ? (
                        filteredMessages.map((message) => {
                          const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
                          const mine = message.sender_id === userId;
                          const isSending = message.delivery_status === 'sending';
                          const isFailed = message.delivery_status === 'failed';

                          return (
                            <div
                              key={message.client_id || message.id}
                              data-chat-message-id={message.id}
                              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[84%] rounded-2xl px-3 py-2.5 ${
                                  mine
                                    ? isFailed
                                      ? 'border border-red-500/60 bg-red-500/10 text-red-100'
                                      : isSending
                                        ? 'border border-white/30 bg-white/85 text-black'
                                        : 'bg-white text-black'
                                    : 'border border-white/12 bg-white/[0.04] text-slate-100'
                                }`}
                              >
                                <p className="mb-0.5 text-[11px] opacity-80">
                                  {mine ? '나' : profile?.username || '상대방'}
                                </p>
                                <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                                <div className="mt-1 flex items-center gap-1 text-[10px] opacity-75">
                                  <span>{formatMessageTime(message.created_at)}</span>
                                  {mine ? (
                                    isFailed ? (
                                      <span>• 전송 실패</span>
                                    ) : isSending ? (
                                      <span className="inline-flex items-center gap-1">
                                        • <Loader2 className="h-3 w-3 animate-spin" /> 전송 중
                                      </span>
                                    ) : message.read_at ? (
                                      <span className="inline-flex items-center gap-1">
                                        • <Check className="h-3 w-3" /> 읽음 {formatMessageTime(message.read_at)}
                                      </span>
                                    ) : (
                                      <span>• 전송됨</span>
                                    )
                                  ) : null}
                                </div>
                                {mine && isFailed && message.client_id ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void retryFailedMessage(message.chat_id, message.client_id!);
                                    }}
                                    className="mt-1 inline-flex items-center rounded-lg border border-red-400/50 px-2 py-0.5 text-[10px] font-medium text-red-100 hover:bg-red-500/20"
                                  >
                                    재전송
                                  </button>
                                ) : null}
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
                  </div>

                  <ChatComposer
                    chatId={selectedChatId}
                    onSend={handleComposerSend}
                    onTypingChange={handleTypingChange}
                  />
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                  채팅방을 선택해주세요.
                </div>
              )}
            </section>
          </div>
        </main>
      ) : (
        <main className="px-4 py-16 text-center space-y-3 animate-imfencer-fade-up">
          <div className="imf-panel py-10">
            <p className="text-lg font-semibold text-white">아직 채팅방이 없습니다.</p>
            <p className="mt-1 text-sm text-slate-400">커뮤니티, 마켓, 펜싱 메뉴의 채팅 버튼으로 대화를 시작할 수 있습니다.</p>
            <Link
              href="/fencing"
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-slate-200"
            >
              펜싱 메뉴 보기
            </Link>
          </div>
        </main>
      )}
    </div>
  );
}
