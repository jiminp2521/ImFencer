'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { Button, buttonVariants } from '@/components/ui/button';

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

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

  const handleStartChat = async () => {
    if (pending) return;
    setPending(true);

    try {
      const response = await fetch('/api/chats/start', {
        method: 'POST',
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
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        console.error('Start chat failed:', body);
        alert('채팅 연결에 실패했습니다.');
        return;
      }

      const body = (await response.json()) as { chatId: string };
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
