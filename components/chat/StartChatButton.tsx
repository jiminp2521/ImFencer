'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { Button, buttonVariants } from '@/components/ui/button';

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type StartChatResponse =
  | {
      ok: true;
      chatId: string;
    }
  | {
      ok?: false;
      error?: string;
      code?: string;
      detail?: string;
      hint?: string | null;
    };

type StartChatButtonProps = {
  targetUserId: string;
  contextTitle?: string;
  openingMessage?: string;
  label?: string;
  loginNext?: string;
  className?: string;
  size?: ButtonVariantProps['size'];
  variant?: ButtonVariantProps['variant'];
  iconOnly?: boolean;
};

export function StartChatButton({
  targetUserId,
  contextTitle,
  openingMessage,
  label = '채팅',
  loginNext = '/chat',
  className,
  size = 'sm',
  variant = 'outline',
  iconOnly = false,
}: StartChatButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    router.prefetch('/chat');
  }, [router]);

  const handleStartChat = async () => {
    if (pending) return;
    setPending(true);

    try {
      const response = await fetch('/api/chats/start', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          contextTitle,
          openingMessage,
        }),
      });

      if (response.status === 401) {
        alert('로그인이 필요합니다.');
        router.push(`/login?next=${encodeURIComponent(loginNext)}`);
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as StartChatResponse | null;
        console.error('Start chat failed:', body);

        const lines = ['채팅 연결에 실패했습니다.'];
        if (body && 'error' in body && body.error) lines.push(`사유: ${body.error}`);
        if (body && 'code' in body && body.code) lines.push(`코드: ${body.code}`);
        if (body && 'detail' in body && body.detail) lines.push(`상세: ${body.detail}`);
        if (body && 'hint' in body && body.hint) lines.push(`안내: ${body.hint}`);
        alert(lines.join('\n'));
        return;
      }

      const body = (await response.json()) as StartChatResponse;
      if (!body || !('chatId' in body) || !body.chatId) {
        alert('채팅방 ID를 받지 못했습니다. 다시 시도해주세요.');
        return;
      }
      router.push(`/chat?chat=${body.chatId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('채팅 연결에 실패했습니다.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleStartChat}
      disabled={pending}
      variant={variant}
      size={size}
      className={className}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      {!iconOnly ? <span>{label}</span> : null}
    </Button>
  );
}
