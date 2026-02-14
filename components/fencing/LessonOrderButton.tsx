'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingCart } from 'lucide-react';
import { createClient } from '@/lib/supabase';
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
  loginNext = '/fencing?tab=lessons',
  className,
}: LessonOrderButtonProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);
  const [ordered, setOrdered] = useState(initialOrdered);

  const isMyLesson = Boolean(currentUserId && currentUserId === coachId);

  const handleOrder = async () => {
    if (pending || ordered || isMyLesson) return;
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

      if (user.id === coachId) {
        alert('본인이 등록한 레슨입니다.');
        return;
      }

      const { error } = await supabase.from('fencing_lesson_orders').insert({
        lesson_id: lessonId,
        buyer_id: user.id,
        status: 'requested',
      });

      if (error) {
        if (error.code === '23505') {
          setOrdered(true);
          alert('이미 신청한 레슨입니다.');
          return;
        }

        console.error('Error creating lesson order:', error);
        alert('레슨 신청에 실패했습니다.');
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
