'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LessonOrderButtonProps = {
  lessonId: string;
  lessonTitle: string;
  coachId: string;
  currentUserId: string | null;
  initialOrdered?: boolean;
  loginNext?: string;
  className?: string;
};

export function LessonOrderButton({
  lessonId,
  lessonTitle,
  coachId,
  currentUserId,
  initialOrdered = false,
  loginNext = '/fencing/lessons',
  className,
}: LessonOrderButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [ordered, setOrdered] = useState(initialOrdered);

  const isMyLesson = Boolean(currentUserId && currentUserId === coachId);

  const handleOrder = async () => {
    if (pending || ordered || isMyLesson) return;
    setPending(true);

    try {
      const response = await fetch(`/api/fencing/lessons/${lessonId}/orders`, { method: 'POST' });

      if (response.status === 401) {
        alert('로그인이 필요합니다.');
        router.push(`/login?next=${encodeURIComponent(loginNext)}`);
        return;
      }

      if (response.status === 400) {
        alert('본인이 등록한 레슨입니다.');
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        console.error('Error creating lesson order:', body);
        alert('레슨 신청에 실패했습니다.');
        return;
      }

      const body = (await response.json()) as { duplicate?: boolean };
      if (body.duplicate) {
        setOrdered(true);
        alert('이미 신청한 레슨입니다.');
        return;
      }

      setOrdered(true);
      alert(`${lessonTitle} 레슨 신청이 접수되었습니다.`);

      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleOrder}
      disabled={pending || ordered || isMyLesson}
      className={className || 'bg-emerald-600 hover:bg-emerald-700 text-white'}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
      <span>
        {isMyLesson ? '내 레슨' : ordered ? '신청 완료' : '레슨 신청'}
      </span>
    </Button>
  );
}
