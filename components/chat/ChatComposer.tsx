'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type ChatComposerProps = {
  chatId: string;
  senderId: string;
};

export function ChatComposer({ chatId, senderId }: ChatComposerProps) {
  const router = useRouter();
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

    setContent('');
    setPending(false);
    router.refresh();
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
