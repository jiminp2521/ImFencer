'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { createClient } from '@/lib/supabase';
import { Button, buttonVariants } from '@/components/ui/button';
import { notifyUser } from '@/lib/notifications-client';

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

type ChatParticipantRow = {
  chat_id: string;
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
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);

  const handleStartChat = async () => {
    if (pending) return;
    setPending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('로그인이 필요합니다.');
        router.push(`/login?next=${encodeURIComponent(loginNext)}`);
        return;
      }

      if (user.id === targetUserId) {
        alert('본인과는 채팅할 수 없습니다.');
        return;
      }

      const [myChatsResult, targetChatsResult] = await Promise.all([
        supabase.from('chat_participants').select('chat_id').eq('user_id', user.id),
        supabase.from('chat_participants').select('chat_id').eq('user_id', targetUserId),
      ]);

      if (myChatsResult.error || targetChatsResult.error) {
        console.error('Error loading existing chats:', myChatsResult.error || targetChatsResult.error);
        alert('채팅 조회에 실패했습니다.');
        return;
      }

      const targetChatIds = new Set((targetChatsResult.data || []).map((row: ChatParticipantRow) => row.chat_id));
      let targetChatId =
        (myChatsResult.data || []).find((row: ChatParticipantRow) => targetChatIds.has(row.chat_id))?.chat_id ||
        null;

      if (!targetChatId) {
        const chatStartText = `${contextTitle?.trim() || '새로운 문의'} 대화가 시작되었습니다.`;

        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .insert({
            last_message: chatStartText,
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (chatError || !chat) {
          console.error('Error creating chat:', chatError);
          alert('채팅방 생성에 실패했습니다.');
          return;
        }

        targetChatId = chat.id;

        const { error: myParticipantError } = await supabase
          .from('chat_participants')
          .insert({ chat_id: targetChatId, user_id: user.id });

        if (myParticipantError) {
          console.error('Error creating chat participant for me:', myParticipantError);
          alert('채팅 참여 설정에 실패했습니다.');
          return;
        }

        const { error: targetParticipantError } = await supabase
          .from('chat_participants')
          .insert({ chat_id: targetChatId, user_id: targetUserId });

        if (targetParticipantError) {
          console.error('Error creating chat participant for target:', targetParticipantError);
          alert('상대방 채팅 연결에 실패했습니다.');
          return;
        }

        const firstMessage =
          openingMessage?.trim() ||
          (contextTitle?.trim() ? `${contextTitle.trim()} 문의드립니다.` : '안녕하세요. 문의드립니다.');

        const { error: firstMessageError } = await supabase.from('messages').insert({
          chat_id: targetChatId,
          sender_id: user.id,
          content: firstMessage,
        });

        if (!firstMessageError) {
          await supabase
            .from('chats')
            .update({ last_message: firstMessage, updated_at: new Date().toISOString() })
            .eq('id', targetChatId);

          try {
            await notifyUser(supabase, {
              userId: targetUserId,
              actorId: user.id,
              type: 'chat',
              title: '새 채팅이 시작되었습니다.',
              body: firstMessage,
              link: `/chat?chat=${targetChatId}`,
            });
          } catch (notificationError) {
            console.error('Error creating chat notification:', notificationError);
          }
        } else {
          console.error('Error creating first message:', firstMessageError);
        }
      }

      router.push(`/chat?chat=${targetChatId}`);
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
