'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type ChatComposerProps = {
  chatId: string;
};

export function ChatComposer({ chatId }: ChatComposerProps) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [pending, setPending] = useState(false);

  const sendMessage = async () => {
    const message = content.trim();
    if (!message || pending) return;

    setPending(true);

    try {
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
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        console.error('Send message failed:', body);
        alert('메시지 전송에 실패했습니다.');
        return;
      }

      setContent('');
      router.refresh();
    } finally {
      setPending(false);
    }
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
