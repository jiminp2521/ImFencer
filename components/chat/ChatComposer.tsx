'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { notifyUsers } from '@/lib/notifications-client';

type ChatComposerProps = {
  chatId: string;
  senderId: string;
};

export function ChatComposer({ chatId, senderId }: ChatComposerProps) {
  const supabase = createClient();
  const [content, setContent] = useState('');
  const [pending, setPending] = useState(false);

  const sendMessage = async () => {
    const message = content.trim();
    if (!message || pending) return;

    setPending(true);

    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: senderId,
      content: message,
    });

    if (error) {
      console.error('Error sending message:', error);
      alert('메시지 전송에 실패했습니다.');
      setPending(false);
      return;
    }

    await supabase
      .from('chats')
      .update({
        last_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatId);

    const participantsResult = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId)
      .neq('user_id', senderId);

    if (participantsResult.error) {
      console.error('Error fetching chat participants for notifications:', participantsResult.error);
    } else {
      try {
        await notifyUsers(
          supabase,
          (participantsResult.data || []).map((participant: { user_id: string }) => ({
            userId: participant.user_id,
            actorId: senderId,
            type: 'chat',
            title: '새 메시지가 도착했습니다.',
            body: message.length > 100 ? `${message.slice(0, 100)}...` : message,
            link: `/chat?chat=${chatId}`,
          }))
        );
      } catch (notificationError) {
        console.error('Error creating chat message notifications:', notificationError);
      }
    }

    setContent('');
    setPending(false);
  };

  return (
    <div className="border-t border-white/10 bg-black/80 backdrop-blur px-3 py-3">
      <div className="flex gap-2 items-end">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="메시지를 입력하세요"
          className="min-h-[56px] max-h-40 border-gray-800 bg-gray-950 text-gray-100 placeholder:text-gray-500"
          maxLength={1000}
        />
        <Button
          type="button"
          onClick={sendMessage}
          disabled={pending || !content.trim()}
          className="h-[56px] w-[52px] bg-blue-600 hover:bg-blue-700 text-white"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
