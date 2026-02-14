'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

type ContactSellerButtonProps = {
  sellerId: string;
  marketTitle: string;
};

export function ContactSellerButton({ sellerId, marketTitle }: ContactSellerButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, setPending] = useState(false);

  const handleContact = async () => {
    if (pending) return;
    setPending(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/login?next=/market');
      setPending(false);
      return;
    }

    if (user.id === sellerId) {
      alert('본인 상품입니다.');
      setPending(false);
      return;
    }

    const [myChatsResult, sellerChatsResult] = await Promise.all([
      supabase.from('chat_participants').select('chat_id').eq('user_id', user.id),
      supabase.from('chat_participants').select('chat_id').eq('user_id', sellerId),
    ]);

    if (myChatsResult.error || sellerChatsResult.error) {
      console.error('Error loading existing chats:', myChatsResult.error || sellerChatsResult.error);
      alert('채팅 조회에 실패했습니다.');
      setPending(false);
      return;
    }

    const sellerChatIds = new Set((sellerChatsResult.data || []).map((row) => row.chat_id));
    let targetChatId =
      (myChatsResult.data || []).find((row) => sellerChatIds.has(row.chat_id))?.chat_id || null;

    if (!targetChatId) {
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          last_message: `${marketTitle} 문의가 시작되었습니다.`,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (chatError || !chat) {
        console.error('Error creating chat:', chatError);
        alert('채팅방 생성에 실패했습니다.');
        setPending(false);
        return;
      }

      targetChatId = chat.id;

      const { error: myParticipantError } = await supabase
        .from('chat_participants')
        .insert({ chat_id: targetChatId, user_id: user.id });

      if (myParticipantError) {
        console.error('Error creating my chat participant:', myParticipantError);
        alert('채팅 참여 설정에 실패했습니다.');
        setPending(false);
        return;
      }

      const { error: sellerParticipantError } = await supabase
        .from('chat_participants')
        .insert({ chat_id: targetChatId, user_id: sellerId });

      if (sellerParticipantError) {
        console.error('Error adding seller to chat:', sellerParticipantError);
        alert('판매자 채팅 연결에 실패했습니다.');
        setPending(false);
        return;
      }

      const openingMessage = `${marketTitle} 상품 문의드립니다.`;
      const { error: messageError } = await supabase.from('messages').insert({
        chat_id: targetChatId,
        sender_id: user.id,
        content: openingMessage,
      });

      if (messageError) {
        console.error('Error creating opening message:', messageError);
      } else {
        await supabase
          .from('chats')
          .update({ last_message: openingMessage, updated_at: new Date().toISOString() })
          .eq('id', targetChatId);
      }
    }

    router.push(`/chat?chat=${targetChatId}`);
  };

  return (
    <Button
      type="button"
      onClick={handleContact}
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
      <span>판매자에게 문의하기</span>
    </Button>
  );
}
