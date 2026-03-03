'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export type SentChatMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  client_id?: string | null;
};

type SendMessageResponse =
  | {
      ok: true;
      message: SentChatMessage;
    }
  | {
      ok?: false;
      error?: string;
    };

type ChatComposerProps = {
  chatId: string;
  onSent?: (message: SentChatMessage) => void;
  onSend?: (content: string) => Promise<void>;
  onTypingChange?: (isTyping: boolean) => void;
};

export function ChatComposer({ chatId, onSent, onSend, onTypingChange }: ChatComposerProps) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [pending, setPending] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStateRef = useRef(false);

  const emitTypingState = useCallback(
    (nextTyping: boolean) => {
      if (!onTypingChange) return;
      if (typingStateRef.current === nextTyping) return;
      typingStateRef.current = nextTyping;
      onTypingChange(nextTyping);
    },
    [onTypingChange]
  );

  const scheduleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingState(false);
    }, 1_400);
  }, [emitTypingState]);

  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTypingTimeout();
      emitTypingState(false);
    };
  }, [clearTypingTimeout, emitTypingState]);

  const sendMessage = async () => {
    const message = content.trim();
    if (!message || pending) return;

    clearTypingTimeout();
    emitTypingState(false);
    setPending(true);

    try {
      if (onSend) {
        await onSend(message);
        setContent('');
        return;
      }

      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ content: message }),
      });

      if (response.status === 401) {
        alert('로그인이 필요합니다.');
        router.push(`/login?next=${encodeURIComponent(`/chat?chat=${chatId}`)}`);
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as SendMessageResponse | null;
        console.error('Send message failed:', body);
        alert('메시지 전송에 실패했습니다.');
        return;
      }

      const body = (await response.json().catch(() => null)) as SendMessageResponse | null;
      const sentMessage =
        body && 'message' in body && body.message
          ? body.message
          : ({
              id: `fallback-${Date.now()}`,
              chat_id: chatId,
              sender_id: '',
              content: message,
              created_at: new Date().toISOString(),
              read_at: null,
            } as SentChatMessage);

      setContent('');
      if (onSent) {
        onSent(sentMessage);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Send message failed by exception:', error);
      alert('메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="border-t border-white/10 bg-black/65 px-3 py-3 backdrop-blur-xl">
      <div className="flex gap-2 items-end">
        <Textarea
          value={content}
          onChange={(event) => {
            const nextValue = event.target.value;
            setContent(nextValue);

            const hasText = nextValue.trim().length > 0;
            if (!hasText) {
              clearTypingTimeout();
              emitTypingState(false);
              return;
            }

            emitTypingState(true);
            scheduleTypingStop();
          }}
          onBlur={() => {
            clearTypingTimeout();
            emitTypingState(false);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return;
            if (event.nativeEvent.isComposing) return;
            event.preventDefault();
            void sendMessage();
          }}
          placeholder="메시지를 입력하세요"
          className="min-h-[56px] max-h-40 rounded-2xl border-white/15 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
          maxLength={1000}
        />
        <Button
          type="button"
          onClick={sendMessage}
          disabled={pending || !content.trim()}
          className="h-[56px] w-[52px] rounded-2xl bg-amber-300 text-black hover:bg-amber-200"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
