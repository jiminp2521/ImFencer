'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck2, Loader2 } from 'lucide-react';
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
  loginNext = '/fencing/classes',
  className,
}: ClassReservationButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [reserved, setReserved] = useState(initialReserved);

  const handleReserve = async () => {
    if (pending || reserved) return;
    setPending(true);

    try {
      const response = await fetch(`/api/fencing/classes/${classId}/reservations`, { method: 'POST' });

      if (response.status === 401) {
        alert('로그인이 필요합니다.');
        router.push(`/login?next=${encodeURIComponent(loginNext)}`);
        return;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        console.error('Error creating class reservation:', body);
        alert('클래스 예약에 실패했습니다.');
        return;
      }

      const body = (await response.json()) as { duplicate?: boolean };
      if (body.duplicate) {
        setReserved(true);
        alert('이미 예약 요청한 클래스입니다.');
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
