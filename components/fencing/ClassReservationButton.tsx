'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

type ClassReservationButtonProps = {
  classId: string;
  classTitle: string;
  initialReserved?: boolean;
  loginNext?: string;
  className?: string;
};

export function ClassReservationButton({
  classId,
  classTitle,
  initialReserved = false,
  loginNext = '/fencing?tab=classes',
  className,
}: ClassReservationButtonProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);
  const [reserved, setReserved] = useState(initialReserved);

  const handleReserve = async () => {
    if (pending || reserved) return;
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

      const { error } = await supabase.from('fencing_class_reservations').insert({
        class_id: classId,
        user_id: user.id,
        status: 'requested',
      });

      if (error) {
        if (error.code === '23505') {
          setReserved(true);
          alert('이미 예약 요청한 클래스입니다.');
          return;
        }

        console.error('Error creating class reservation:', error);
        alert('클래스 예약에 실패했습니다.');
        return;
      }

      setReserved(true);
      alert(`${classTitle} 예약 요청이 접수되었습니다.`);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleReserve}
      disabled={pending || reserved}
      className={className || 'bg-blue-600 hover:bg-blue-700 text-white'}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck2 className="h-4 w-4" />}
      <span>{reserved ? '예약 요청됨' : '클래스 예약'}</span>
    </Button>
  );
}
